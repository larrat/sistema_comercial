import { Modal } from '../../../shared/ui';

type ContaReceberConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  contaLabel: string;
  valorLabel?: string;
  submitting: boolean;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ContaReceberConfirmModal({
  open,
  title,
  description,
  contaLabel,
  valorLabel,
  submitting,
  confirmLabel,
  onClose,
  onConfirm
}: ContaReceberConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnOverlay={!submitting}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="button" className="btn btn-p btn-sm" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Confirmando...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <p className="table-cell-strong">{description}</p>
        <div className="rf-ui-stack" style={{ gap: 6 }}>
          <div>
            <span className="table-cell-caption table-cell-muted">Conta</span>
            <div>{contaLabel}</div>
          </div>
          {valorLabel ? (
            <div>
              <span className="table-cell-caption table-cell-muted">Valor</span>
              <div>{valorLabel}</div>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
