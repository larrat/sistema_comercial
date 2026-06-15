import type { Cliente, Pedido, Produto, ContaReceber, Filial } from '../../../../types/domain';
import { hydratePedidosWithNormalizedItens } from '../../pedidos/services/pedidosApi';

export type DashboardApiContext = {
  url: string;
  key: string;
  token: string;
};

export type DashboardAggregates = {
  pedidos: Pedido[];
  pedidosAnteriores?: Pedido[];
  produtos: Produto[];
  clientes: Cliente[];
  contasReceber: ContaReceber[];
  filial?: Filial;
};

function createHeaders(key: string, token: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ensureOk(res: Response, body: unknown, fallback: string): void {
  if (res.ok) return;
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    throw new Error(body.message);
  }
  throw new Error(fallback);
}

export function buildDateRange(periodo: string): [string | null, string] {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (periodo === '7' || periodo === 'semana') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return [start.toISOString().slice(0, 10), today];
  }
  if (periodo === '30' || periodo === 'mes') {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return [start.toISOString().slice(0, 10), today];
  }
  if (periodo === '90') {
    const start = new Date(now);
    start.setDate(now.getDate() - 90);
    return [start.toISOString().slice(0, 10), today];
  }
  if (periodo === 'ano') {
    const start = new Date(now.getFullYear(), 0, 1);
    return [start.toISOString().slice(0, 10), today];
  }
  if (periodo.startsWith('custom:')) {
    const [, start, end] = periodo.split(':');
    return [start, end];
  }
  return [null, today];
}

export function buildPreviousDateRange(periodo: string): [string | null, string | null] {
  const now = new Date();

  if (periodo === '7' || periodo === 'semana') {
    const end = new Date(now);
    end.setDate(now.getDate() - 7); // end is start of current period
    const endStr = end.toISOString().slice(0, 10);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    return [start.toISOString().slice(0, 10), endStr];
  }
  if (periodo === '30' || periodo === 'mes') {
    const end = new Date(now);
    end.setDate(now.getDate() - 30);
    const endStr = end.toISOString().slice(0, 10);
    const start = new Date(end);
    start.setDate(end.getDate() - 30);
    return [start.toISOString().slice(0, 10), endStr];
  }
  if (periodo === '90') {
    const end = new Date(now);
    end.setDate(now.getDate() - 90);
    const endStr = end.toISOString().slice(0, 10);
    const start = new Date(end);
    start.setDate(end.getDate() - 90);
    return [start.toISOString().slice(0, 10), endStr];
  }
  if (periodo === 'ano') {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31);
    return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
  }
  if (periodo.startsWith('custom:')) {
    const [, startStr, endStr] = periodo.split(':');
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const prevEnd = new Date(start.getTime() - (1000 * 3600 * 24)); // minus 1 day
    const prevStart = new Date(prevEnd.getTime() - diffTime);
    return [prevStart.toISOString().slice(0, 10), prevEnd.toISOString().slice(0, 10)];
  }
  return [null, null];
}

export async function fetchDashboardData(
  ctx: DashboardApiContext,
  filialId: string,
  periodo: string
): Promise<DashboardAggregates> {
  const [startDate, endDate] = buildDateRange(periodo);
  const [prevStart, prevEnd] = buildPreviousDateRange(periodo);
  
  const headers = createHeaders(ctx.key, ctx.token);
  const commonParams = filialId === 'ALL' ? '' : `filial_id=eq.${encodeURIComponent(filialId)}`;

  const buildQuery = (params: string[]) => {
    const valid = params.filter(Boolean);
    return valid.length > 0 ? `?${valid.join('&')}` : '';
  };

  const dateFilter = startDate ? `data=gte.${startDate}&data=lte.${endDate}` : '';
  const prevDateFilter = prevStart ? `data=gte.${prevStart}&data=lte.${prevEnd}` : '';
  const crDateFilter = startDate ? `vencimento=gte.${startDate}` : ''; // Simplified for dashboard

  const [pedidosRaw, pedidosAnterioresRaw, produtos, clientes, contasReceber, filial] = await Promise.all([
    fetch(`${ctx.url}/rest/v1/pedidos${buildQuery([commonParams, dateFilter, 'select=id,status,total,itens,data', 'order=data.desc'])}`, {
      headers
    }).then(async (r) => {
      const body = await readJson(r);
      ensureOk(r, body, 'Erro ao carregar pedidos');
      return body as Pedido[];
    }),
    prevStart && prevEnd ? fetch(`${ctx.url}/rest/v1/pedidos${buildQuery([commonParams, prevDateFilter, 'select=id,status,total,itens,data', 'order=data.desc'])}`, {
      headers
    }).then(async (r) => {
      const body = await readJson(r);
      ensureOk(r, body, 'Erro ao carregar pedidos anteriores');
      return body as Pedido[];
    }) : Promise.resolve([]),
    fetch(`${ctx.url}/rest/v1/produtos${buildQuery([commonParams, 'select=id,nome,produto_pai_id,esal', 'order=nome.asc'])}`, { headers }).then(
      async (r) => {
        const body = await readJson(r);
        ensureOk(r, body, 'Erro ao carregar produtos');
        return body as Produto[];
      }
    ),
    fetch(`${ctx.url}/rest/v1/clientes${buildQuery([commonParams, 'select=id,whatsapp,email', 'order=nome.asc'])}`, {
      headers
    }).then(async (r) => {
      const body = await readJson(r);
      ensureOk(r, body, 'Erro ao carregar clientes');
      return body as Cliente[];
    }),
    fetch(`${ctx.url}/rest/v1/contas_receber${buildQuery([commonParams, crDateFilter, 'select=id,status,valor,vencimento', 'order=vencimento.asc'])}`, {
      headers
    }).then(async (r) => {
      const body = await readJson(r);
      ensureOk(r, body, 'Erro ao carregar contas');
      return body as ContaReceber[];
    }),
    filialId !== 'ALL' ? fetch(`${ctx.url}/rest/v1/filiais?id=eq.${encodeURIComponent(filialId)}&select=id,nome,cor,meta_mensal`, { headers }).then(
      async (r) => {
        const body = await readJson(r);
        ensureOk(r, body, 'Erro ao carregar filial');
        return (body as Filial[])[0] || null;
      }
    ) : Promise.resolve({ id: 'ALL', nome: 'Todas as Filiais', cor: '#163F80', meta_mensal: 0 }) as unknown as Filial
  ]);

  const pedidos = await hydratePedidosWithNormalizedItens({ ...ctx, filialId }, pedidosRaw);
  const pedidosAnteriores = await hydratePedidosWithNormalizedItens({ ...ctx, filialId }, pedidosAnterioresRaw as Pedido[]);

  return { pedidos, pedidosAnteriores, produtos, clientes, contasReceber, filial };
}
