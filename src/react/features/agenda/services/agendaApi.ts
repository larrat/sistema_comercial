import type { AgendaEvento } from '../types';

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

export const agendaApi = {
  async getEventos(ctx: ApiContext, startDate: string, endDate: string): Promise<AgendaEvento[]> {
    const res = await fetch(
      `${ctx.url}/rest/v1/agenda_eventos?filial_id=eq.${ctx.filialId}&data_inicio=gte.${startDate}&data_inicio=lte.${endDate}&select=*`,
      { headers: headers(ctx) }
    );
    if (!res.ok) throw new Error('Erro ao buscar eventos da agenda');
    return res.json();
  },

  async createEvento(ctx: ApiContext, evento: Partial<AgendaEvento>): Promise<AgendaEvento> {
    const res = await fetch(`${ctx.url}/rest/v1/agenda_eventos`, {
      method: 'POST',
      headers: { ...headers(ctx), 'Prefer': 'return=representation' },
      body: JSON.stringify({ ...evento, filial_id: ctx.filialId })
    });
    if (!res.ok) throw new Error('Erro ao criar evento');
    const data = await res.json();
    return data[0];
  }
};
