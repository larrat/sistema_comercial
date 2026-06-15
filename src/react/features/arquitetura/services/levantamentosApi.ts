import type { LevantamentoArquitetura } from '../../../../types/domain';

import type { ApiContext } from '../../../shared/types/api';
export type LevantamentoApiContext = ApiContext;

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

export async function listLevantamentos(context: LevantamentoApiContext): Promise<LevantamentoArquitetura[]> {
  const url = `${context.url}/rest/v1/levantamentos_arquitetura?filial_id=eq.${encodeURIComponent(context.filialId)}&order=atualizado_em.desc`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar levantamentos`);
  return Array.isArray(body) ? (body as LevantamentoArquitetura[]) : [];
}

export async function saveLevantamento(
  context: LevantamentoApiContext,
  levantamento: Partial<LevantamentoArquitetura>
): Promise<LevantamentoArquitetura> {
  const payload = { ...levantamento, filial_id: context.filialId };

  const res = await fetch(`${context.url}/rest/v1/levantamentos_arquitetura?on_conflict=id`, {
    method: 'POST',
    headers: createHeaders(
      context.key,
      context.token,
      'return=representation,resolution=merge-duplicates'
    ),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar levantamento`);

  if (Array.isArray(body) && body[0]) {
    return body[0] as LevantamentoArquitetura;
  }
  throw new Error('Falha ao retornar dados do levantamento salvo');
}

export async function deleteLevantamento(context: LevantamentoApiContext, id: string): Promise<void> {
  const url = `${context.url}/rest/v1/levantamentos_arquitetura?id=eq.${encodeURIComponent(id)}&filial_id=eq.${encodeURIComponent(context.filialId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(20000)
  });
  
  if (!res.ok) {
    const body = await readJson(res);
    ensureOk(res, body, `Erro ${res.status} ao excluir levantamento`);
  }
}
