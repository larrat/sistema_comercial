import { Modal, Button } from '../../../shared/ui';
import type { EstoqueHistoryRow } from '../types';

type EstoqueDeleteConfirmModalProps = {
  open: boolean;
  target: EstoqueHistoryRow | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function EstoqueDeleteConfirmModal({
  open,
  target,
  submitting,
  onClose,
  onConfirm
}: EstoqueDeleteConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnOverlay={!submitting}
      title="Excluir movimentação"
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={submitting}
          >
            Excluir
          </Button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <p className="table-cell-strong">
          Esta ação remove a movimentação do histórico e recalcula a posição do estoque.
        </p>
        {target ? (
          <div className="rf-ui-stack" style={{ gap: 6 }}>
            <div>
              <span className="table-cell-caption table-cell-muted">Produto</span>
              <div>{target.produto}</div>
            </div>
            <div>
              <span className="table-cell-caption table-cell-muted">Data</span>
              <div>{target.data}</div>
            </div>
            <div>
              <span className="table-cell-caption table-cell-muted">Tipo</span>
              <div>{target.tipo}</div>
            </div>
            <div>
              <span className="table-cell-caption table-cell-muted">Quantidade</span>
              <div>{target.quantidadeLabel}</div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
