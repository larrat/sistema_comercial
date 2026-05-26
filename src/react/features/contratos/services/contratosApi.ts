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
  DiarioObraDraft 
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
    return data[0];
  },
  
  async updateOsStatus(ctx: ApiContext, id: string, status: OrdemServico['status']): Promise<void> {
    const res = await fetch(`${ctx.url}/rest/v1/ordens_servico?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(ctx),
      body: JSON.stringify({ status, atualizado_em: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('Erro ao atualizar OS');
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

  async getFilialUsers(ctx: ApiContext): Promise<Array<{ user_id: string, user_nome: string, user_email: string }>> {
    const res = await fetch(`${ctx.url}/rest/v1/user_filiais?filial_id=eq.${ctx.filialId}&select=user_id,user_nome,user_email&order=user_nome.asc`, {
      headers: headers(ctx)
    });
    if (!res.ok) throw new Error('Erro ao buscar usuários da filial');
    return res.json();
  }
};
