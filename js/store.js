// js/store.js

// ═══════════════════════════
// BANCO DE DADOS EM MEMÓRIA (CACHE)
// ═══════════════════════════
export const D = {
  filiais: [],
  produtos: {},
  clientes: {},
  pedidos: {},
  fornecedores: {},
  cotPrecos: {},
  cotConfig: {},
  movs: {},
  jogos: {}
};

// ═══════════════════════════
// ESTADO GLOBAL DO APP
// ═══════════════════════════
export const State = {
  FIL: null,         // ID da Filial ativa
  selFil: null,      // Filial selecionada na tela de Setup
  user: null,        // Sessão autenticada (Supabase user)
  userRole: 'operador', // Papel atual do usuário (admin/gerente/operador)
  dashP: 'mes',      // Período selecionado no dashboard
  movTipo: 'entrada',// Tipo de movimentação selecionada no estoque
  editIds: {},       // Guarda IDs em edição (produto, cliente, etc)
  pedItens: [],      // Carrinho temporário de itens do pedido
  _mapaCtx: null     // Contexto da importação de planilha de cotação
};

// ═══════════════════════════
// GETTERS (Acesso rápido aos dados da filial ativa)
// ═══════════════════════════
export function P() { 
  return D.produtos[State.FIL] || (D.produtos[State.FIL] = []); 
}

export function C() { 
  return D.clientes[State.FIL] || (D.clientes[State.FIL] = []); 
}

export function PD() {
  const raw = D.pedidos[State.FIL] || (D.pedidos[State.FIL] = []);
  return raw.map(p => ({
    ...p, 
    itens: typeof p.itens === 'string' ? JSON.parse(p.itens || '[]') : (p.itens || [])
  }));
}

export function FORNS() { 
  return D.fornecedores[State.FIL] || (D.fornecedores[State.FIL] = []); 
}

export function CPRECOS() { 
  return D.cotPrecos[State.FIL] || (D.cotPrecos[State.FIL] = {}); 
}

export function CCFG() { 
  return D.cotConfig[State.FIL] || (D.cotConfig[State.FIL] = { filial_id: State.FIL, locked: false, logs: [] }); 
}

export function MOVS() { 
  return D.movs[State.FIL] || (D.movs[State.FIL] = []); 
}
