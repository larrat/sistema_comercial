import type { JogoAgenda, Cliente, Pedido } from '../../../../types/domain';

type ApiCtx = { url: string; key: string; token: string; filialId: string };

function hdr(ctx: ApiCtx) {
  return {
    apikey: ctx.key,
    Authorization: `Bearer ${ctx.token}`
  };
}

export async function listJogosAgenda(ctx: ApiCtx): Promise<JogoAgenda[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/jogos_agenda?filial_id=eq.${encodeURIComponent(ctx.filialId)}&order=data_hora.asc`,
    { headers: hdr(ctx), signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`listJogosAgenda: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as JogoAgenda[]) : [];
}

export async function listClientesParaRelatorio(ctx: ApiCtx): Promise<Cliente[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(ctx.filialId)}&select=id,nome,time,status,seg,data_aniversario,optin_marketing,rca_nome&order=nome`,
    { headers: hdr(ctx), signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`listClientesParaRelatorio: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Cliente[]) : [];
}

export async function listPedidosParaRelatorio(ctx: ApiCtx): Promise<Pedido[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(ctx.filialId)}&select=id,num,cli,total,status,rca_nome&order=num.desc`,
    { headers: hdr(ctx), signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`listPedidosParaRelatorio: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Pedido[]) : [];
}
