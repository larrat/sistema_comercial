import type { PedidoItem } from '../../../../types/domain';
import {
  calculatePedidoItemLucro,
  calculatePedidoItemSubtotal,
  formatPedidoCurrency
} from '../utils/pedidoRules';
import { Button, Badge } from '../../../shared/ui';

type Props = {
  item: PedidoItem;
  index: number;
  readOnly?: boolean;
  onRemove?: (index: number) => void;
};

export function PedidoItemRow({ item, index, readOnly, onRemove }: Props) {
  const subtotal = calculatePedidoItemSubtotal(item);
  const lucro = calculatePedidoItemLucro(item);

  return (
    <tr data-testid={`pedido-item-row-${index}`}>
      <td className="!py-4">
        <div className="font-bold text-white">{item.nome}</div>
        <div className="text-sm font-medium text-slate-400">{item.sku || 'SEM SKU'}</div>
      </td>
      <td>
        <Badge variant={item.orig === 'estoque' ? 'green' : 'cyan'}>
          {item.orig === 'estoque' ? 'Estoque' : 'Fornecedor'}
        </Badge>
      </td>
      <td className="text-slate-300 font-medium">
        {item.qty} {item.un}
      </td>
      <td className="text-slate-500 text-xs">{formatPedidoCurrency(item.custo)}</td>
      <td className="text-slate-300 font-medium">{formatPedidoCurrency(item.preco)}</td>
      <td className="text-right font-black text-white">{formatPedidoCurrency(subtotal)}</td>
      <td
        className={`text-right font-bold${lucro >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
      >
        {formatPedidoCurrency(lucro)}
      </td>
      {!readOnly && (
        <td className="text-right">
          <Button
            size="sm"
            variant="secondary"
            className="!p-2"
            onClick={() => onRemove?.(index)}
            data-testid={`pedido-item-remove-${index}`}
          >
            ×
          </Button>
        </td>
      )}
    </tr>
  );
}
