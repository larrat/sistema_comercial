import type { Pedido } from '../../../../types/domain';
import { Modal, StatusBadge, Button } from '../../../shared/ui';
import { PEDIDO_STATUS_LABEL, normalizePedStatus } from '../types';

const PGTO_LABEL: Record<string, string> = {
  a_vista: 'À vista',
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cheque: 'Cheque',
  misto: 'Misto'
};

const PRAZO_LABEL: Record<string, string> = {
  imediato: 'Imediato',
  a_vista: 'À vista',
  '7d': '7 dias',
  '15d': '15 dias',
  '30d': '30 dias',
  '60d': '60 dias'
};

function formatCurrency(value?: number | null): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getPaymentWarning(pedido: Pedido): string {
  const pgto = String(pedido.pgto || '').toLowerCase();
  const prazo = String(pedido.prazo || '').toLowerCase();
  const baixaNaEntrega =
    ['a_vista', 'avista', 'pix', 'cartao', 'dinheiro'].includes(pgto) &&
    ['', 'imediato', 'a_vista', 'avista', 'na_entrega'].includes(prazo);

  if (baixaNaEntrega) return 'O pagamento será baixado automaticamente se houver conta em aberto.';
  if (pgto === 'misto') {
    return 'A parte da entrega pode ser baixada automaticamente; o restante continua em aberto.';
  }
  return 'O pedido ficará como entregue. O pagamento continua em aberto até a baixa em Receber.';
}

type Props = {
  open: boolean;
  pedido: Pedido | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function PedidoEntregaConfirmModal({
  open,
  pedido,
  submitting = false,
  onClose,
  onConfirm
}: Props) {
  const status = normalizePedStatus(pedido?.status);

  return (
    <Modal
      open={open && !!pedido}
      title="Confirmar entrega"
      onClose={onClose}
      closeOnOverlay={!submitting}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={submitting}
          >
            Confirmar entrega
          </Button>
        </div>
      }
    >
      {pedido ? (
        <div className="rf-ui-stack" data-testid="pedido-entrega-confirm-modal">
          <p className="table-cell-muted">
            Confirme apenas quando a mercadoria tiver sido entregue ao cliente.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente</div>
              <div className="font-bold text-slate-900">{pedido.cli || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pedido</div>
              <div className="font-bold text-slate-900">#{pedido.num}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Valor total</div>
              <div className="font-bold text-slate-900">{formatCurrency(pedido.total)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pagamento</div>
              <div className="font-bold text-slate-900">{PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prazo</div>
              <div className="font-bold text-slate-900">{PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status atual</div>
              <StatusBadge tone="neutral">
                {PEDIDO_STATUS_LABEL[status] ?? status ?? '—'}
              </StatusBadge>
            </div>
          </div>
          <StatusBadge tone="info">{getPaymentWarning(pedido)}</StatusBadge>
        </div>
      ) : null}
    </Modal>
  );
}
