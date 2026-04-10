// @ts-check

import { D } from '../app/store.js';

/** @typedef {import('../types/domain').OportunidadeJogo} OportunidadeJogo */
/** @typedef {import('../types/domain').Cliente} Cliente */
/** @typedef {import('../types/domain').JogoAgenda} JogoAgenda */

const OPORTUNIDADES_JOGOS_STORE_KEY = 'sc_oportunidades_jogos_store_v1';

/**
 * @param {unknown} v
 */
function normTxt(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * @param {unknown} v
 * @returns {string[]}
 */
function parseTimes(v) {
  const raw = Array.isArray(v) ? v : String(v || '').split(/[,;\n]+/);

  const seen = new Set();
  const out = [];

  raw.forEach((item) => {
    const nome = String(item || '').trim();
    if (!nome) return;
    const key = normTxt(nome);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(nome);
  });

  return out;
}

/**
 * @param {JogoAgenda | null | undefined} jogo
 * @param {string} time
 */
function jogoTemTime(jogo, time) {
  const t = normTxt(time);
  if (!t) return false;
  return [jogo?.mandante, jogo?.visitante, jogo?.titulo, jogo?.campeonato]
    .map(normTxt)
    .some((x) => x.includes(t));
}

/**
 * @param {JogoAgenda | null | undefined} jogo
 * @param {string} [serie]
 */
function jogoEhDaSerie(jogo, serie = 'todas') {
  const s = String(serie || 'todas').toLowerCase();
  if (s === 'todas') return true;

  const camp = normTxt(jogo?.campeonato || '');
  if (!camp) return false;

  if (s === 'a') return /\bserie a\b|\bserie-a\b|\bseriea\b/.test(camp);
  if (s === 'b') return /\bserie b\b|\bserie-b\b|\bserieb\b/.test(camp);
  if (s === 'c') return /\bserie c\b|\bserie-c\b|\bseriec\b/.test(camp);
  return true;
}

/**
 * @param {JogoAgenda | null | undefined} jogo
 */
function getJogoDate(jogo) {
  const date = new Date(jogo?.data_hora || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @returns {Record<string, OportunidadeJogo[]>}
 */
function getStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OPORTUNIDADES_JOGOS_STORE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, OportunidadeJogo[]>} store
 */
function setStore(store) {
  localStorage.setItem(OPORTUNIDADES_JOGOS_STORE_KEY, JSON.stringify(store));
}

/**
 * @param {string} fid
 * @param {Cliente | null | undefined} cliente
 * @param {string} time
 * @param {JogoAgenda | null | undefined} jogo
 */
function buildOpportunityId(fid, cliente, time, jogo) {
  const base = [
    String(fid || ''),
    String(cliente?.id || cliente?.nome || ''),
    String(time || ''),
    String(jogo?.id || jogo?.titulo || ''),
    String(jogo?.data_hora || '')
  ].join('|');

  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }

  return `opp-${Math.abs(hash)}`;
}

/**
 * @param {string} fid
 * @param {{ serie?: string, now?: Date, daysAhead?: number }} [options]
 * @returns {OportunidadeJogo[]}
 */
export function getOportunidadesJogosDaFilial(
  fid,
  { serie = 'todas', now = new Date(), daysAhead = 7 } = {}
) {
  if (!fid) return [];

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  const jogos = (D.jogos?.[fid] || [])
    .filter((jogo) => {
      const data = getJogoDate(jogo);
      if (!data) return false;
      const status = String(jogo?.status || '').toLowerCase();
      if (status === 'cancelado' || status === 'realizado') return false;
      return data >= start && data <= end && jogoEhDaSerie(jogo, serie);
    })
    .sort((a, b) => new Date(a.data_hora || 0).getTime() - new Date(b.data_hora || 0).getTime());

  const clientes = D.clientes?.[fid] || [];

  return clientes
    .flatMap((cliente) => {
      const times = parseTimes(cliente?.time);
      if (!times.length) return [];

      return times.map((time) => {
        const jogo = jogos.find((item) => jogoTemTime(item, time));
        if (!jogo) return null;

        const data = getJogoDate(jogo);
        if (!data) return null;

        return {
          id: buildOpportunityId(fid, cliente, time, jogo),
          filial_id: fid,
          cliente_id: cliente.id || null,
          cliente: cliente.nome || 'Cliente',
          time,
          jogo_id: jogo.id || null,
          jogo,
          data,
          mes_ref: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`,
          ano_ref: String(data.getFullYear())
        };
      });
    })
    .filter(Boolean)
    .sort((a, b) => a.data.getTime() - b.data.getTime());
}

/**
 * @param {string} fid
 * @param {OportunidadeJogo[]} [oportunidades]
 * @returns {OportunidadeJogo[]}
 */
export function syncHistoricoOportunidadesJogos(fid, oportunidades = []) {
  if (!fid) return [];

  const store = getStore();
  const atual = Array.isArray(store[fid]) ? store[fid] : [];
  const map = new Map(atual.map((item) => [item.id, item]));

  oportunidades.forEach((item) => {
    const prev = map.get(item.id);
    map.set(item.id, {
      id: item.id,
      filial_id: fid,
      cliente_id: item.cliente_id || null,
      cliente: item.cliente,
      time: item.time,
      jogo_id: item.jogo_id || null,
      jogo_titulo:
        item.jogo?.titulo || `${item.jogo?.mandante || ''} x ${item.jogo?.visitante || ''}`.trim(),
      jogo_campeonato: item.jogo?.campeonato || null,
      jogo_data_hora: item.jogo?.data_hora || null,
      mes_ref: item.mes_ref,
      ano_ref: item.ano_ref,
      criado_em: prev?.criado_em || new Date().toISOString(),
      validada: Boolean(prev?.validada),
      validada_em: prev?.validada_em || null,
      pedido_id: prev?.pedido_id || null,
      pedido_num: prev?.pedido_num || null,
      pedido_total: prev?.pedido_total || null,
      observacao_validacao: prev?.observacao_validacao || ''
    });
  });

  const list = [...map.values()].sort((a, b) =>
    String(a.jogo_data_hora || '').localeCompare(String(b.jogo_data_hora || ''))
  );
  store[fid] = list;
  setStore(store);
  return list;
}

/**
 * @param {string} fid
 * @returns {OportunidadeJogo[]}
 */
export function getHistoricoOportunidadesJogos(fid) {
  const store = getStore();
  return Array.isArray(store[fid]) ? store[fid] : [];
}

/**
 * @param {string} fid
 * @param {string} id
 * @returns {OportunidadeJogo | null}
 */
export function getOportunidadeJogoById(fid, id) {
  return getHistoricoOportunidadesJogos(fid).find((item) => item.id === id) || null;
}

/**
 * @param {string} fid
 * @param {string} oportunidadeId
 * @param {{ pedido_id?: string | null, pedido_num?: number | null, pedido_total?: number | null, observacao_validacao?: string }} [payload]
 * @returns {OportunidadeJogo | null}
 */
export function salvarValidacaoOportunidadeJogo(fid, oportunidadeId, payload = {}) {
  if (!fid || !oportunidadeId) return null;

  const store = getStore();
  const atual = Array.isArray(store[fid]) ? store[fid] : [];
  const next = atual.map((item) =>
    item.id === oportunidadeId
      ? {
          ...item,
          validada: true,
          validada_em: new Date().toISOString(),
          pedido_id: payload.pedido_id || null,
          pedido_num: payload.pedido_num || null,
          pedido_total: payload.pedido_total || null,
          observacao_validacao: String(payload.observacao_validacao || '').trim()
        }
      : item
  );

  store[fid] = next;
  setStore(store);
  return next.find((item) => item.id === oportunidadeId) || null;
}
