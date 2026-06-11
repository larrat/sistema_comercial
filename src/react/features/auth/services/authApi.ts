import type { AuthSession, Filial } from '../../../../types/domain';
import { fetchWithAuth, readJson } from '../../../shared/api/apiClient';

type ApiBase = { url: string; key: string };

export async function signInWithPassword(
  base: ApiBase,
  email: string,
  password: string
): Promise<AuthSession> {
  const res = await fetchWithAuth(base, '/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    timeoutMs: 12000
  });

  if (!res.ok) {
    const msg = res.status === 400 ? 'E-mail ou senha inválidos.' : `Erro ao entrar (${res.status}).`;
    throw new Error(msg);
  }

  const data: Record<string, unknown> = await res.json();
  return {
    access_token: String(data.access_token || ''),
    refresh_token: String(data.refresh_token || ''),
    token_type: String(data.token_type || 'bearer'),
    expires_in: Number(data.expires_in || 3600),
    expires_at: Number(data.expires_at || 0) || Math.floor(Date.now() / 1000) + 3600,
    user: (data.user as Record<string, unknown>) ?? null
  };
}

export async function signOut(base: ApiBase, token: string): Promise<void> {
  await fetchWithAuth({ ...base, token }, '/auth/v1/logout', {
    method: 'POST',
    timeoutMs: 6000
  }).catch((err) => console.error('Erro no logout', err));
}

export async function getUserContext(
  base: ApiBase,
  token: string
): Promise<Array<{ filial_id: string; cargo_id: string; permissoes: string[] }> | null> {
  try {
    const res = await fetchWithAuth({ ...base, token }, '/rest/v1/rpc/get_user_context', {
      method: 'POST',
      timeoutMs: 6000
    });
    if (!res.ok) return null;
    return await readJson(res);
  } catch {
    return null;
  }
}

export async function listUserFiliais(
  base: ApiBase,
  token: string,
  userId: string
): Promise<Filial[]> {
  const accRes = await fetchWithAuth(
    { ...base, token },
    `/rest/v1/user_filiais?user_id=eq.${encodeURIComponent(userId)}&select=filial_id`,
    { timeoutMs: 8000 }
  );
  if (!accRes.ok) throw new Error(`Erro ao buscar acessos (${accRes.status}).`);
  const acc: Array<{ filial_id: string }> = await accRes.json();
  if (!acc.length) return [];

  const ids = acc.map((r) => r.filial_id).join(',');
  const filRes = await fetchWithAuth(
    { ...base, token },
    `/rest/v1/filiais?id=in.(${ids})&order=criado_em`,
    { timeoutMs: 8000 }
  );
  if (!filRes.ok) throw new Error(`Erro ao buscar filiais (${filRes.status}).`);
  return filRes.json() as Promise<Filial[]>;
}
