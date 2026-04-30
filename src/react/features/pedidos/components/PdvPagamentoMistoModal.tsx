import { useEffect, useMemo, useState } from 'react';
import { FormError, Modal } from '../../../shared/ui';
import {
  formatCurrencyBRL,
  parseDecimalInput,
  type PdvMixedPaymentMethod,
  type PdvMixedPaymentPart,
  validateMixedPayments
} from '../pdv/pdvCart';

type PdvPagamentoMistoModalProps = {
  open: boolean;
  total: number;
  initialParts: PdvMixedPaymentPart[];
  onClose: () => void;
  onSave: (parts: PdvMixedPaymentPart[]) => void;
};

const MIXED_METHOD_OPTIONS: Array<{ value: PdvMixedPaymentMethod; label: string }> = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
  { value: 'fiado', label: 'Fiado' }
];

export function PdvPagamentoMistoModal({
  open,
  total,
  initialParts,
  onClose,
  onSave
}: PdvPagamentoMistoModalProps) {
  const [parts, setParts] = useState<PdvMixedPaymentPart[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialParts.length > 0) {
      setParts(initialParts);
      return;
    }
    setParts([
      { method: 'dinheiro', amount: total },
      { method: 'pix', amount: 0 }
    ]);
  }, [initialParts, open, total]);

  const validation = useMemo(() => validateMixedPayments(parts, total), [parts, total]);

  function updatePart(index: number, patch: Partial<PdvMixedPaymentPart>) {
    setParts((current) => current.map((part, itemIndex) => (itemIndex === index ? { ...part, ...patch } : part)));
    setError(null);
  }

  function addPart() {
    setParts((current) =>
      current.length >= 3 ? current : [...current, { method: 'pix', amount: 0 }]
    );
  }

  function removePart(index: number) {
    setParts((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setError(null);
  }

  function handleSave() {
    if (!validation.isValid) {
      setError('A soma das formas precisa bater com o total da venda.');
      return;
    }
    onSave(validation.parts);
  }

  return (
    <Modal
      open={open}
      title="Pagamento misto"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-sm" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-p btn-sm" type="button" onClick={handleSave}>
            Confirmar divisão
          </button>
        </>
      }
    >
      <div className="rf-pdv-mixed-summary">
        <span>Total da venda</span>
        <strong>{formatCurrencyBRL(total)}</strong>
      </div>

      <FormError message={error} />

      <div className="rf-pdv-mixed-parts">
        {parts.map((part, index) => (
          <div key={`${part.method}-${index}`} className="rf-pdv-mixed-part">
            <select
              className="inp sel"
              value={part.method}
              onChange={(event) =>
                updatePart(index, { method: event.target.value as PdvMixedPaymentMethod })
              }
            >
              {MIXED_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              className="inp"
              type="text"
              inputMode="decimal"
              value={part.amount ? part.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
              placeholder="0,00"
              onChange={(event) => updatePart(index, { amount: parseDecimalInput(event.target.value) })}
            />

            <button
              className="btn btn-sm"
              type="button"
              onClick={() => removePart(index)}
              disabled={parts.length <= 1}
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="rf-pdv-mixed-actions">
        <button className="btn btn-sm" type="button" onClick={addPart} disabled={parts.length >= 3}>
          + Adicionar forma
        </button>
      </div>

      <div className="rf-pdv-mixed-summary is-foot">
        <span>Somado</span>
        <strong>{formatCurrencyBRL(validation.paid)}</strong>
      </div>
      <div className={`rf-pdv-mixed-diff${validation.isValid ? ' is-valid' : ''}`}>
        {validation.isValid
          ? 'Soma conferida.'
          : `Faltam ${formatCurrencyBRL(Math.abs(validation.difference))} para fechar o total.`}
      </div>
    </Modal>
  );
}
