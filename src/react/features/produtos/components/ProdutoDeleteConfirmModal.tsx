import type { Produto } from '../../../../types/domain';
import { Modal } from '../../../shared/ui';

type ProdutoDeleteConfirmModalProps = {
  open: boolean;
  target: Produto | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ProdutoDeleteConfirmModal({
  open,
  target,
  submitting,
  onClose,
  onConfirm
}: ProdutoDeleteConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnOverlay={!submitting}
      title="Excluir produto"
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
            data-testid="confirmar-exclusao-produto-btn"
          >
            {submitting ? 'Excluindo...' : 'Excluir produto'}
          </button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <p className="table-cell-strong">
          Esta ação remove o produto da lista atual. Confirme para continuar.
        </p>
        {target ? (
          <div className="rf-ui-stack" style={{ gap: 6 }}>
            <div>
              <span className="table-cell-caption table-cell-muted">Produto</span>
              <div>{target.nome}</div>
            </div>
            {target.sku ? (
              <div>
                <span className="table-cell-caption table-cell-muted">SKU</span>
                <div>{target.sku}</div>
              </div>
            ) : null}
            {target.cat ? (
              <div>
                <span className="table-cell-caption table-cell-muted">Categoria</span>
                <div>{target.cat}</div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
