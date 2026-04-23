import type { Rca } from '../../../../types/domain';

type ApiCtx = { url: string; key: string; token: string; filialId: string };

function headers(ctx: ApiCtx) {
  return {
    apikey: ctx.key,
    Authorization: `Bearer ${ctx.token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
}

export async function listRcas(ctx: ApiCtx): Promise<Rca[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/rcas?filial_id=eq.${encodeURIComponent(ctx.filialId)}&order=nome`,
    { headers: headers(ctx), signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`listRcas: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Rca[]) : [];
}

export async function upsertRca(ctx: ApiCtx, rca: Rca): Promise<Rca> {
  const res = await fetch(`${ctx.url}/rest/v1/rcas?on_conflict=id`, {
    method: 'POST',
    headers: headers(ctx),
    body: JSON.stringify(rca),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`upsertRca: ${res.status}`);
  const data: unknown = await res.json();
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? rca) as Rca;
}

export async function deactivateRca(ctx: ApiCtx, id: string): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/rcas?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(ctx),
    body: JSON.stringify({ ativo: false }),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`deactivateRca: ${res.status}`);
}
