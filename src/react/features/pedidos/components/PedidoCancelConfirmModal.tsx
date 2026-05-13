import type { Pedido } from '../../../../types/domain';
import { Modal, StatusBadge, Button } from '../../../shared/ui';

type Props = {
  pedido: Pedido | null;
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function fmtCurrency(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PedidoCancelConfirmModal({ pedido, open, submitting, onClose, onConfirm }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnOverlay={!submitting}
      title="Cancelar pedido"
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={submitting}
            data-testid="pedido-cancelar-confirmar"
          >
            Confirmar cancelamento
          </Button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <p className="table-cell-strong">
          Esta ação altera o status do pedido para cancelado. O restante das regras operacionais do
          pedido permanece igual.
        </p>
        {pedido ? (
          <div className="rf-ui-stack" style={{ gap: 6 }}>
            <div>
              <span className="table-cell-caption table-cell-muted">Pedido</span>
              <div>#{pedido.num}</div>
            </div>
            <div>
              <span className="table-cell-caption table-cell-muted">Cliente</span>
              <div>{pedido.cli || '—'}</div>
            </div>
            <div>
              <span className="table-cell-caption table-cell-muted">Valor</span>
              <div>{fmtCurrency(pedido.total)}</div>
            </div>
            <div>
              <span className="table-cell-caption table-cell-muted">Status atual</span>
              <div>
                <StatusBadge tone="warning">{String(pedido.status || '—')}</StatusBadge>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
