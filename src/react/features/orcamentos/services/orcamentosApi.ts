import { getSupabaseConfig } from '../../../../app/supabaseConfig';

export type OrcamentoItem = {
  id?: string;
  orcamento_id?: string;
  ambiente: string;
  ordem_apresentacao: number;
  descricao_servico: string;
  unidade: string;
  quantidade: number;
  custo_material_unitario: number;
  custo_mao_obra_unitario: number;
};

export type OrcamentoCalculado = {
  orcamento_id: string;
  filial_id: string;
  bdi_percentual: number;
  custo_direto_total: number;
  custo_material_total: number;
  custo_mao_obra_total: number;
  preco_venda_final: number;
  margem_bruta_projetada: number;
};

export type OrcamentoObra = {
  id: string;
  filial_id: string;
  cliente_id?: string;
  cliente_nome?: string;
  titulo: string;
  descricao_escopo?: string;
  bdi_percentual: number;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado';
  data_validade?: string;
  criado_em: string;
  itens?: OrcamentoItem[];
  calculos?: OrcamentoCalculado;
  cliente?: { nome: string };
};

export const orcamentosApi = {
  async listOrcamentos(token: string, filialId: string): Promise<OrcamentoObra[]> {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(
      `${url}/rest/v1/orcamentos_obra?filial_id=eq.${filialId}&select=*,cliente:clientes(nome)&order=criado_em.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Erro ao listar orçamentos');
    const data = await res.json();

    // Fetch calculos
    const ids = data.map((d: any) => d.id).join(',');
    let calculosMap: Record<string, OrcamentoCalculado> = {};
    
    if (ids) {
      const calcRes = await fetch(
        `${url}/rest/v1/vw_orcamentos_calculados?orcamento_id=in.(${ids})`,
        { headers: { apikey: key, Authorization: `Bearer ${token}` } }
      );
      if (calcRes.ok) {
        const calcData = await calcRes.json();
        calcData.forEach((c: OrcamentoCalculado) => {
          calculosMap[c.orcamento_id] = c;
        });
      }
    }

    return data.map((d: any) => ({
      ...d,
      calculos: calculosMap[d.id]
    }));
  },

  async getOrcamento(token: string, id: string): Promise<OrcamentoObra> {
    const { url, key } = getSupabaseConfig();
    
    const res = await fetch(
      `${url}/rest/v1/orcamentos_obra?id=eq.${id}&select=*,cliente:clientes(nome)`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Erro ao buscar orçamento');
    const orcamentos = await res.json();
    if (orcamentos.length === 0) throw new Error('Orçamento não encontrado');
    const orcamento = orcamentos[0];

    const itensRes = await fetch(
      `${url}/rest/v1/orcamento_obra_itens?orcamento_id=eq.${id}&order=ordem_apresentacao.asc`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } }
    );
    orcamento.itens = itensRes.ok ? await itensRes.json() : [];

    const calcRes = await fetch(
      `${url}/rest/v1/vw_orcamentos_calculados?orcamento_id=eq.${id}`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } }
    );
    orcamento.calculos = calcRes.ok ? (await calcRes.json())[0] : null;

    return orcamento;
  },

  async saveOrcamento(
    token: string,
    filialId: string,
    orcamento: Partial<OrcamentoObra>,
    itens: OrcamentoItem[]
  ): Promise<OrcamentoObra> {
    const { url, key } = getSupabaseConfig();

    // 1. Salvar Cabeçalho
    const cabecalho = {
      ...orcamento,
      filial_id: filialId
    };
    delete cabecalho.itens;
    delete cabecalho.calculos;
    delete cabecalho.cliente;

    const method = cabecalho.id ? 'PATCH' : 'POST';
    const endpoint = cabecalho.id 
      ? `${url}/rest/v1/orcamentos_obra?id=eq.${cabecalho.id}`
      : `${url}/rest/v1/orcamentos_obra`;

    const res = await fetch(endpoint, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(cabecalho)
    });
    if (!res.ok) throw new Error('Erro ao salvar cabeçalho do orçamento');
    const savedOrcamento = (await res.json())[0] as OrcamentoObra;

    // 2. Salvar Itens
    // Se for edição, removemos os itens antigos e recriamos para simplificar
    if (cabecalho.id) {
      await fetch(`${url}/rest/v1/orcamento_obra_itens?orcamento_id=eq.${savedOrcamento.id}`, {
        method: 'DELETE',
        headers: { apikey: key, Authorization: `Bearer ${token}` }
      });
    }

    if (itens.length > 0) {
      const itemsToInsert = itens.map((i, idx) => ({
        orcamento_id: savedOrcamento.id,
        ambiente: i.ambiente || 'Geral',
        descricao_servico: i.descricao_servico,
        unidade: i.unidade,
        quantidade: i.quantidade,
        custo_material_unitario: i.custo_material_unitario,
        custo_mao_obra_unitario: i.custo_mao_obra_unitario,
        ordem_apresentacao: idx
      }));

      const resItens = await fetch(`${url}/rest/v1/orcamento_obra_itens`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(itemsToInsert)
      });
      if (!resItens.ok) throw new Error('Erro ao salvar itens do orçamento');
    }

    return savedOrcamento;
  }
};
