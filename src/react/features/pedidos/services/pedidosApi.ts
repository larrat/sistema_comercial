import type { Pedido, PedidoItem } from '../../../../types/domain';
import { TAB_STATUSES, normalizePedStatus, type PedidoSummary, type PedidoTab } from '../types';
import { normalizePedido } from '../utils/normalizePedido';

export type PedidoSaveInput = {
  id: string;
  filial_id: string;
  num: number;
  cli: string;
  cliente_id: string | null;
  rca_id: string | null;
  rca_nome: string | null;
  data: string;
  status: string;
  pgto: string;
  prazo: string;
  tipo: string;
  obs: string;
  itens: PedidoItem[];
  total: number;
  origem_venda?: string | null;
  pgto_meta?: Record<string, unknown> | null;
  venda_fechada?: boolean;
  venda_fechada_em?: string | null;
  venda_fechada_por?: string | null;
};

export type PedidoApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

export type PedidoListFilters = {
  q?: string;
  status?: string;
  pgto?: string;
  periodo?: string;
  sort?: 'data_desc' | 'data_asc';
  tab?: PedidoTab;
};

export type PedidoListPageQuery = PedidoListFilters & {
  page?: number;
  pageSize?: number;
};

export type PedidoListPageResult = {
  rows: Pedido[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
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

function parseTotalFromContentRange(contentRange: string | null): number {
  if (!contentRange) return 0;
  const [, totalPart] = contentRange.split('/');
  const total = Number(totalPart);
  return Number.isFinite(total) ? total : 0;
}

function buildPeriodoDate(periodo: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (periodo === 'hoje') return today.toISOString().slice(0, 10);
  if (periodo === 'semana') {
    const limit = new Date(today);
    limit.setDate(today.getDate() - 7);
    return limit.toISOString().slice(0, 10);
  }
  if (periodo === 'mes') {
    const limit = new Date(today);
    limit.setDate(today.getDate() - 30);
    return limit.toISOString().slice(0, 10);
  }
  return null;
}

function createPedidoQueryParams(
  filialId: string,
  filters: PedidoListFilters,
  options?: { page?: number; pageSize?: number }
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${filialId}`);
  params.set('order', filters.sort === 'data_asc' ? 'data.asc,num.asc' : 'data.desc,num.desc');

  const tabStatus = filters.tab ? TAB_STATUSES[filters.tab] : [];
  const status = normalizePedStatus(filters.status);
  if (status && filters.tab === 'emaberto') {
    params.set('status', `eq.${status}`);
  } else if (tabStatus.length === 1) {
    params.set('status', `eq.${tabStatus[0]}`);
  } else if (tabStatus.length > 1) {
    params.set('status', `in.(${tabStatus.join(',')})`);
  }

  const pgto = String(filters.pgto || '').trim();
  if (pgto) params.set('pgto', `eq.${pgto}`);

  const periodo = String(filters.periodo || '').trim();
  if (periodo === 'hoje') {
    const today = buildPeriodoDate(periodo);
    if (today) params.set('data', `eq.${today}`);
  } else if (periodo) {
    const startDate = buildPeriodoDate(periodo);
    if (startDate) params.set('data', `gte.${startDate}`);
  }

  const q = String(filters.q || '').trim();
  if (q) {
    const clean = q.replace(/\*/g, '').replace(/,/g, ' ').trim();
    const pattern = `*${clean}*`;
    const conditions = [`cli.ilike.${pattern}`];
    if (/^\d+$/.test(clean)) conditions.push(`num.eq.${clean}`);
    params.set('or', `(${conditions.join(',')})`);
  }

  if (options?.page && options?.pageSize) {
    params.set('limit', String(options.pageSize));
    params.set('offset', String((options.page - 1) * options.pageSize));
  }

  return params;
}

export function buildListPedidosPageUrl(
  url: string,
  filialId: string,
  query: PedidoListPageQuery
): string {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const params = createPedidoQueryParams(filialId, query, { page, pageSize });
  return `${url}/rest/v1/pedidos?${params.toString()}`;
}

export function buildListPedidosSummaryUrl(url: string, filialId: string): string {
  return `${url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(filialId)}&select=status,total`;
}

export function buildGetUltimoPedidoNumeroUrl(url: string, filialId: string): string {
  return `${url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(filialId)}&select=num&order=num.desc&limit=1`;
}

export function buildGetPedidoByIdUrl(url: string, filialId: string, pedidoId: string): string {
  return `${url}/rest/v1/pedidos?id=eq.${encodeURIComponent(pedidoId)}&filial_id=eq.${encodeURIComponent(filialId)}&limit=1`;
}

export async function listPedidos(context: PedidoApiContext): Promise<Pedido[]> {
  const res = await fetch(
    `${context.url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(context.filialId)}&order=num.desc`,
    {
      headers: createHeaders(context.key, context.token),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar pedidos`);
  return Array.isArray(body) ? (body as Pedido[]).map(normalizePedido) : [];
}

export async function getPedidoById(
  context: PedidoApiContext,
  pedidoId: string
): Promise<Pedido | null> {
  const res = await fetch(buildGetPedidoByIdUrl(context.url, context.filialId, pedidoId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar pedido`);
  const rows = Array.isArray(body) ? (body as Pedido[]) : [];
  return rows[0] ? normalizePedido(rows[0]) : null;
}

export async function listPedidosPage(
  context: PedidoApiContext,
  query: PedidoListPageQuery = {}
): Promise<PedidoListPageResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const res = await fetch(buildListPedidosPageUrl(context.url, context.filialId, query), {
    headers: {
      ...createHeaders(context.key, context.token),
      Prefer: 'count=exact'
    },
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar pedidos`);
  const rows = Array.isArray(body) ? (body as Pedido[]).map(normalizePedido) : [];
  const total = parseTotalFromContentRange(res.headers.get('content-range'));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { rows, page, pageSize, total, pageCount };
}

export async function listPedidosSummary(context: PedidoApiContext): Promise<PedidoSummary> {
  const res = await fetch(buildListPedidosSummaryUrl(context.url, context.filialId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar resumo de pedidos`);
  const rows = Array.isArray(body) ? (body as Array<Pick<Pedido, 'status' | 'total'>>) : [];
  const summary: PedidoSummary = {
    total: rows.length,
    emAbertoCount: 0,
    valorEmAberto: 0,
    entreguesCount: 0,
    canceladosCount: 0
  };

  for (const row of rows) {
    const status = normalizePedStatus(row.status);
    if (TAB_STATUSES.emaberto.includes(status)) {
      summary.emAbertoCount += 1;
      summary.valorEmAberto += row.total ?? 0;
      continue;
    }
    if (TAB_STATUSES.entregues.includes(status)) {
      summary.entreguesCount += 1;
      continue;
    }
    if (TAB_STATUSES.cancelados.includes(status)) {
      summary.canceladosCount += 1;
    }
  }

  return summary;
}

export async function getNextPedidoNumber(context: PedidoApiContext): Promise<number> {
  const res = await fetch(buildGetUltimoPedidoNumeroUrl(context.url, context.filialId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao calcular proximo pedido`);
  const rows = Array.isArray(body) ? (body as Array<{ num?: number | null }>) : [];
  const ultimo = rows[0]?.num;
  return Number.isFinite(ultimo) ? Number(ultimo) + 1 : 1;
}

export async function savePedido(context: PedidoApiContext, input: PedidoSaveInput): Promise<void> {
  const payload = { ...input, itens: JSON.stringify(input.itens) };
  const res = await fetch(`${context.url}/rest/v1/pedidos`, {
    method: 'POST',
    headers: {
      ...createHeaders(context.key, context.token),
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar pedido`);
}

export async function updatePedidoStatus(
  context: PedidoApiContext,
  pedidoId: string,
  newStatus: string
): Promise<void> {
  const res = await fetch(
    `${context.url}/rest/v1/pedidos?id=eq.${encodeURIComponent(pedidoId)}&filial_id=eq.${encodeURIComponent(context.filialId)}`,
    {
      method: 'PATCH',
      headers: createHeaders(context.key, context.token),
      body: JSON.stringify({ status: newStatus }),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao atualizar status do pedido`);
}
