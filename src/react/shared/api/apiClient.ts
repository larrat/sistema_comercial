export type ApiBase = { url: string; key: string };
export type ApiContext = ApiBase & { token: string; filialId?: string };

export type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  timeoutMs?: number;
};

/**
 * Lança erro estruturado caso !res.ok, tentando recuperar a mensagem de erro do body json.
 */
export async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const text = await res.text().catch(() => '');
  let message = fallback;
  try {
    const body = JSON.parse(text);
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      message = body.message;
    }
  } catch {
    if (text) message = text;
  }
  throw new Error(message);
}

/**
 * Utilitário seguro para ler JSON.
 */
export async function readJson<T = unknown>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * Centraliza chamadas ao Supabase injetando credenciais e lidando com AbortSignal nativo.
 */
export async function fetchWithAuth(
  context: ApiBase & { token?: string },
  endpoint: string,
  options?: FetchOptions
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${context.url}${endpoint}`;
  
  const headers: Record<string, string> = {
    apikey: context.key,
    'Content-Type': 'application/json',
    ...options?.headers
  };

  if (context.token) {
    headers.Authorization = `Bearer ${context.token}`;
  }

  const timeoutMs = options?.timeoutMs ?? 8000;
  const signal = options?.signal ?? AbortSignal.timeout(timeoutMs);

  return fetch(url, {
    ...options,
    headers,
    signal
  });
}
