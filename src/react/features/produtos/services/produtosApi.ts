import type { MovimentoEstoque, Produto } from '../../../../types/domain';
import type { ProdutoWriteInput } from '../types';

export type ProdutoApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};
export type ProdutoListFilters = {
  q?: string;
  cat?: string;
};
export type ProdutoListPageQuery = ProdutoListFilters & {
  page?: number;
  pageSize?: number;
};
export type ProdutoListPageResult = {
  rows: Produto[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

function createHeaders(key: string, token: string, prefer?: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {})
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

export async function listProdutos(context: ProdutoApiContext): Promise<Produto[]> {
  const url = `${context.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(context.filialId)}&order=nome`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar produtos`);
  return Array.isArray(body) ? (body as Produto[]) : [];
}

function createProdutoQueryParams(
  filialId: string,
  filters: ProdutoListFilters,
  options?: { page?: number; pageSize?: number }
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${filialId}`);
  params.set('order', 'nome');
  const conditions: string[] = ['produto_pai_id.is.null'];

  const cat = String(filters.cat || '').trim();
  if (cat) {
    conditions.push(`cat.eq.${cat}`);
  }

  const q = String(filters.q || '').trim();
  if (q) {
    const pattern = `*${q.replace(/\*/g, '').replace(/,/g, ' ')}*`;
    conditions.push(`or(nome.ilike.${pattern},sku.ilike.${pattern},cat.ilike.${pattern})`);
  }

  if (conditions.length) {
    params.set('and', `(${conditions.join(',')})`);
  }

  if (options?.page && options?.pageSize) {
    params.set('limit', String(options.pageSize));
    params.set('offset', String((options.page - 1) * options.pageSize));
  }

  return params;
}

function parseTotalFromContentRange(contentRange: string | null): number {
  if (!contentRange) return 0;
  const [, totalPart] = contentRange.split('/');
  const total = Number(totalPart);
  return Number.isFinite(total) ? total : 0;
}

export function buildListProdutosPageUrl(
  url: string,
  filialId: string,
  query: ProdutoListPageQuery
): string {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const params = createProdutoQueryParams(filialId, query, { page, pageSize });
  return `${url}/rest/v1/produtos?${params.toString()}`;
}

export function buildListProdutoCategoriasUrl(url: string, filialId: string): string {
  return `${url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(filialId)}&select=cat&order=cat`;
}

export function buildListProdutoPaisUrl(url: string, filialId: string): string {
  return `${url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(filialId)}&produto_pai_id=is.null&order=nome`;
}

export function buildProdutoByIdUrl(url: string, filialId: string, produtoId: string): string {
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${filialId}`);
  params.set('id', `eq.${produtoId}`);
  params.set('limit', '1');
  return `${url}/rest/v1/produtos?${params.toString()}`;
}

export async function listProdutosPage(
  context: ProdutoApiContext,
  query: ProdutoListPageQuery = {}
): Promise<ProdutoListPageResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const res = await fetch(buildListProdutosPageUrl(context.url, context.filialId, query), {
    headers: createHeaders(context.key, context.token, 'count=exact'),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar produtos`);
  const rows = Array.isArray(body) ? (body as Produto[]) : [];
  const total = parseTotalFromContentRange(res.headers.get('content-range'));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { rows, page, pageSize, total, pageCount };
}

export async function listProdutoCategorias(context: ProdutoApiContext): Promise<string[]> {
  const res = await fetch(buildListProdutoCategoriasUrl(context.url, context.filialId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar categorias`);
  if (!Array.isArray(body)) return [];
  return [
    ...new Set(
      body.map((item) => String((item as { cat?: string }).cat || '').trim()).filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));
}

export async function listProdutoPais(context: ProdutoApiContext): Promise<Produto[]> {
  const res = await fetch(buildListProdutoPaisUrl(context.url, context.filialId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar produtos-pai`);
  return Array.isArray(body) ? (body as Produto[]) : [];
}

export async function listProdutoById(
  context: ProdutoApiContext,
  produtoId: string
): Promise<Produto | null> {
  const res = await fetch(buildProdutoByIdUrl(context.url, context.filialId, produtoId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar produto`);
  return Array.isArray(body) && body[0] ? (body[0] as Produto) : null;
}

export async function saveProduto(
  context: ProdutoApiContext,
  input: ProdutoWriteInput
): Promise<Produto | null> {
  const payload: ProdutoWriteInput = {
    ...input,
    filial_id: context.filialId
  };

  const res = await fetch(`${context.url}/rest/v1/produtos?on_conflict=id`, {
    method: 'POST',
    headers: createHeaders(
      context.key,
      context.token,
      'resolution=merge-duplicates,return=representation'
    ),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar produto`);
  if (Array.isArray(body) && body[0]) {
    return body[0] as Produto;
  }
  if (input.id) {
    return { ...payload, id: input.id } as Produto;
  }
  return null;
}

export async function deleteProduto(context: ProdutoApiContext, produtoId: string): Promise<void> {
  const url = `${context.url}/rest/v1/produtos?id=eq.${encodeURIComponent(produtoId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao remover produto`);
}

export async function listVariantesByPaiId(
  context: ProdutoApiContext,
  paiId: string
): Promise<Produto[]> {
  const url = `${context.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(context.filialId)}&produto_pai_id=eq.${encodeURIComponent(paiId)}&order=nome`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar variantes`);
  return Array.isArray(body) ? (body as Produto[]) : [];
}

export async function listMovimentacoesByProdutoIds(
  context: ProdutoApiContext,
  produtoIds: string[]
): Promise<MovimentoEstoque[]> {
  if (!produtoIds.length) return [];
  const ids = produtoIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',');
  const url = `${context.url}/rest/v1/movimentacoes?filial_id=eq.${encodeURIComponent(context.filialId)}&prod_id=in.(${ids})&order=ts.asc`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar movimentações das variantes`);
  return Array.isArray(body) ? (body as MovimentoEstoque[]) : [];
}

export type VendaVarianteRow = {
  produto_id: string;
  qty: number;
  preco: number;
  criado_em: string;
};

export async function listPedidoItensByProdutoIds(
  context: ProdutoApiContext,
  produtoIds: string[],
  fromDate?: string
): Promise<VendaVarianteRow[]> {
  if (!produtoIds.length) return [];
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${context.filialId}`);
  params.set(
    'produto_id',
    `in.(${produtoIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',')})`
  );
  params.set('select', 'produto_id,qty,preco,criado_em');
  if (fromDate) params.set('criado_em', `gte.${fromDate}`);
  const url = `${context.url}/rest/v1/pedido_itens?${params.toString()}`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(15000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar vendas das variantes`);
  return Array.isArray(body) ? (body as VendaVarianteRow[]) : [];
}
