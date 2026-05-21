import type { Pedido, PedidoItem } from '../../../../types/domain';
import { TAB_STATUSES, normalizePedStatus, type PedidoSummary, type PedidoTab } from '../types';
import { normalizePedido } from '../utils/normalizePedido';
import { logAudit } from '../../../shared/services/auditService';

declare global {
  interface Window {
    __SC_PEDIDO_ITENS_DUAL_WRITE__?: boolean;
  }
}

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

type PedidoItemRow = {
  id?: string | null;
  pedido_id?: string | null;
  produto_id?: string | null;
  linha?: number | string | null;
  nome?: string | null;
  un?: string | null;
  qty?: number | string | null;
  preco?: number | string | null;
  custo?: number | string | null;
  custo_base?: number | string | null;
  preco_base?: number | string | null;
  orig?: string | null;
  item?: Partial<PedidoItem> | null;
};

type PedidoItemUpsertRow = {
  id: string;
  filial_id: string;
  pedido_id: string;
  produto_id: string | null;
  linha: number;
  nome: string;
  un: string;
  qty: number;
  preco: number;
  custo: number;
  custo_base?: number | null;
  preco_base?: number | null;
  orig: string | null;
  item: PedidoItem;
};

function toNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function isPedidoItensDualWriteEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.__SC_PEDIDO_ITENS_DUAL_WRITE__ === 'boolean') {
    return window.__SC_PEDIDO_ITENS_DUAL_WRITE__;
  }

  const hostname = window.location?.hostname?.toLowerCase() ?? '';
  return /\b(homolog|homologacao|staging|preview)\b/.test(hostname);
}

function buildPedidoItensUrl(url: string, filialId: string, pedidoIds: string[]): string {
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${filialId}`);
  params.set(
    'pedido_id',
    `in.(${pedidoIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',')})`
  );
  params.set(
    'select',
    'id,pedido_id,produto_id,nome,un,qty,preco,custo,custo_base,preco_base,orig,item,linha'
  );
  params.set('order', 'pedido_id.asc,linha.asc');
  return `${url}/rest/v1/pedido_itens?${params.toString()}`;
}

function buildPedidoItensWriteUrl(url: string): string {
  return `${url}/rest/v1/pedido_itens`;
}

function mapPedidoItemRow(row: PedidoItemRow): PedidoItem {
  const item = row.item && typeof row.item === 'object' ? row.item : {};
  const prodId = row.produto_id ?? item.prodId ?? '';

  return {
    item_id: row.id ?? item.item_id,
    linha: row.linha !== null && row.linha !== undefined ? toNumber(row.linha) : item.linha,
    prodId,
    nome: row.nome ?? item.nome ?? '',
    un: row.un ?? item.un ?? 'un',
    qty: toNumber(row.qty ?? item.qty),
    preco: toNumber(row.preco ?? item.preco),
    custo: toNumber(row.custo ?? item.custo),
    custo_base:
      row.custo_base !== null && row.custo_base !== undefined
        ? toNumber(row.custo_base)
        : item.custo_base,
    preco_base:
      row.preco_base !== null && row.preco_base !== undefined
        ? toNumber(row.preco_base)
        : item.preco_base,
    orig: row.orig ?? item.orig ?? 'pedido_itens'
  };
}

function buildPedidoItemUpsertRows(input: PedidoSaveInput): PedidoItemUpsertRow[] {
  return input.itens.map((item, index) => ({
    id: `${input.id}:${index + 1}`,
    filial_id: input.filial_id,
    pedido_id: input.id,
    produto_id: item.prodId || null,
    linha: index + 1,
    nome: item.nome || '',
    un: item.un || 'un',
    qty: toNumber(item.qty),
    preco: toNumber(item.preco),
    custo: toNumber(item.custo),
    custo_base: item.custo_base ?? null,
    preco_base: item.preco_base ?? null,
    orig: item.orig || null,
    item
  }));
}

async function upsertPedidoItensNormalizados(
  context: PedidoApiContext,
  input: PedidoSaveInput
): Promise<void> {
  const rows = buildPedidoItemUpsertRows(input);
  if (!rows.length) return;

  const res = await fetch(buildPedidoItensWriteUrl(context.url), {
    method: 'POST',
    headers: {
      ...createHeaders(context.key, context.token),
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao gravar itens normalizados do pedido`);
}

async function listPedidoItensByPedidoIds(
  context: PedidoApiContext,
  pedidoIds: string[]
): Promise<Record<string, PedidoItem[]>> {
  const uniqueIds = Array.from(new Set(pedidoIds.filter(Boolean)));
  const itensByPedido: Record<string, PedidoItem[]> = {};
  if (!uniqueIds.length) return itensByPedido;

  const chunks: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += 100) {
    chunks.push(uniqueIds.slice(index, index + 100));
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch(buildPedidoItensUrl(context.url, context.filialId, chunk), {
        headers: createHeaders(context.key, context.token),
        signal: AbortSignal.timeout(12000)
      });
      const body = await readJson(res);
      if (!res.ok || !Array.isArray(body)) continue;

      for (const row of body as PedidoItemRow[]) {
        if (!row.pedido_id) continue;
        itensByPedido[row.pedido_id] = itensByPedido[row.pedido_id] ?? [];
        itensByPedido[row.pedido_id].push(mapPedidoItemRow(row));
      }
    } catch {
      // Fase 4: a tabela normalizada pode ainda nao existir em todos os ambientes.
      // Nesses casos, a tela continua usando o agregado legado pedidos.itens.
      continue;
    }
  }

  return itensByPedido;
}

export async function hydratePedidosWithNormalizedItens(
  context: PedidoApiContext,
  pedidos: Pedido[]
): Promise<Pedido[]> {
  const normalized = pedidos.map(normalizePedido);
  const itensByPedido = await listPedidoItensByPedidoIds(
    context,
    normalized.map((pedido) => pedido.id)
  );

  return normalized.map((pedido) => {
    const normalizedItens = itensByPedido[pedido.id];
    return normalizedItens?.length ? { ...pedido, itens: normalizedItens } : pedido;
  });
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
  return Array.isArray(body) ? hydratePedidosWithNormalizedItens(context, body as Pedido[]) : [];
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
  const hydrated = await hydratePedidosWithNormalizedItens(context, rows);
  return hydrated[0] ?? null;
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
  const rows = Array.isArray(body)
    ? await hydratePedidosWithNormalizedItens(context, body as Pedido[])
    : [];
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
  try {
    const res = await fetch(`${context.url}/rest/v1/rpc/next_pedido_num`, {
      method: 'POST',
      headers: createHeaders(context.key, context.token),
      body: JSON.stringify({ p_filial_id: context.filialId }),
      signal: AbortSignal.timeout(12000)
    });
    const body = await readJson(res);
    ensureOk(res, body, `Erro ${res.status} ao calcular proximo pedido`);
    const next = Number(body);
    if (Number.isFinite(next) && next > 0) return next;
  } catch (error) {
    console.warn('[pedidos] next_pedido_num indisponivel; usando fallback legado.', error);
  }

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

export async function savePedido(
  context: PedidoApiContext,
  input: PedidoSaveInput
): Promise<Pedido> {
  let num = input.num;
  if (num === undefined || num === null || num === '' || Number.isNaN(Number(num)) || Number(num) <= 0) {
    num = await getNextPedidoNumber(context);
  } else {
    num = Number(num);
  }

  // Agregado legado mantido ate o dual-write do PDV na Fase 5.
  // Leituras novas preferem pedido_itens quando a tabela ja existe e tem dados.
  const payload = { ...input, num, itens: JSON.stringify(input.itens) };
  const res = await fetch(`${context.url}/rest/v1/pedidos`, {
    method: 'POST',
    headers: {
      ...createHeaders(context.key, context.token),
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar pedido`);

  const saved = (Array.isArray(body) ? body[0] : body) as Pedido;

  if (input.origem_venda === 'pdv' && isPedidoItensDualWriteEnabled()) {
    try {
      await upsertPedidoItensNormalizados(context, input);
    } catch (error) {
      console.warn('[pedidos] dual-write do PDV falhou; a venda segue gravada no agregado.', error);
    }
  }

  logAudit(context.token, 'pedidos', saved.id, input.id ? 'UPDATE' : 'INSERT', saved);

  return saved;
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
  
  logAudit(context.token, 'pedidos', pedidoId, 'UPDATE', { status: newStatus });
}

export async function marcarPedidoEntregue(
  context: PedidoApiContext,
  pedidoId: string
): Promise<Pedido> {
  const res = await fetch(`${context.url}/rest/v1/rpc/pedido_marcar_entregue`, {
    method: 'POST',
    headers: createHeaders(context.key, context.token),
    body: JSON.stringify({ p_pedido_id: pedidoId }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao confirmar entrega`);
  logAudit(context.token, 'pedidos', pedidoId, 'UPDATE', { acao: 'marcar_entregue' });
  return normalizePedido(body as Pedido);
}

export async function atualizarPedidoItem(
  context: PedidoApiContext,
  pedidoId: string,
  itemId: string,
  patch: { quantidade?: number; precoUnitario?: number }
): Promise<Pedido> {
  const res = await fetch(`${context.url}/rest/v1/rpc/pedido_item_atualizar`, {
    method: 'POST',
    headers: createHeaders(context.key, context.token),
    body: JSON.stringify({
      p_pedido_id: pedidoId,
      p_item_id: itemId,
      p_quantidade: patch.quantidade ?? null,
      p_preco_unitario: patch.precoUnitario ?? null
    }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao atualizar item do pedido`);
  return normalizePedido(body as Pedido);
}

export async function removerPedidoItem(
  context: PedidoApiContext,
  pedidoId: string,
  itemId: string
): Promise<Pedido> {
  const res = await fetch(`${context.url}/rest/v1/rpc/pedido_item_remover`, {
    method: 'POST',
    headers: createHeaders(context.key, context.token),
    body: JSON.stringify({ p_pedido_id: pedidoId, p_item_id: itemId }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao remover item do pedido`);
  return normalizePedido(body as Pedido);
}

export async function adicionarPedidoItem(
  context: PedidoApiContext,
  pedidoId: string,
  item: Pick<PedidoItem, 'prodId' | 'qty' | 'preco'>
): Promise<Pedido> {
  const res = await fetch(`${context.url}/rest/v1/rpc/pedido_item_adicionar`, {
    method: 'POST',
    headers: createHeaders(context.key, context.token),
    body: JSON.stringify({
      p_pedido_id: pedidoId,
      p_produto_id: item.prodId,
      p_quantidade: item.qty,
      p_preco_unitario: item.preco
    }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao adicionar item ao pedido`);
  return normalizePedido(body as Pedido);
}
