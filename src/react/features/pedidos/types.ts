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
    'confirmado',
    'em_separacao',
    'em_andamento',
    'entregue_aguardando_pagamento',
    'pago_aguardando_entrega'
  ],
  entregues: ['concluido'],
  cancelados: ['cancelado']
};

/** Próximo status na progressão operacional */
export const NEXT_STATUS: Record<string, string> = {
  orcamento: 'confirmado',
  confirmado: 'em_separacao',
  em_separacao: 'entregue_aguardando_pagamento',
  em_andamento: 'entregue_aguardando_pagamento',
  pago_aguardando_entrega: 'concluido'
};

/** Label do botão de avanço por status atual */
export const ACAO_LABEL: Record<string, string> = {
  orcamento: 'Confirmar',
  confirmado: 'Separar',
  em_separacao: 'Entregar',
  em_andamento: 'Entregar',
  pago_aguardando_entrega: 'Confirmar entrega'
};

export const PEDIDO_STATUS_LABEL: Record<string, string> = {
  orcamento: 'Orçamento',
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
