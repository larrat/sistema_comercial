import type { Campanha, CampanhaEnvio, CampanhaFilaResult } from '../../../../types/domain';

type ApiCtx = { url: string; key: string; token: string; filialId: string };

function hdr(ctx: ApiCtx) {
  return {
    apikey: ctx.key,
    Authorization: `Bearer ${ctx.token}`
  };
}

export async function listCampanhas(ctx: ApiCtx): Promise<Campanha[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/campanhas?filial_id=eq.${encodeURIComponent(ctx.filialId)}&order=criado_em.desc`,
    { headers: hdr(ctx), signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`listCampanhas: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Campanha[]) : [];
}

export async function listCampanhaEnvios(ctx: ApiCtx): Promise<CampanhaEnvio[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/campanha_envios?filial_id=eq.${encodeURIComponent(ctx.filialId)}&order=criado_em.desc`,
    { headers: hdr(ctx), signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`listCampanhaEnvios: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as CampanhaEnvio[]) : [];
}

export async function upsertCampanha(ctx: ApiCtx, campanha: Partial<Campanha>): Promise<Campanha> {
  const res = await fetch(
    `${ctx.url}/rest/v1/campanhas?on_conflict=id`,
    {
      method: 'POST',
      headers: {
        ...hdr(ctx),
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=merge-duplicates'
      },
      body: JSON.stringify({ ...campanha, filial_id: ctx.filialId }),
      signal: AbortSignal.timeout(10000)
    }
  );
  if (!res.ok) throw new Error(`upsertCampanha: ${res.status}`);
  const data: unknown = await res.json();
  const rows = Array.isArray(data) ? data : [data];
  return rows[0] as Campanha;
}

export async function deleteCampanha(ctx: ApiCtx, id: string): Promise<void> {
  const res = await fetch(
    `${ctx.url}/rest/v1/campanhas?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: hdr(ctx), signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`deleteCampanha: ${res.status}`);
}

export async function patchEnvioStatus(
  ctx: ApiCtx,
  id: string,
  patch: Partial<Pick<CampanhaEnvio, 'status' | 'enviado_em' | 'erro'>>
): Promise<void> {
  const res = await fetch(
    `${ctx.url}/rest/v1/campanha_envios?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { ...hdr(ctx), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(10000)
    }
  );
  if (!res.ok) throw new Error(`patchEnvioStatus: ${res.status}`);
}

export async function gerarFilaEdge(
  ctx: ApiCtx,
  campanhaId: string,
  dryRun = false
): Promise<CampanhaFilaResult> {
  const res = await fetch(
    `${ctx.url}/functions/v1/campanhas-gerar-fila`,
    {
      method: 'POST',
      headers: {
        ...hdr(ctx),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ campanha_id: campanhaId, dry_run: dryRun }),
      signal: AbortSignal.timeout(30000)
    }
  );
  if (!res.ok) throw new Error(`gerarFilaEdge: ${res.status}`);
  return (await res.json()) as CampanhaFilaResult;
}
