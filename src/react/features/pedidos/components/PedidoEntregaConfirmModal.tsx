import type { Pedido } from '../../../../types/domain';
import { Modal, StatusBadge } from '../../../shared/ui';
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
        <div className="modal-actions">
          <button className="btn btn-sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            className="btn btn-sm btn-p"
            type="button"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Confirmando...' : 'Confirmar entrega'}
          </button>
        </div>
      }
    >
      {pedido ? (
        <div className="rf-ui-stack" data-testid="pedido-entrega-confirm-modal">
          <p className="table-cell-muted">
            Confirme apenas quando a mercadoria tiver sido entregue ao cliente.
          </p>
          <div className="fg c2">
            <div>
              <div className="fl">Cliente</div>
              <div className="fv">{pedido.cli || '—'}</div>
            </div>
            <div>
              <div className="fl">Pedido</div>
              <div className="fv">#{pedido.num}</div>
            </div>
            <div>
              <div className="fl">Valor total</div>
              <div className="fv">{formatCurrency(pedido.total)}</div>
            </div>
            <div>
              <div className="fl">Pagamento</div>
              <div className="fv">{PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto ?? '—'}</div>
            </div>
            <div>
              <div className="fl">Prazo</div>
              <div className="fv">{PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo ?? '—'}</div>
            </div>
            <div>
              <div className="fl">Status atual</div>
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
