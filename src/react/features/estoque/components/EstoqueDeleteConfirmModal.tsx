import { Modal } from '../../../shared/ui';
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
          <button type="button" className="btn btn-sm" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-r btn-sm"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Excluindo...' : 'Excluir'}
          </button>
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
