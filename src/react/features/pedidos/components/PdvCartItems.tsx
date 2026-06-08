import { EmptyState } from '../../../shared/ui';
import { formatCurrencyBRL, formatQty, parseDecimalInput, roundCurrency } from '../pdv/pdvCart';
import type { PdvCartItem } from '../pdv/pdvCart';

type PdvCartItemsProps = {
  items: PdvCartItem[];
  focusedItemKey: string | null;
  setFocusedItemKey: (key: string) => void;
  incrementItem: (key: string) => void;
  decrementItem: (key: string) => void;
  setItemQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
};

export function PdvCartItems({
  items,
  focusedItemKey,
  setFocusedItemKey,
  incrementItem,
  decrementItem,
  setItemQty,
  removeItem
}: PdvCartItemsProps) {
  return (
    <div className="rf-pdv__cart">
      <div className="rf-pdv__cart-head">
        <span>Produto</span>
        <span>Qtd</span>
        <span>Unit</span>
        <span>Total</span>
        <span />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Carrinho vazio."
          description="Digite um nome, código ou SKU e aperte Enter para acelerar a venda."
          compact
        />
      ) : (
        <div className="rf-pdv__cart-rows">
          {items.map((item) => {
            const subtotal = roundCurrency(item.qty * item.preco);
            const isFocused = item.key === focusedItemKey;
            return (
              <div
                key={item.key}
                className={`rf-pdv__cart-row ${isFocused ? 'is-focused' : ''}`}
                tabIndex={0}
                onFocus={() => setFocusedItemKey(item.key)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    incrementItem(item.key);
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    decrementItem(item.key);
                  } else if (event.key === 'Delete') {
                    event.preventDefault();
                    removeItem(item.key);
                  }
                }}
              >
                <div className="rf-pdv__cart-product">
                  <strong>{item.nome}</strong>
                  <span>{item.code || item.un}</span>
                </div>
                <div className="rf-pdv__qty">
                  <button className="rf-pdv__qty-btn" type="button" onClick={() => decrementItem(item.key)}>
                    −
                  </button>
                  <input
                    className="rf-pdv__qty-input"
                    type="text"
                    inputMode="decimal"
                    value={formatQty(item.qty, item.isWeight)}
                    onChange={(event) => {
                      const next = parseDecimalInput(event.target.value);
                      if (next > 0) setItemQty(item.key, next);
                    }}
                  />
                  <button className="rf-pdv__qty-btn" type="button" onClick={() => incrementItem(item.key)}>
                    +
                  </button>
                </div>
                <div className="rf-pdv__unit">{formatCurrencyBRL(item.preco)}</div>
                <div className="rf-pdv__total">{formatCurrencyBRL(subtotal)}</div>
                <div className="rf-pdv__actions">
                  <button
                    className="rf-pdv__remove-btn"
                    type="button"
                    title="Remover (Delete)"
                    onClick={() => removeItem(item.key)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
