import type { PedidoItem } from '../../../../types/domain';
import {
  calculatePedidoItemLucro,
  calculatePedidoItemMargem,
  calculatePedidoItemSubtotal,
  formatPedidoCurrency
} from '../utils/pedidoRules';

type Props = {
  item: PedidoItem;
  index: number;
  readOnly?: boolean;
  onRemove?: (index: number) => void;
};

export function PedidoItemRow({ item, index, readOnly, onRemove }: Props) {
  const subtotal = calculatePedidoItemSubtotal(item);
  const lucro = calculatePedidoItemLucro(item);
  const margem = calculatePedidoItemMargem(item);

  return (
    <tr data-testid={`pedido-item-row-${index}`}>
      <td className="table-cell-strong">{item.nome}</td>
      <td>
        <span className={`bdg ${item.orig === 'estoque' ? 'bg' : 'bb'}`}>
          {item.orig === 'estoque' ? 'Estoque' : 'Fornecedor'}
        </span>
      </td>
      <td>
        {item.qty} {item.un}
      </td>
      <td className="table-cell-muted">{formatPedidoCurrency(item.custo)}</td>
      <td>{formatPedidoCurrency(item.preco)}</td>
      <td className="table-cell-strong">{formatPedidoCurrency(subtotal)}</td>
      <td
        className={`table-cell-strong ${lucro >= 0 ? 'table-cell-success' : 'table-cell-danger'}`}
      >
        {formatPedidoCurrency(lucro)}
      </td>
      <td className="table-cell-strong">{margem.toFixed(1)}%</td>
      {!readOnly && (
        <td>
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => onRemove?.(index)}
            data-testid={`pedido-item-remove-${index}`}
          >
            Excluir
          </button>
        </td>
      )}
    </tr>
  );
}
