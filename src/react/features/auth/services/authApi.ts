import type { AuthSession, Filial } from '../../../../types/domain';

type ApiBase = { url: string; key: string };

export async function signInWithPassword(
  base: ApiBase,
  email: string,
  password: string
): Promise<AuthSession> {
  const res = await fetch(`${base.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: base.key,
      Authorization: `Bearer ${base.key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(12000)
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
  await fetch(`${base.url}/auth/v1/logout`, {
    method: 'POST',
    headers: { apikey: base.key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(6000)
  }).catch(() => {});
}

export async function listUserFiliais(
  base: ApiBase,
  token: string,
  userId: string
): Promise<Filial[]> {
  const accRes = await fetch(
    `${base.url}/rest/v1/user_filiais?user_id=eq.${encodeURIComponent(userId)}&select=filial_id`,
    { headers: { apikey: base.key, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
  );
  if (!accRes.ok) throw new Error(`Erro ao buscar acessos (${accRes.status}).`);
  const acc: Array<{ filial_id: string }> = await accRes.json();
  if (!acc.length) return [];

  const ids = acc.map((r) => r.filial_id).join(',');
  const filRes = await fetch(
    `${base.url}/rest/v1/filiais?id=in.(${ids})&order=criado_em`,
    { headers: { apikey: base.key, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
  );
  if (!filRes.ok) throw new Error(`Erro ao buscar filiais (${filRes.status}).`);
  return filRes.json() as Promise<Filial[]>;
}
