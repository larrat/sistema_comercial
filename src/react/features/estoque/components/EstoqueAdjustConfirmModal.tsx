import { Modal, Button } from '../../../shared/ui';

type EstoqueAdjustConfirmModalProps = {
  open: boolean;
  produtoNome: string;
  saldoAtualLabel: string;
  saldoNovoLabel: string;
  diferencaLabel: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function EstoqueAdjustConfirmModal({
  open,
  produtoNome,
  saldoAtualLabel,
  saldoNovoLabel,
  diferencaLabel,
  submitting,
  onClose,
  onConfirm
}: EstoqueAdjustConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnOverlay={!submitting}
      title="Confirmar ajuste de estoque"
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Revisar
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={submitting}>
            Confirmar ajuste
          </Button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <p className="table-cell-strong">
          O ajuste redefine o saldo atual do produto para o valor informado.
        </p>
        <div className="rf-ui-stack" style={{ gap: 6 }}>
          <div>
            <span className="table-cell-caption table-cell-muted">Produto</span>
            <div>{produtoNome || 'Produto não selecionado'}</div>
          </div>
          <div>
            <span className="table-cell-caption table-cell-muted">Saldo atual</span>
            <div>{saldoAtualLabel}</div>
          </div>
          <div>
            <span className="table-cell-caption table-cell-muted">Novo saldo</span>
            <div>{saldoNovoLabel}</div>
          </div>
          <div>
            <span className="table-cell-caption table-cell-muted">Diferença</span>
            <div>{diferencaLabel}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
