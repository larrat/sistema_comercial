import type { Fornecedor } from '../../../../types/domain';
import type { CotacaoConfig, CotacaoPrecoRow } from '../types';

export type CotacaoApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

function headers(key: string, token: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function ensureOk(res: Response, body: unknown, fallback: string): void {
  if (res.ok) return;
  const msg =
    body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message
      : fallback;
  throw new Error(msg);
}

export async function listFornecedores(ctx: CotacaoApiContext): Promise<Fornecedor[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/fornecedores?filial_id=eq.${encodeURIComponent(ctx.filialId)}&order=nome`,
    { headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(10000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar fornecedores`);
  return Array.isArray(body) ? (body as Fornecedor[]) : [];
}

export async function upsertFornecedor(ctx: CotacaoApiContext, forn: Fornecedor): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/fornecedores?on_conflict=id`, {
    method: 'POST',
    headers: headers(ctx.key, ctx.token),
    body: JSON.stringify({ ...forn, filial_id: ctx.filialId }),
    signal: AbortSignal.timeout(10000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar fornecedor`);
}

export async function deleteFornecedor(ctx: CotacaoApiContext, id: string): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/fornecedores?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(ctx.key, ctx.token),
    signal: AbortSignal.timeout(10000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao remover fornecedor`);
}

export async function listCotacaoPrecos(ctx: CotacaoApiContext): Promise<CotacaoPrecoRow[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/cotacao_precos?filial_id=eq.${encodeURIComponent(ctx.filialId)}`,
    { headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(12000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar preços de cotação`);
  return Array.isArray(body) ? (body as CotacaoPrecoRow[]) : [];
}

export async function upsertCotacaoPrecos(
  ctx: CotacaoApiContext,
  items: CotacaoPrecoRow[]
): Promise<void> {
  if (!items.length) return;
  const chunks = chunkArray(items, 250);
  for (const chunk of chunks) {
    const res = await fetch(
      `${ctx.url}/rest/v1/cotacao_precos?on_conflict=filial_id,produto_id,fornecedor_id`,
      {
        method: 'POST',
        headers: headers(ctx.key, ctx.token),
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(15000)
      }
    );
    const body = await readJson(res);
    ensureOk(res, body, `Erro ${res.status} ao salvar preços`);
  }
}

export async function deleteCotacaoPreco(
  ctx: CotacaoApiContext,
  produtoId: string,
  fornecedorId: string
): Promise<void> {
  const res = await fetch(
    `${ctx.url}/rest/v1/cotacao_precos?filial_id=eq.${encodeURIComponent(ctx.filialId)}&produto_id=eq.${encodeURIComponent(produtoId)}&fornecedor_id=eq.${encodeURIComponent(fornecedorId)}`,
    { method: 'DELETE', headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(10000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao remover preço`);
}

export async function getCotacaoConfig(ctx: CotacaoApiContext): Promise<CotacaoConfig | null> {
  const res = await fetch(
    `${ctx.url}/rest/v1/cotacao_config?filial_id=eq.${encodeURIComponent(ctx.filialId)}&limit=1`,
    { headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(10000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar configuração`);
  const arr = Array.isArray(body) ? body : [];
  return arr[0] ? (arr[0] as CotacaoConfig) : null;
}

export async function upsertCotacaoConfig(
  ctx: CotacaoApiContext,
  config: CotacaoConfig
): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/cotacao_config?on_conflict=filial_id`, {
    method: 'POST',
    headers: headers(ctx.key, ctx.token),
    body: JSON.stringify(config),
    signal: AbortSignal.timeout(10000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar configuração`);
}

export async function upsertCotacaoHistorico(
  ctx: CotacaoApiContext,
  items: Array<{
    filial_id: string;
    produto_id: string;
    fornecedor_id: string;
    mes_ref: string;
    preco: number;
    tabela?: number | null;
    desconto?: number | null;
  }>
): Promise<void> {
  if (!items.length) return;
  const chunks = chunkArray(items, 250);
  for (const chunk of chunks) {
    const res = await fetch(
      `${ctx.url}/rest/v1/cotacao_historico?on_conflict=filial_id,produto_id,fornecedor_id,mes_ref`,
      {
        method: 'POST',
        headers: headers(ctx.key, ctx.token),
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(15000)
      }
    );
    const body = await readJson(res);
    ensureOk(res, body, `Erro ${res.status} ao salvar histórico`);
  }
}

export async function getCotacaoLayout(
  ctx: CotacaoApiContext,
  fornecedorId: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${ctx.url}/rest/v1/cotacao_layouts?filial_id=eq.${encodeURIComponent(ctx.filialId)}&fornecedor_id=eq.${encodeURIComponent(fornecedorId)}&limit=1`,
    { headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(10000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar layout`);
  const arr = Array.isArray(body) ? body : [];
  return arr[0] ? (arr[0] as Record<string, unknown>) : null;
}

export async function upsertCotacaoLayout(
  ctx: CotacaoApiContext,
  layout: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/cotacao_layouts?on_conflict=filial_id,fornecedor_id`, {
    method: 'POST',
    headers: headers(ctx.key, ctx.token),
    body: JSON.stringify(layout),
    signal: AbortSignal.timeout(10000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar layout`);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
