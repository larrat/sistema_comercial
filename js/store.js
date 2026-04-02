export const D = {
  filiais: [],
  produtos: {},
  clientes: {},
  pedidos: {},
  fornecedores: {},
  cotPrecos: {},
  cotConfig: {},
  movs: {}
};

export const State = {
  FIL: null,
  selFil: null,
  dashP: 'mes',
  movTipo: 'entrada',
  editIds: {},
  pedItens: [],
  _mapaCtx: null
};

export function P() { return D.produtos[State.FIL] || []; }
export function C() { return D.clientes[State.FIL] || []; }
export function PD() {
  const raw = D.pedidos[State.FIL] || [];
  return raw.map(p => ({
    ...p, 
    itens: typeof p.itens === 'string' ? JSON.parse(p.itens || '[]') : (p.itens || [])
  }));
}
export function FORNS() { return D.fornecedores[State.FIL] || []; }
export function CPRECOS() { return D.cotPrecos[State.FIL] || {}; }
export function CCFG() { 
  if (!D.cotConfig[State.FIL]) {
    D.cotConfig[State.FIL] = { filial_id: State.FIL, locked: false, logs: [] };
  }
  return D.cotConfig[State.FIL]; 
}
export function MOVS() { return D.movs[State.FIL] || []; }