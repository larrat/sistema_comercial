import type { Cliente, Pedido, Produto } from '../../../../types/domain';

export type DashboardApiContext = {
  url: string;
  key: string;
  token: string;
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

export async function fetchDashboardPedidos(
  ctx: DashboardApiContext,
  filialId: string
): Promise<Pedido[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(filialId)}&order=data.desc`,
    { headers: createHeaders(ctx.key, ctx.token), signal: AbortSignal.timeout(15000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar pedidos`);
  return Array.isArray(body) ? (body as Pedido[]) : [];
}

export async function fetchDashboardProdutos(
  ctx: DashboardApiContext,
  filialId: string
): Promise<Produto[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(filialId)}&order=nome.asc`,
    { headers: createHeaders(ctx.key, ctx.token), signal: AbortSignal.timeout(15000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar produtos`);
  return Array.isArray(body) ? (body as Produto[]) : [];
}

export async function fetchDashboardClientes(
  ctx: DashboardApiContext,
  filialId: string
): Promise<Cliente[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(filialId)}&order=nome.asc`,
    { headers: createHeaders(ctx.key, ctx.token), signal: AbortSignal.timeout(15000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar clientes`);
  return Array.isArray(body) ? (body as Cliente[]) : [];
}
