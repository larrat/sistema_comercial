import { useEffect, useRef, useState } from 'react';
import type { ContaReceber } from '../../../../types/domain';
import { Button, Input, Modal, ErrorState } from '../../../shared/ui';
import { getValorEmAberto, getValorRecebido } from '../hooks/useContasReceberMutations';
import { fmt, toDateTimeLocalValue, fromDateTimeLocalValue } from './ContasReceberUtils';

export type BaixaParcialModalProps = {
  conta: ContaReceber;
  onConfirmar: (valor: number, recebidoEmIso: string, observacao: string | null) => void;
  onCancelar: () => void;
  error: string | null;
  submitting: boolean;
};

export function BaixaParcialModal({
  conta,
  onConfirmar,
  onCancelar,
  error,
  submitting
}: BaixaParcialModalProps) {
  const aberto = getValorEmAberto(conta);
  const [valor, setValor] = useState(String(aberto));
  const [data, setData] = useState(toDateTimeLocalValue());
  const [obs, setObs] = useState('');
  const valorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    valorRef.current?.focus();
    valorRef.current?.select();
  }, []);

  function handleConfirmar() {
    const v = Number(valor);
    const iso = fromDateTimeLocalValue(data);
    const observacao = obs.trim() || null;
    onConfirmar(v, iso, observacao);
  }

  function applySuggestedAmount(percent: number) {
    const nextValue = percent >= 1 ? aberto : Number((aberto * percent).toFixed(2));
    setValor(String(nextValue));
  }

  return (
    <Modal
      open
      title={`Registrar baixa — ${conta.cliente}${conta.pedido_num ? ` (#${conta.pedido_num})` : ''}`}
      onClose={onCancelar}
      closeOnOverlay={!submitting}
      footer={
        <>
          <Button size="sm" onClick={onCancelar} disabled={submitting}>
            Cancelar
          </Button>
          <Button size="sm" variant="primary" onClick={handleConfirmar} loading={submitting}>
            Confirmar baixa
          </Button>
        </>
      }
    >
      <div className="rf-section-card mb-4">
        <div className="rf-ui-form-section__head">
          <div>
            <div className="rf-ui-form-section__title">Resumo da conta</div>
            <p className="rf-ui-form-section__description">
              Use o valor real recebido. O saldo restante continua aberto automaticamente.
            </p>
          </div>
        </div>
        <div className="form-summary-grid">
          <div className="form-summary-item">
            <span className="table-cell-caption table-cell-muted">Total</span>
            <strong>{fmt(conta.valor)}</strong>
          </div>
          <div className="form-summary-item">
            <span className="table-cell-caption table-cell-muted">Recebido</span>
            <strong>{fmt(getValorRecebido(conta))}</strong>
          </div>
          <div className="form-summary-item">
            <span className="table-cell-caption table-cell-muted">Em aberto</span>
            <strong>{fmt(aberto)}</strong>
          </div>
        </div>
      </div>

      {error ? <ErrorState title={error} compact /> : null}

      <div className="flex flex-col gap-4">
        <Input
          ref={valorRef as any}
          label="Valor recebido"
          type="number"
          step="0.01"
          min="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={() => applySuggestedAmount(0.25)}>
            25%
          </Button>
          <Button type="button" size="sm" onClick={() => applySuggestedAmount(0.5)}>
            50%
          </Button>
          <Button type="button" size="sm" onClick={() => applySuggestedAmount(1)}>
            Quitar saldo
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Input
          label="Data / hora"
          type="datetime-local"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <Input
          label="Observação (opcional)"
          placeholder="Ex: Pix, transferência…"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </div>
    </Modal>
  );
}
