export type PedidoTab = 'emaberto' | 'entregues' | 'cancelados';

export type PedidoFiltro = {
  q: string;
  status: string;
  pgto: string;
  periodo: string;
  sort: 'data_desc' | 'data_asc';
};

export type PedidoSummary = {
  total: number;
  emAbertoCount: number;
  valorEmAberto: number;
  entreguesCount: number;
  canceladosCount: number;
};

export const TAB_STATUSES: Record<PedidoTab, string[]> = {
  emaberto: [
    'orcamento',
    'supplier_check',
    'confirmado',
    'em_separacao',
    'em_andamento',
    'entregue_aguardando_pagamento',
    'pago_aguardando_entrega',
    // Compatibilidade: pedidos antigos ainda podem estar com status legado no banco.
    'entregue',
    'pago'
  ],
  entregues: ['concluido'],
  cancelados: ['cancelado']
};

/** Próximo status na progressão operacional */
export const NEXT_STATUS: Record<string, string> = {
  orcamento: 'confirmado',
  supplier_check: 'confirmado',
  confirmado: 'em_separacao',
  em_separacao: 'entregue_aguardando_pagamento',
  em_andamento: 'entregue_aguardando_pagamento',
  pago_aguardando_entrega: 'concluido'
};

/** Label do botão de avanço por status atual */
export const ACAO_LABEL: Record<string, string> = {
  orcamento: 'Confirmar Pedido',
  supplier_check: 'Confirmar',
  confirmado: 'Separar',
  em_separacao: 'Entregar',
  em_andamento: 'Entregar',
  pago_aguardando_entrega: 'Confirmar entrega'
};

export const PEDIDO_STATUS_LABEL: Record<string, string> = {
  orcamento: 'Orçamento',
  supplier_check: 'Validação de Fornecedor',
  confirmado: 'Confirmado',
  em_separacao: 'Em separação',
  em_andamento: 'Em andamento',
  entregue_aguardando_pagamento: 'Entregue · aguardando pagamento',
  pago_aguardando_entrega: 'Pago · aguardando entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

export const PEDIDO_STATUS_TONE: Record<
  string,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  orcamento: 'neutral',
  supplier_check: 'warning',
  confirmado: 'info',
  em_separacao: 'warning',
  em_andamento: 'neutral',
  entregue_aguardando_pagamento: 'info',
  pago_aguardando_entrega: 'warning',
  concluido: 'success',
  cancelado: 'danger'
};

export function normalizePedStatus(status: string | null | undefined): string {
  const raw = String(status ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return '';
  if (raw === 'entregues') return 'entregue';
  if (raw === 'cancelados') return 'cancelado';
  if (raw === 'em separacao' || raw === 'em separação') return 'em_separacao';
  if (raw === 'orcamento' || raw === 'orçamento') return 'orcamento';
  if (raw === 'entregue') return 'entregue_aguardando_pagamento';
  if (raw === 'pago') return 'pago_aguardando_entrega';
  return raw;
}

export type ValeTroca = {
  id: string;
  filial_id: string;
  cliente_id?: string | null;
  codigo: string;
  valor: number;
  status: 'ativo' | 'utilizado';
  criado_em: string;
};

export type Devolucao = {
  id: string;
  filial_id: string;
  pedido_id?: string | null;
  cliente_id?: string | null;
  vale_troca_id?: string | null;
  criado_em: string;
  vale_troca?: ValeTroca;
};

export type DevolucaoItem = {
  id: string;
  devolucao_id: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
};
