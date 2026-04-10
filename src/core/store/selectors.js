// @ts-check

/**
 * Selectors — camada de acesso ao store (D, State).
 *
 * PROBLEMA ATUAL:
 *   Todos os módulos acessam D e State diretamente:
 *   D.clientes[State.FIL], D.produtos[State.FIL], etc.
 *   Isso cria 70+ pontos de acoplamento ao shape interno do store.
 *
 * SOLUÇÃO:
 *   Selectors são funções puras que encapsulam o acesso.
 *   - Se o shape de D mudar, só os selectors precisam ser atualizados.
 *   - Selectors são fáceis de testar (puras, sem efeito colateral).
 *   - Nomes semânticos tornam o código dos features mais legível.
 *
 * USO:
 *   import { getProducts, getClients } from '../core/store/selectors.js';
 *   const products = getProducts();  // ao invés de D.produtos[State.FIL]
 */

import { D, State } from '../../app/store.js';

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Retorna a filial ativa atual.
 * @returns {string}
 */
export function getActiveFilialId() {
  return State.FIL || '';
}

/**
 * Retorna os dados de uma coleção por filial, com auto-vivificação segura.
 * @template T
 * @param {Record<string, T[]>} collection
 * @param {string} [filialId]
 * @returns {T[]}
 */
function byFilial(collection, filialId) {
  const fid = filialId || getActiveFilialId();
  return collection[fid] || (collection[fid] = []);
}

// ── Selectors de dados por filial ─────────────────────────────────────────────

/** @returns {import('../../types/domain').Produto[]} */
export function getProducts(filialId) {
  return byFilial(D.produtos, filialId);
}

/** @returns {import('../../types/domain').Cliente[]} */
export function getClients(filialId) {
  return byFilial(D.clientes, filialId);
}

/**
 * Retorna pedidos com itens já parseados.
 * Memoização por referência: se o array de pedidos não mudou, retorna o cache.
 * @returns {import('../../types/domain').Pedido[]}
 */
let _pdRawRef = null;
let _pdParsed = /** @type {import('../../types/domain').Pedido[]} */ ([]);

export function getOrders(filialId) {
  const fid = filialId || getActiveFilialId();
  const raw = D.pedidos[fid] || (D.pedidos[fid] = []);

  if (raw === _pdRawRef) return _pdParsed;

  _pdRawRef = raw;
  _pdParsed = raw.map((pedido) => ({
    ...pedido,
    itens:
      typeof pedido.itens === 'string'
        ? /** @type {import('../../types/domain').Pedido['itens']} */ (
            safeJsonParse(pedido.itens, [])
          )
        : pedido.itens || []
  }));

  return _pdParsed;
}

/** @returns {import('../../types/domain').Fornecedor[]} */
export function getSuppliers(filialId) {
  return byFilial(D.fornecedores, filialId);
}

/** @returns {import('../../types/domain').Rca[]} */
export function getRcas(filialId) {
  return byFilial(D.rcas, filialId);
}

/** @returns {any[]} */
export function getMovements(filialId) {
  return byFilial(D.movs, filialId);
}

/** @returns {import('../../types/domain').JogoAgenda[]} */
export function getGames(filialId) {
  return byFilial(D.jogos, filialId);
}

/** @returns {import('../../types/domain').Campanha[]} */
export function getCampaigns(filialId) {
  return byFilial(D.campanhas, filialId);
}

/** @returns {import('../../types/domain').CampanhaEnvio[]} */
export function getCampaignQueue(filialId) {
  return byFilial(D.campanhaEnvios, filialId);
}

// ── Selectors de estado ───────────────────────────────────────────────────────

/** @returns {string} */
export function getCurrentUserRole() {
  return State.userRole || 'operador';
}

/** @returns {boolean} */
export function isAdmin() {
  return getCurrentUserRole() === 'admin';
}

/** @returns {boolean} */
export function isManagerOrAbove() {
  const role = getCurrentUserRole();
  return role === 'admin' || role === 'gerente';
}

/** @returns {import('../../types/domain').Filial[]} */
export function getAllFiliais() {
  return D.filiais || [];
}

/** @returns {import('../../types/domain').Filial | undefined} */
export function getActiveFilial() {
  const fid = getActiveFilialId();
  return D.filiais.find((f) => f.id === fid);
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * JSON.parse com fallback — evita throw em dados corrompidos.
 * @template T
 * @param {string} str
 * @param {T} fallback
 * @returns {T}
 */
function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
