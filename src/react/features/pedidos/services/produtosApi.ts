import type { Produto } from '../../../../types/domain';
import type { PedidoApiContext } from './pedidosApi';

export type PdvProdutoSearchResult = Pick<
  Produto,
  | 'id'
  | 'nome'
  | 'sku'
  | 'codigo_barras'
  | 'codigo_fornecedor'
  | 'un'
  | 'custo'
  | 'mkv'
  | 'mka'
  | 'pfa'
  | 'pvv'
  | 'esal'
>;

function createHeaders(context: PedidoApiContext): HeadersInit {
  return {
    apikey: context.key,
    Authorization: `Bearer ${context.token}`,
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

export async function listProdutos(context: PedidoApiContext): Promise<Produto[]> {
  const res = await fetch(
    `${context.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(context.filialId)}&order=nome`,
    {
      headers: createHeaders(context),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar produtos`);
  return Array.isArray(body) ? (body as Produto[]) : [];
}

function buildProdutoSearchSelect(): string {
  return [
    'id',
    'nome',
    'sku',
    'codigo_barras',
    'codigo_fornecedor',
    'un',
    'custo',
    'mkv',
    'mka',
    'pfa',
    'pvv',
    'esal'
  ].join(',');
}

function buildProdutoFuzzySearchUrl(
  context: PedidoApiContext,
  rawQuery: string,
  limit: number
): string {
  const clean = rawQuery.replace(/\*/g, '').replace(/,/g, ' ').trim();
  const pattern = `*${clean}*`;
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${context.filialId}`);
  params.set('select', buildProdutoSearchSelect());
  params.set('order', 'nome.asc');
  params.set('limit', String(limit));
  params.set(
    'or',
    `(${[
      `nome.ilike.${pattern}`,
      `sku.ilike.${pattern}`,
      `codigo_barras.ilike.${pattern}`,
      `codigo_fornecedor.ilike.${pattern}`
    ].join(',')})`
  );
  return `${context.url}/rest/v1/produtos?${params.toString()}`;
}

function buildProdutoExactSearchUrl(
  context: PedidoApiContext,
  rawQuery: string,
  limit: number
): string | null {
  const clean = rawQuery.trim();
  if (!clean || /\s/.test(clean)) return null;
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${context.filialId}`);
  params.set('select', buildProdutoSearchSelect());
  params.set('order', 'nome.asc');
  params.set('limit', String(limit));
  params.set(
    'or',
    `(${[
      `sku.eq.${clean}`,
      `codigo_barras.eq.${clean}`,
      `codigo_fornecedor.eq.${clean}`
    ].join(',')})`
  );
  return `${context.url}/rest/v1/produtos?${params.toString()}`;
}

export async function searchProdutosPdv(
  context: PedidoApiContext,
  rawQuery: string,
  limit = 8
): Promise<PdvProdutoSearchResult[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  const exactUrl = buildProdutoExactSearchUrl(context, query, Math.min(3, limit));
  const fuzzyUrl = buildProdutoFuzzySearchUrl(context, query, limit);
  const [exactRes, fuzzyRes] = await Promise.all([
    exactUrl
      ? fetch(exactUrl, {
          headers: createHeaders(context),
          signal: AbortSignal.timeout(12000)
        })
      : Promise.resolve(null),
    fetch(fuzzyUrl, {
      headers: createHeaders(context),
      signal: AbortSignal.timeout(12000)
    })
  ]);

  let exactRows: PdvProdutoSearchResult[] = [];
  if (exactRes) {
    const exactBody = await readJson(exactRes);
    ensureOk(exactRes, exactBody, `Erro ${exactRes.status} ao buscar produto`);
    exactRows = Array.isArray(exactBody) ? (exactBody as PdvProdutoSearchResult[]) : [];
  }

  const fuzzyBody = await readJson(fuzzyRes);
  ensureOk(fuzzyRes, fuzzyBody, `Erro ${fuzzyRes.status} ao buscar produto`);
  const fuzzyRows = Array.isArray(fuzzyBody) ? (fuzzyBody as PdvProdutoSearchResult[]) : [];

  const merged = [...exactRows, ...fuzzyRows];
  const unique = new Map<string, PdvProdutoSearchResult>();
  for (const item of merged) {
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  return [...unique.values()].slice(0, limit);
}
