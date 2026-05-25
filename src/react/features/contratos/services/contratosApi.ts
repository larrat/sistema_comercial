import type { Contrato, ContratoDraft, OrdemServico, OrdemServicoDraft, Servico } from '../types';

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
  }
};
