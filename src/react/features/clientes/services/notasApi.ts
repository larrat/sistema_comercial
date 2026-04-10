import type { ClienteNota } from '../types';
import type { ClienteApiContext } from './clientesApi';

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

export function buildListNotasUrl(url: string, clienteId: string): string {
  return `${url}/rest/v1/notas?cliente_id=eq.${encodeURIComponent(clienteId)}&order=criado_em.desc`;
}

export async function listNotas(
  context: Omit<ClienteApiContext, 'filialId'>,
  clienteId: string
): Promise<ClienteNota[]> {
  const res = await fetch(buildListNotasUrl(context.url, clienteId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar notas`);
  return Array.isArray(body) ? (body as ClienteNota[]) : [];
}

export async function addNota(
  context: Omit<ClienteApiContext, 'filialId'>,
  nota: ClienteNota
): Promise<ClienteNota> {
  const res = await fetch(`${context.url}/rest/v1/notas`, {
    method: 'POST',
    headers: createHeaders(context.key, context.token),
    body: JSON.stringify(nota),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar nota`);
  return Array.isArray(body) && body[0] ? (body[0] as ClienteNota) : nota;
}
