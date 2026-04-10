// @ts-check

/** @typedef {import('../types/domain').AppCache} AppCache */
/** @typedef {import('../types/domain').AppState} AppState */
/** @typedef {import('../types/domain').Pedido} Pedido */

/** @type {AppCache} */
export const D = {
  filiais: [],
  produtos: {},
  clientes: {},
  pedidos: {},
  rcas: {},
  fornecedores: {},
  cotPrecos: {},
  cotConfig: {},
  movs: {},
  jogos: {},
  userPerfis: [],
  userFiliais: [],
  acessosAudit: [],
  accessUsers: []
};

/** @type {AppState} */
export const State = {
  FIL: null,
  selFil: null,
  user: null,
  userRole: 'operador',
  acPagePerfis: 1,
  acPageVinculos: 1,
  acPageAuditoria: 1,
  dashP: 'mes',
  movTipo: 'entrada',
  editIds: {},
  pedItens: [],
  _mapaCtx: null
};

function getFilialKey() {
  return State.FIL || '';
}

export function P() {
  const filialId = getFilialKey();
  return D.produtos[filialId] || (D.produtos[filialId] = []);
}

export function C() {
  const filialId = getFilialKey();
  return D.clientes[filialId] || (D.clientes[filialId] = []);
}

// ── Memoização de PD() ────────────────────────────────────────────────────────
// JSON.parse de itens era executado em CADA chamada a PD(), inclusive em loops
// de render (dashboard, notificações, pedidos). Em 500 pedidos = 500 parses/render.
// Agora: compara a referência do array raw — só re-parseia quando os dados mudam.
/** @type {unknown[] | null} */
let _pdRawRef = null;
/** @type {Pedido[]} */
let _pdParsed = [];

export function PD() {
  const filialId = getFilialKey();
  const raw = D.pedidos[filialId] || (D.pedidos[filialId] = []);

  if (raw === _pdRawRef) return _pdParsed;

  _pdRawRef = raw;
  _pdParsed = raw.map((pedido) => ({
    ...pedido,
    itens:
      typeof pedido.itens === 'string'
        ? /** @type {Pedido['itens']} */ (safeJsonParse(pedido.itens || '[]'))
        : pedido.itens || []
  }));

  return _pdParsed;
}

/**
 * Invalida o cache de PD() — chamar após mutações em D.pedidos[filialId].
 * Necessário porque os features podem trocar o array por um novo (slice/filter/map).
 */
export function invalidatePdCache() {
  _pdRawRef = null;
}

/** @param {string} raw @returns {unknown} */
function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function RCAS() {
  const filialId = getFilialKey();
  return D.rcas[filialId] || (D.rcas[filialId] = []);
}

export function FORNS() {
  const filialId = getFilialKey();
  return D.fornecedores[filialId] || (D.fornecedores[filialId] = []);
}

export function CPRECOS() {
  const filialId = getFilialKey();
  return D.cotPrecos[filialId] || (D.cotPrecos[filialId] = {});
}

export function CCFG() {
  const filialId = getFilialKey();
  return (
    D.cotConfig[filialId] ||
    (D.cotConfig[filialId] = { filial_id: State.FIL, locked: false, logs: [] })
  );
}

export function MOVS() {
  const filialId = getFilialKey();
  return D.movs[filialId] || (D.movs[filialId] = []);
}
