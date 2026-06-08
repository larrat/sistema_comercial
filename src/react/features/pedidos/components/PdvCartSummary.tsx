import { Button } from '../../../shared/ui';
import { formatCurrencyBRL } from '../pdv/pdvCart';

type PdvCartSummaryProps = {
  totals: {
    subtotal: number;
    discountValue: number;
  };
  appliedVale: { codigo: string; valor: number } | null;
  finalTotal: number;
  onOpenDiscountModal: () => void;
  onOpenCancelConfirm: () => void;
};

export function PdvCartSummary({
  totals,
  appliedVale,
  finalTotal,
  onOpenDiscountModal,
  onOpenCancelConfirm
}: PdvCartSummaryProps) {
  return (
    <footer className="rf-pdv__cart-foot">
      <div className="rf-pdv__cart-summary">
        <div className="rf-pdv__summary-row">
          <span>Subtotal</span>
          <strong>{formatCurrencyBRL(totals.subtotal)}</strong>
        </div>
        {totals.discountValue > 0 ? (
          <div className="rf-pdv__summary-row is-discount">
            <span>Desconto</span>
            <strong>− {formatCurrencyBRL(totals.discountValue)}</strong>
          </div>
        ) : null}
        {appliedVale && (
          <div className="rf-pdv__summary-row text-teal-400 font-bold">
            <span>Vale-Troca ({appliedVale.codigo})</span>
            <strong>− {formatCurrencyBRL(appliedVale.valor)}</strong>
          </div>
        )}
        <div className="rf-pdv__summary-row is-total border-t border-white/5 pt-1.5">
          <span>Total a Pagar</span>
          <strong className="text-gold-premium font-mono text-2xl tracking-tight">{formatCurrencyBRL(finalTotal)}</strong>
        </div>
      </div>
      <div className="rf-pdv__cart-actions">
        <Button variant="secondary" onClick={onOpenDiscountModal}>
          Desconto (F7)
        </Button>
        <Button variant="secondary" onClick={onOpenCancelConfirm}>
          Cancelar (Esc)
        </Button>
      </div>
    </footer>
  );
}
