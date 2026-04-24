import type { Filial } from '../../../../../types/domain';

export type FiliaisApiCtx = { url: string; key: string; token: string };

function headers(ctx: FiliaisApiCtx): HeadersInit {
  return {
    apikey: ctx.key,
    Authorization: `Bearer ${ctx.token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
}

export async function listFiliaisAdmin(ctx: FiliaisApiCtx, userId: string): Promise<Filial[]> {
  const accRes = await fetch(
    `${ctx.url}/rest/v1/user_filiais?user_id=eq.${encodeURIComponent(userId)}&select=filial_id`,
    { headers: headers(ctx), signal: AbortSignal.timeout(8000) }
  );
  if (!accRes.ok) throw new Error(`Erro ao buscar acessos (${accRes.status}).`);
  const acc: Array<{ filial_id: string }> = await accRes.json();
  if (!acc.length) return [];

  const ids = acc.map((r) => r.filial_id).join(',');
  const filRes = await fetch(
    `${ctx.url}/rest/v1/filiais?id=in.(${ids})&order=criado_em`,
    { headers: headers(ctx), signal: AbortSignal.timeout(8000) }
  );
  if (!filRes.ok) throw new Error(`Erro ao buscar filiais (${filRes.status}).`);
  const data: unknown = await filRes.json();
  return Array.isArray(data) ? (data as Filial[]) : [];
}

export async function upsertFilial(ctx: FiliaisApiCtx, filial: Filial): Promise<Filial> {
  const res = await fetch(`${ctx.url}/rest/v1/filiais?on_conflict=id`, {
    method: 'POST',
    headers: headers(ctx),
    body: JSON.stringify(filial),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`Erro ao salvar filial (${res.status}).`);
  const data: unknown = await res.json();
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? filial) as Filial;
}

export async function deleteFilial(ctx: FiliaisApiCtx, id: string): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/filiais?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(ctx),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`Erro ao remover filial (${res.status}).`);
}
