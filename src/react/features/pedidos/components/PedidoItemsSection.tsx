import type { Produto, PedidoItem } from '../../../../types/domain';
import { PedidoItemAdd } from './PedidoItemAdd';
import { PedidoItemRow } from './PedidoItemRow';

type Props = {
  itens: PedidoItem[];
  produtos: Produto[];
  tipo: string;
  readOnly?: boolean;
  onAdd?: (item: PedidoItem) => void;
  onRemove?: (index: number) => void;
};

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PedidoItemsSection({ itens, produtos, tipo, readOnly, onAdd, onRemove }: Props) {
  const total = itens.reduce((a, i) => a + i.qty * i.preco, 0);
  const lucroTotal = itens.reduce((a, i) => a + (i.preco - i.custo) * i.qty, 0);

  return (
    <div data-testid="pedido-items-section">
      <div className="div" />
      <div className="ct">Itens do pedido</div>

      {!readOnly && onAdd && <PedidoItemAdd produtos={produtos} tipo={tipo} onAdd={onAdd} />}

      {itens.length === 0 ? (
        <div className="empty-inline">Nenhum item.</div>
      ) : (
        <>
          <div className="tw ped-items-wrap">
            <table className="tbl ped-items-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Origem</th>
                  <th>Qtd</th>
                  <th>Custo</th>
                  <th>Preço</th>
                  <th>Subtotal</th>
                  <th>Lucro</th>
                  <th>Margem</th>
                  {!readOnly && <th />}
                </tr>
              </thead>
              <tbody>
                {itens.map((item, i) => (
                  <PedidoItemRow
                    key={i}
                    item={item}
                    index={i}
                    readOnly={readOnly}
                    onRemove={onRemove}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel ped-total-panel">
            <div className="fb">
              <span className="ped-total-label">Total do pedido</span>
              <span className="ped-total-value">
                {fmtCurrency(total)} | Lucro {fmtCurrency(lucroTotal)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
