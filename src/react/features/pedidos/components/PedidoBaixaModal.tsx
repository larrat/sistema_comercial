import { useEffect, useRef, useState } from 'react';

import { FormError, Modal } from '../../../shared/ui';

type Props = {
  open: boolean;
  submitting: boolean;
  valorEmAberto: number;
  error?: string | null;
  onClose: () => void;
  onConfirm: (valor: number) => void;
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PedidoBaixaModal({
  open,
  submitting,
  valorEmAberto,
  error,
  onClose,
  onConfirm
}: Props) {
  const [valor, setValor] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValor('');
    setLocalError(null);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function handleConfirm() {
    const parsed = parseFloat(valor.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      setLocalError('Informe um valor válido.');
      inputRef.current?.focus();
      return;
    }
    onConfirm(parsed);
  }

  return (
    <Modal
      open={open}
      title="Registrar baixa parcial"
      onClose={onClose}
      closeOnOverlay={!submitting}
      footer={
        <>
          <button type="button" className="btn btn-sm" disabled={submitting} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-p btn-sm"
            disabled={submitting}
            onClick={handleConfirm}
            data-testid="pedido-detail-confirmar-baixa"
          >
            {submitting ? 'Confirmando…' : 'Confirmar baixa'}
          </button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <p className="table-cell-muted">
          Valor em aberto atual: <strong>{formatCurrency(valorEmAberto)}</strong>
        </p>
        <label>
          <span className="fl">Valor da baixa</span>
          <input
            ref={inputRef}
            className="inp"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            value={valor}
            onChange={(event) => {
              setValor(event.target.value);
              setLocalError(null);
            }}
          />
        </label>
        <FormError message={localError || error || null} />
      </div>
    </Modal>
  );
}
