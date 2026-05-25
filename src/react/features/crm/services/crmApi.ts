import type { CrmOportunidade, CrmOportunidadeDraft, CrmEstagio } from '../types';

export type CrmApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

export const crmApi = {
  getOportunidades: async (ctx: CrmApiContext): Promise<CrmOportunidade[]> => {
    if (!ctx.filialId) return [];

    const res = await fetch(
      `${ctx.url}/rest/v1/crm_oportunidades?filial_id=eq.${encodeURIComponent(ctx.filialId)}&order=criado_em.desc`,
      {
        headers: {
          apikey: ctx.key,
          Authorization: `Bearer ${ctx.token}`,
        },
      }
    );

    if (!res.ok) throw new Error('Erro ao buscar oportunidades');
    return res.json();
  },

  createOportunidade: async (
    ctx: CrmApiContext,
    draft: CrmOportunidadeDraft
  ): Promise<CrmOportunidade> => {
    const res = await fetch(`${ctx.url}/rest/v1/crm_oportunidades`, {
      method: 'POST',
      headers: {
        apikey: ctx.key,
        Authorization: `Bearer ${ctx.token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        ...draft,
        filial_id: ctx.filialId,
        estagio: 'novo',
      }),
    });

    if (!res.ok) throw new Error('Erro ao criar oportunidade');
    const data = await res.json();
    return data[0];
  },

  updateEstagio: async (
    ctx: CrmApiContext,
    id: string,
    estagio: CrmEstagio
  ): Promise<void> => {
    const res = await fetch(
      `${ctx.url}/rest/v1/crm_oportunidades?id=eq.${id}&filial_id=eq.${ctx.filialId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: ctx.key,
          Authorization: `Bearer ${ctx.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estagio, atualizado_em: new Date().toISOString() }),
      }
    );

    if (!res.ok) throw new Error('Erro ao atualizar estágio');
    
    // Log history
    await fetch(`${ctx.url}/rest/v1/crm_oportunidade_historico`, {
      method: 'POST',
      headers: {
        apikey: ctx.key,
        Authorization: `Bearer ${ctx.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oportunidade_id: id,
        filial_id: ctx.filialId,
        tipo: 'mudanca_estagio',
        conteudo: `Oportunidade movida para o estágio: ${estagio}`,
      }),
    });
  },
};
