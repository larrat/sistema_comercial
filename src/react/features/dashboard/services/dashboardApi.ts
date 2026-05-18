import type { Cliente, Pedido, Produto, ContaReceber, Filial } from '../../../../types/domain';
import { hydratePedidosWithNormalizedItens } from '../../pedidos/services/pedidosApi';

export type DashboardApiContext = {
  url: string;
  key: string;
  token: string;
};

export type DashboardAggregates = {
  pedidos: Pedido[];
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

  if (periodo === 'semana') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return [start.toISOString().slice(0, 10), today];
  }
  if (periodo === 'mes') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [start.toISOString().slice(0, 10), today];
  }
  if (periodo === 'ano') {
    const start = new Date(now.getFullYear(), 0, 1);
    return [start.toISOString().slice(0, 10), today];
  }
  return [null, today];
}

export async function fetchDashboardData(
  ctx: DashboardApiContext,
  filialId: string,
  periodo: string
): Promise<DashboardAggregates> {
  const [startDate, endDate] = buildDateRange(periodo);
  const headers = createHeaders(ctx.key, ctx.token);
  const commonParams = `filial_id=eq.${encodeURIComponent(filialId)}`;

  const dateFilter = startDate ? `&data=gte.${startDate}&data=lte.${endDate}` : '';
  const crDateFilter = startDate ? `&vencimento=gte.${startDate}` : ''; // Simplified for dashboard

  const [pedidosRaw, produtos, clientes, contasReceber, filial] = await Promise.all([
    fetch(`${ctx.url}/rest/v1/pedidos?${commonParams}${dateFilter}&select=id,status,total,itens,data&order=data.desc`, {
      headers
    }).then(async (r) => {
      const body = await readJson(r);
      ensureOk(r, body, 'Erro ao carregar pedidos');
      return body as Pedido[];
    }),
    fetch(`${ctx.url}/rest/v1/produtos?${commonParams}&select=id,nome,produto_pai_id,esal&order=nome.asc`, { headers }).then(
      async (r) => {
        const body = await readJson(r);
        ensureOk(r, body, 'Erro ao carregar produtos');
        return body as Produto[];
      }
    ),
    fetch(`${ctx.url}/rest/v1/clientes?${commonParams}&select=id,whatsapp,email&order=nome.asc`, {
      headers
    }).then(async (r) => {
      const body = await readJson(r);
      ensureOk(r, body, 'Erro ao carregar clientes');
      return body as Cliente[];
    }),
    fetch(`${ctx.url}/rest/v1/contas_receber?${commonParams}${crDateFilter}&select=id,valor_em_aberto`, {
      headers
    }).then(async (r) => {
      const body = await readJson(r);
      ensureOk(r, body, 'Erro ao carregar contas a receber');
      return body as ContaReceber[];
    }),
    fetch(`${ctx.url}/rest/v1/filiais?id=eq.${encodeURIComponent(filialId)}&select=id,nome`, {
      headers: { ...headers, Prefer: 'plurality=singular' }
    }).then(async (r) => {
      const body = await readJson(r);
      ensureOk(r, body, 'Erro ao carregar filial');
      return body as Filial;
    })
  ]);

  const pedidos = await hydratePedidosWithNormalizedItens({ ...ctx, filialId }, pedidosRaw);

  return { pedidos, produtos, clientes, contasReceber, filial };
}
