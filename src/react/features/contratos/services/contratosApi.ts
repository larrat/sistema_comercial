import type { 
  Contrato, 
  ContratoDraft, 
  OrdemServico, 
  OrdemServicoDraft, 
  ContratoAditivo, 
  ContratoAditivoDraft, 
  ContratoCronograma, 
  ContratoCronogramaDraft, 
  DiarioObra, 
  DiarioObraDraft,
  ContratoArquivo,
  ContratoArquivoDraft
} from '../types';

type ApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

const headers = (ctx: ApiContext) => ({
  'Content-Type': 'application/json',
  apikey: ctx.key,
  Authorization: `Bearer ${ctx.token}`,
});

export const contratosApi = {
  async getContratos(ctx: ApiContext): Promise<Contrato[]> {
    const res = await fetch(`${ctx.url}/rest/v1/contratos?filial_id=eq.${ctx.filialId}&select=*,cliente:clientes(nome,doc)&order=criado_em.desc`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar contratos');
    return res.json();
  },

  async getContratoById(ctx: ApiContext, id: string): Promise<Contrato> {
    const res = await fetch(`${ctx.url}/rest/v1/contratos?id=eq.${id}&filial_id=eq.${ctx.filialId}&select=*,cliente:clientes(nome,doc)`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar contrato');
    const data = await res.json();
    return data[0];
  },

  async createContrato(ctx: ApiContext, draft: ContratoDraft): Promise<Contrato> {
    const res = await fetch(`${ctx.url}/rest/v1/contratos`, {
      method: 'POST',
      headers: { ...headers(ctx), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        ...draft,
        filial_id: ctx.filialId
      })
    });
    if (!res.ok) throw new Error('Erro ao criar contrato');
    const data = await res.json();
    return data[0];
  },

  async updateContratoStatus(ctx: ApiContext, id: string, status: Contrato['status']): Promise<void> {
    const res = await fetch(`${ctx.url}/rest/v1/contratos?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(ctx),
      body: JSON.stringify({ status, atualizado_em: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('Erro ao atualizar contrato');
  },

  // Ordens de Serviço
  async getOrdensServico(ctx: ApiContext, contratoId: string): Promise<OrdemServico[]> {
    const res = await fetch(`${ctx.url}/rest/v1/ordens_servico?contrato_id=eq.${contratoId}&filial_id=eq.${ctx.filialId}&order=criado_em.desc`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar ordens de serviço');
    return res.json();
  },

  async createOrdemServico(ctx: ApiContext, draft: OrdemServicoDraft): Promise<OrdemServico> {
    const res = await fetch(`${ctx.url}/rest/v1/ordens_servico`, {
      method: 'POST',
      headers: { ...headers(ctx), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        ...draft,
        filial_id: ctx.filialId
      })
    });
    if (!res.ok) throw new Error('Erro ao criar ordem de serviço');
    const data = await res.json();
    const os = data[0] as OrdemServico;

    // Sincronização com Agenda Global (Cenário B)
    if (os.data_agendada) {
      try {
        const dataInicio = new Date(os.data_agendada);
        const dataFim = new Date(dataInicio.getTime() + 2 * 60 * 60 * 1000); // +2h padrão

        await fetch(`${ctx.url}/rest/v1/agenda_eventos`, {
          method: 'POST',
          headers: headers(ctx),
          body: JSON.stringify({
            filial_id: ctx.filialId,
            titulo: os.is_garantia ? `[GARANTIA] O.S.: ${os.titulo}` : `O.S.: ${os.titulo}`,
            descricao: os.descricao || `Serviço agendado ${os.is_garantia ? 'sob regime de GARANTIA' : ''} ref. O.S. #${os.id}`,
            tipo: 'visita',
            data_inicio: dataInicio.toISOString(),
            data_fim: dataFim.toISOString(),
            dia_inteiro: false,
            participantes: [os.responsavel_id, os.terceirizado_id].filter(Boolean),
            criado_por: os.criado_por || null
          })
        });
      } catch (err) {
        // Silencia erro para não travar fluxo de O.S.
        console.warn('Erro ao sincronizar com agenda:', err);
      }
    }

    return os;
  },
  
  async updateOsStatus(ctx: ApiContext, id: string, status: OrdemServico['status']): Promise<void> {
    const res = await fetch(`${ctx.url}/rest/v1/ordens_servico?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(ctx),
      body: JSON.stringify({ status, atualizado_em: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('Erro ao atualizar OS');

    // Repasse Financeiro a Terceirizados (Cenário A)
    if (status === 'concluida') {
      try {
        const osRes = await fetch(`${ctx.url}/rest/v1/ordens_servico?id=eq.${id}&select=*`, {
          headers: headers(ctx)
        });
        if (osRes.ok) {
          const osData = await osRes.json();
          const os = osData[0] as OrdemServico | undefined;
          if (os && os.valor_parceiro && os.valor_parceiro > 0 && os.terceirizado_id) {
            let terceirizadoNome = `Prestador O.S. ${id.substring(0, 8)}`;
            
            // Buscar nome do parceiro
            const userRes = await fetch(
              `${ctx.url}/rest/v1/user_filiais?user_id=eq.${os.terceirizado_id}&filial_id=eq.${ctx.filialId}&select=user_nome`,
              { headers: headers(ctx) }
            );
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData?.[0]?.user_nome) {
                terceirizadoNome = userData[0].user_nome;
              }
            }

            // Criar Conta a Pagar
            await fetch(`${ctx.url}/rest/v1/contas_pagar`, {
              method: 'POST',
              headers: {
                ...headers(ctx),
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                id: `CP-OS-${id}`,
                filial_id: ctx.filialId,
                pedido_compra_id: null,
                fornecedor_nome: terceirizadoNome,
                valor: os.valor_parceiro,
                vencimento: new Date().toISOString().split('T')[0],
                status: 'pendente',
                categoria: 'Mão de Obra',
                obs: `Repasse automático ref. conclusão da O.S. "${os.titulo}"`
              })
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao gerar repasse para terceirizado:', err);
      }
    }
  },

  // Termos Aditivos (Change Orders)
  async getContratoAditivos(ctx: ApiContext, contratoId: string): Promise<ContratoAditivo[]> {
    const res = await fetch(`${ctx.url}/rest/v1/contrato_aditivos?contrato_id=eq.${contratoId}&filial_id=eq.${ctx.filialId}&order=criado_em.desc`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar aditivos do contrato');
    return res.json();
  },

  async createContratoAditivo(ctx: ApiContext, draft: ContratoAditivoDraft): Promise<ContratoAditivo> {
    const res = await fetch(`${ctx.url}/rest/v1/contrato_aditivos`, {
      method: 'POST',
      headers: { ...headers(ctx), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        ...draft,
        filial_id: ctx.filialId
      })
    });
    if (!res.ok) throw new Error('Erro ao criar aditivo de contrato');
    const data = await res.json();
    return data[0];
  },

  // Cronograma da Obra (Gantt)
  async getContratoCronograma(ctx: ApiContext, contratoId: string): Promise<ContratoCronograma[]> {
    const res = await fetch(`${ctx.url}/rest/v1/contrato_cronograma?contrato_id=eq.${contratoId}&filial_id=eq.${ctx.filialId}&order=data_inicio.asc`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar cronograma do contrato');
    return res.json();
  },

  async createContratoCronograma(ctx: ApiContext, draft: ContratoCronogramaDraft): Promise<ContratoCronograma> {
    const res = await fetch(`${ctx.url}/rest/v1/contrato_cronograma`, {
      method: 'POST',
      headers: { ...headers(ctx), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        ...draft,
        filial_id: ctx.filialId
      })
    });
    if (!res.ok) throw new Error('Erro ao criar marco no cronograma');
    const data = await res.json();
    return data[0];
  },

  async updateCronogramaProgresso(ctx: ApiContext, id: string, percentualConclusao: number): Promise<void> {
    const res = await fetch(`${ctx.url}/rest/v1/contrato_cronograma?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(ctx),
      body: JSON.stringify({ percentual_conclusao: percentualConclusao })
    });
    if (!res.ok) throw new Error('Erro ao atualizar progresso do cronograma');
  },

  // Diário de Obra (RDO)
  async getDiarioObra(ctx: ApiContext, contratoId: string): Promise<DiarioObra[]> {
    const res = await fetch(`${ctx.url}/rest/v1/diario_obra?contrato_id=eq.${contratoId}&filial_id=eq.${ctx.filialId}&order=criado_em.desc`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar diário de obra');
    return res.json();
  },

  async createDiarioObra(ctx: ApiContext, draft: DiarioObraDraft): Promise<DiarioObra> {
    const res = await fetch(`${ctx.url}/rest/v1/diario_obra`, {
      method: 'POST',
      headers: { ...headers(ctx), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        ...draft,
        filial_id: ctx.filialId
      })
    });
    if (!res.ok) throw new Error('Erro ao criar diário de obra');
    const data = await res.json();
    return data[0];
  },

  // Documentos e Anexos
  async getContratoArquivos(ctx: ApiContext, contratoId: string): Promise<ContratoArquivo[]> {
    const res = await fetch(`${ctx.url}/rest/v1/contrato_arquivos?contrato_id=eq.${contratoId}&filial_id=eq.${ctx.filialId}&order=criado_em.desc`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar arquivos do contrato');
    return res.json();
  },

  async createContratoArquivo(ctx: ApiContext, draft: ContratoArquivoDraft): Promise<ContratoArquivo> {
    const res = await fetch(`${ctx.url}/rest/v1/contrato_arquivos`, {
      method: 'POST',
      headers: { ...headers(ctx), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        ...draft,
        filial_id: ctx.filialId
      })
    });
    if (!res.ok) throw new Error('Erro ao criar registro do arquivo');
    const data = await res.json();
    return data[0];
  },

  async uploadArquivoStorage(ctx: ApiContext, file: File, nomePath: string): Promise<string> {
    // Retorna a URL publica após o upload. 
    const res = await fetch(`${ctx.url}/storage/v1/object/documentos_obras/${nomePath}`, {
      method: 'POST',
      headers: {
        apikey: ctx.key,
        Authorization: `Bearer ${ctx.token}`,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Erro no upload do arquivo');
    }

    return `${ctx.url}/storage/v1/object/public/documentos_obras/${nomePath}`;
  },

  async getFilialUsers(ctx: ApiContext): Promise<Array<{ user_id: string, user_nome: string, user_email: string }>> {
    const res = await fetch(`${ctx.url}/rest/v1/user_filiais?filial_id=eq.${ctx.filialId}&select=user_id,user_nome,user_email&order=user_nome.asc`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar usuários da filial');
    return res.json();
  },

  async getContratoContasReceber(ctx: ApiContext, contratoId: string): Promise<any[]> {
    const res = await fetch(`${ctx.url}/rest/v1/contas_receber?contrato_id=eq.${contratoId}&filial_id=eq.${ctx.filialId}`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar faturamento do contrato');
    return res.json();
  },

  async faturarMarcoCronograma(
    ctx: ApiContext,
    params: {
      contratoId: string;
      cronogramaId: string;
      clienteId: string;
      clienteNome: string;
      valor: number;
      tituloFase: string;
    }
  ): Promise<void> {
    const id = `CR-${params.cronogramaId.substring(0, 8)}-${Date.now().toString().substring(8)}`;
    
    const vencimentoDate = new Date();
    vencimentoDate.setDate(vencimentoDate.getDate() + 15);
    const vencimento = vencimentoDate.toISOString().split('T')[0];

    const body = {
      id,
      filial_id: ctx.filialId,
      contrato_id: params.contratoId,
      cronograma_id: params.cronogramaId,
      cliente_id: params.clienteId || null,
      cliente: params.clienteNome,
      valor: params.valor,
      vencimento,
      status: 'pendente',
      obs: `Faturamento automático da fase "${params.tituloFase}" da obra.`
    };

    const res = await fetch(`${ctx.url}/rest/v1/contas_receber`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ctx.key,
        Authorization: `Bearer ${ctx.token}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error('Erro ao faturar marco físico do cronograma');

    // Régua de Notificação de Faturamento (Cenário C)
    if (params.clienteId) {
      try {
        const cliRes = await fetch(`${ctx.url}/rest/v1/clientes?id=eq.${params.clienteId}&select=tel,whatsapp,email`, {
          headers: { apikey: ctx.key, Authorization: `Bearer ${ctx.token}` }
        });
        if (cliRes.ok) {
          const cliData = await cliRes.json();
          const cliente = cliData?.[0];
          if (cliente) {
            const destino = cliente.whatsapp || cliente.tel || cliente.email || 'N/A';
            const valorFmt = params.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            const vencParts = vencimento.split('-');
            const vencFmt = vencParts.length === 3 ? `${vencParts[2]}/${vencParts[1]}/${vencParts[0]}` : vencimento;

            const mensagem = `Olá, ${params.clienteNome}! A fase "${params.tituloFase}" do seu projeto foi concluída e faturada. Geramos o recebível de ${valorFmt} com vencimento para ${vencFmt}.`;

            await fetch(`${ctx.url}/rest/v1/campanha_envios`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: ctx.key,
                Authorization: `Bearer ${ctx.token}`
              },
              body: JSON.stringify({
                filial_id: ctx.filialId,
                campanha_id: null,
                cliente_id: params.clienteId,
                canal: 'whatsapp',
                destino,
                mensagem,
                status: 'pendente'
              })
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao enfileirar notificação de faturamento:', err);
      }
    }
  }
};
