import type { Produto, PedidoItem } from '../../../../types/domain';
import {
  calculatePedidoLucroTotal,
  calculatePedidoTotal,
  formatPedidoCurrency
} from '../utils/pedidoRules';
import { PedidoItemAdd } from './PedidoItemAdd';
import { PedidoItemRow } from './PedidoItemRow';
import { Badge } from '../../../shared/ui';

type Props = {
  itens: PedidoItem[];
  produtos: Produto[];
  tipo: string;
  readOnly?: boolean;
  custoFrete?: number;
  outrosCustos?: number;
  onAdd?: (item: PedidoItem) => void;
  onRemove?: (index: number) => void;
};

export function PedidoItemsSection({ itens, produtos, tipo, readOnly, custoFrete = 0, outrosCustos = 0, onAdd, onRemove }: Props) {
  const total = calculatePedidoTotal(itens);
  const lucroItens = calculatePedidoLucroTotal(itens);
  const lucroTotal = lucroItens - custoFrete - outrosCustos;

  return (
    <div data-testid="pedido-items-section" className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-base font-bold text-slate-900 m-0 text-white">Itens do pedido</h3>
        <Badge variant="slate">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</Badge>
      </div>

      {!readOnly && onAdd && <PedidoItemAdd produtos={produtos} tipo={tipo} onAdd={onAdd} />}

      {itens.length === 0 ? (
        <div className="empty-inline">Nenhum item.</div>
      ) : (
        <>
          <div className="rf-ui-data-table !bg-transparent border border-white/5 rounded-xl overflow-hidden">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="!bg-slate-900/50">Produto</th>
                  <th className="!bg-slate-900/50">Origem</th>
                  <th className="!bg-slate-900/50">Qtd</th>
                  <th className="!bg-slate-900/50">Custo</th>
                  <th className="!bg-slate-900/50">Preço</th>
                  <th className="!bg-slate-900/50 text-right">Subtotal</th>
                  <th className="!bg-slate-900/50 text-right">Lucro</th>
                  {!readOnly && <th className="!bg-slate-900/50" />}
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
          <div className="rf-glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
            {(custoFrete > 0 || outrosCustos > 0) && (
              <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
                <span className="text-sm font-medium text-slate-400">Custos Adicionais</span>
                <div className="flex gap-4">
                  {custoFrete > 0 && <span className="text-sm text-slate-300">Frete: {formatPedidoCurrency(custoFrete)}</span>}
                  {outrosCustos > 0 && <span className="text-sm text-slate-300">Outros: {formatPedidoCurrency(outrosCustos)}</span>}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-400">Resumo Financeiro</span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-white">{formatPedidoCurrency(total)}</span>
                  <Badge variant="green">Lucro Líquido {formatPedidoCurrency(lucroTotal)}</Badge>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
