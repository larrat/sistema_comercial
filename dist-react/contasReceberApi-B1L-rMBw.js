function e(e, t) {
  return { apikey: e, Authorization: `Bearer ${t}`, 'Content-Type': `application/json` };
}
async function t(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function n(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(`${n}: ${e.status}`);
}
async function r(r) {
  let i = await fetch(
      `${r.url}/rest/v1/contas_receber?filial_id=eq.${encodeURIComponent(r.filialId)}&order=vencimento.asc`,
      { headers: e(r.key, r.token), signal: AbortSignal.timeout(12e3) }
    ),
    a = await t(i);
  return (n(i, a, `Erro ao carregar contas a receber`), Array.isArray(a) ? a : []);
}
async function i(r) {
  let i = await fetch(
      `${r.url}/rest/v1/contas_receber_baixas?filial_id=eq.${encodeURIComponent(r.filialId)}&order=recebido_em.desc`,
      { headers: e(r.key, r.token), signal: AbortSignal.timeout(12e3) }
    ),
    a = await t(i);
  return (n(i, a, `Erro ao carregar baixas`), Array.isArray(a) ? a : []);
}
async function a(r, i) {
  let a = await fetch(`${r.url}/rest/v1/rpc/rpc_registrar_baixa`, {
    method: `POST`,
    headers: e(r.key, r.token),
    body: JSON.stringify({
      p_baixa_id: i.baixaId,
      p_conta_receber_id: i.contaId,
      p_valor: i.valor,
      p_recebido_em: i.recebidoEm,
      p_observacao: i.observacao
    }),
    signal: AbortSignal.timeout(12e3)
  });
  n(a, await t(a), `Erro ao registrar baixa`);
}
async function o(r, i) {
  let a = await fetch(`${r.url}/rest/v1/rpc/rpc_estornar_baixa`, {
    method: `POST`,
    headers: e(r.key, r.token),
    body: JSON.stringify({ p_baixa_id: i }),
    signal: AbortSignal.timeout(12e3)
  });
  n(a, await t(a), `Erro ao estornar baixa`);
}
async function s(r, i) {
  let a = await fetch(`${r.url}/rest/v1/rpc/rpc_marcar_conta_pendente`, {
    method: `POST`,
    headers: e(r.key, r.token),
    body: JSON.stringify({ p_conta_receber_id: i }),
    signal: AbortSignal.timeout(12e3)
  });
  n(a, await t(a), `Erro ao desfazer recebimento`);
}
export { a, s as i, i as n, r, o as t };
