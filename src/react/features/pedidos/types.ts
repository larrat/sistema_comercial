export type PedidoTab = 'emaberto' | 'entregues' | 'cancelados';

export type PedidoFiltro = {
  q: string;
  status: string;
};

export const TAB_STATUSES: Record<PedidoTab, string[]> = {
  emaberto: ['orcamento', 'confirmado', 'em_separacao'],
  entregues: ['entregue'],
  cancelados: ['cancelado']
};

/** Próximo status na progressão operacional */
export const NEXT_STATUS: Record<string, string> = {
  orcamento: 'confirmado',
  confirmado: 'em_separacao',
  em_separacao: 'entregue'
};

/** Label do botão de avanço por status atual */
export const ACAO_LABEL: Record<string, string> = {
  orcamento: 'Confirmar',
  confirmado: 'Separar',
  em_separacao: 'Entregar'
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
  return raw;
}
