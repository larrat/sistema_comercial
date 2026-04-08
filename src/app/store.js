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

export function PD() {
  const filialId = getFilialKey();
  const raw = D.pedidos[filialId] || (D.pedidos[filialId] = []);
  return raw.map((pedido) => ({
    ...pedido,
    itens: typeof pedido.itens === 'string'
      ? /** @type {Pedido['itens']} */ (JSON.parse(pedido.itens || '[]'))
      : (pedido.itens || [])
  }));
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
  return D.cotConfig[filialId] || (D.cotConfig[filialId] = { filial_id: State.FIL, locked: false, logs: [] });
}

export function MOVS() {
  const filialId = getFilialKey();
  return D.movs[filialId] || (D.movs[filialId] = []);
}
