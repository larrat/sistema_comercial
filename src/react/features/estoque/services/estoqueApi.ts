import type { MovimentoEstoque } from '../../../../types/domain';

export type EstoqueApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
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

export async function listMovimentacoes(
  context: EstoqueApiContext
): Promise<MovimentoEstoque[]> {
  const url = `${context.url}/rest/v1/movimentacoes?filial_id=eq.${encodeURIComponent(context.filialId)}&order=ts.asc`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar movimentações`);
  return Array.isArray(body) ? (body as MovimentoEstoque[]) : [];
}

export async function insertMovimentacao(
  context: EstoqueApiContext,
  input: MovimentoEstoque
): Promise<MovimentoEstoque | null> {
  const res = await fetch(`${context.url}/rest/v1/movimentacoes`, {
    method: 'POST',
    headers: {
      ...createHeaders(context.key, context.token),
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      ...input,
      filial_id: context.filialId
    }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar movimentação`);
  if (Array.isArray(body) && body[0]) {
    return body[0] as MovimentoEstoque;
  }
  return null;
}
