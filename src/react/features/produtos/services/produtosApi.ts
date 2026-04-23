import type { Produto } from '../../../../types/domain';
import type { ProdutoWriteInput } from '../types';

export type ProdutoApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
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
