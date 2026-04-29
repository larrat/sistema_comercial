import type { Cliente } from '../../../../types/domain';
import { Modal } from '../../../shared/ui';

type ClienteDeleteConfirmModalProps = {
  open: boolean;
  target: Cliente | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ClienteDeleteConfirmModal({
  open,
  target,
  submitting,
  onClose,
  onConfirm
}: ClienteDeleteConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnOverlay={!submitting}
      title="Excluir cliente"
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
            data-testid="confirmar-exclusao-btn"
          >
            {submitting ? 'Excluindo...' : 'Excluir cliente'}
          </button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <p className="table-cell-strong">
          Esta ação remove o cliente da lista atual. Confirme para continuar.
        </p>
        {target ? (
          <div className="rf-ui-stack" style={{ gap: 6 }}>
            <div>
              <span className="table-cell-caption table-cell-muted">Cliente</span>
              <div>{target.nome}</div>
            </div>
            {target.email ? (
              <div>
                <span className="table-cell-caption table-cell-muted">E-mail</span>
                <div>{target.email}</div>
              </div>
            ) : null}
            {target.seg ? (
              <div>
                <span className="table-cell-caption table-cell-muted">Segmento</span>
                <div>{target.seg}</div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
