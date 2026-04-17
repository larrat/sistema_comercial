import type { PedidoItem } from '../../../../types/domain';

type Props = {
  item: PedidoItem;
  index: number;
  readOnly?: boolean;
  onRemove?: (index: number) => void;
};

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PedidoItemRow({ item, index, readOnly, onRemove }: Props) {
  const subtotal = item.qty * item.preco;
  const lucro = (item.preco - item.custo) * item.qty;
  const margem = item.preco > 0 ? ((item.preco - item.custo) / item.preco) * 100 : 0;

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
      <td className="table-cell-muted">{fmtCurrency(item.custo)}</td>
      <td>{fmtCurrency(item.preco)}</td>
      <td className="table-cell-strong">{fmtCurrency(subtotal)}</td>
      <td
        className={`table-cell-strong ${lucro >= 0 ? 'table-cell-success' : 'table-cell-danger'}`}
      >
        {fmtCurrency(lucro)}
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
