import { createCartItemFromProduto, formatCurrencyBRL } from '../pdv/pdvCart';
import type { PdvProdutoSearchResult } from '../../produtos/services/produtosApi';

type PdvCartGridProps = {
  products: PdvProdutoSearchResult[];
  onAddProduct: (prod: PdvProdutoSearchResult) => void;
};

export function PdvCartGrid({ products, onAddProduct }: PdvCartGridProps) {
  return (
    <div className="rf-pdv-catalog-grid scrollbar-hide">
      {products.map((p) => (
        <div
          key={p.id}
          onClick={() => onAddProduct(p)}
          className="rf-pdv-catalog-card rf-pdv-btn-premium cursor-pointer"
        >
          <div className="flex flex-col gap-1.5">
            <strong className="text-xs text-white line-clamp-2">{p.nome}</strong>
            <span className="text-[10px] text-slate-500 font-mono">{p.sku || 'Sem SKU'}</span>
          </div>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
            <strong className="text-gold-premium text-xs">{formatCurrencyBRL(createCartItemFromProduto(p).preco)}</strong>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black">
              {p.esal || 0} un
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
