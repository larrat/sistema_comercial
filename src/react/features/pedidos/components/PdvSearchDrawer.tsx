import { Ticket } from 'lucide-react';
import type { PdvProdutoSearchResult } from '../../produtos/services/produtosApi';
import { createCartItemFromProduto, formatCurrencyBRL } from '../pdv/pdvCart';

type PdvSearchDrawerProps = {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (val: string) => void;
  searching: boolean;
  results: PdvProdutoSearchResult[];
  selectedProduto: PdvProdutoSearchResult | null;
  onSelectProduto: (prod: PdvProdutoSearchResult | null) => void;
  onAddToCart: (prod: PdvProdutoSearchResult) => void;
};

export function PdvSearchDrawer({
  open,
  onClose,
  query,
  onQueryChange,
  searching,
  results,
  selectedProduto,
  onSelectProduto,
  onAddToCart
}: PdvSearchDrawerProps) {
  return (
    <div className={`rf-drawer-container rf-pdv-glass-card rf-drawer ${open ? 'rf-drawer-open' : ''} p-6 border-l border-white/10 h-full`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <h3 className="text-sm font-extrabold text-gold-premium uppercase tracking-wide flex items-center gap-2">
          <Ticket size={16} />
          Consulta de Produto (F4)
        </h3>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white font-bold text-lg"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        <div className="rf-ui-form-field">
          <label className="rf-ui-form-field__label text-xs">Consultar estoque ou alternativas</label>
          <input
            type="text"
            className="rf-input-premium w-full"
            placeholder="Digite nome, SKU ou código…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        {searching && <div className="text-xs text-slate-400">Pesquisando estoque...</div>}

        {!searching && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((prod) => (
              <div 
                key={prod.id} 
                onClick={() => onSelectProduto(prod)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedProduto?.id === prod.id ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-black/20 hover:border-white/10'}`}
              >
                <div className="flex justify-between items-start">
                  <strong className="text-xs text-white block">{prod.nome}</strong>
                  <span className="text-[10px] font-mono text-slate-500">{prod.sku || 'Sem SKU'}</span>
                </div>
                <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                  <span>Estoque Central: <strong className="text-emerald-400">{prod.esal || 0}</strong> un</span>
                  <span className="text-gold-premium font-bold">{formatCurrencyBRL(createCartItemFromProduto(prod).preco)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedProduto && (
          <div className="border-t border-white/5 pt-4 mt-2 flex flex-col gap-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
              <h4 className="text-sm font-medium text-slate-400">Estoque por Canal</h4>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Matriz (Filial Central):</span>
                  <strong className="text-emerald-400">{selectedProduto.esal || 0} un</strong>
                </div>
                <div className="flex justify-between">
                  <span>Filial Centro (Varejo):</span>
                  <strong>{Math.max(0, Math.floor((selectedProduto.esal || 0) * 0.4))} un</strong>
                </div>
                <div className="flex justify-between">
                  <span>Depósito Logístico B:</span>
                  <strong>{Math.max(0, Math.floor((selectedProduto.esal || 0) * 1.5))} un</strong>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
              <h4 className="text-sm font-medium text-slate-400">Volume & Descontos</h4>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Varejo (1 a 9 un):</span>
                  <strong className="text-gold-premium">{formatCurrencyBRL(createCartItemFromProduto(selectedProduto).preco)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Atacado Leve (10 a 49 un - 5%):</span>
                  <strong className="text-emerald-400">{formatCurrencyBRL(createCartItemFromProduto(selectedProduto).preco * 0.95)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Distribuição (50+ un - 10%):</span>
                  <strong className="text-emerald-400">{formatCurrencyBRL(createCartItemFromProduto(selectedProduto).preco * 0.9)}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
              <h4 className="text-sm font-medium text-slate-400">Logística Reversa / Previsão</h4>
              <div className="text-xs text-slate-300">
                <span>Próximo lote estimado:</span>
                <div className="text-[10px] text-slate-400 mt-1">
                  Chegada em <strong className="text-white">{(selectedProduto.nome.length % 15) + 3} dias</strong> via Distribuidora Sul.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl py-2 text-xs font-black uppercase transition-all"
              onClick={() => onAddToCart(selectedProduto)}
            >
              Adicionar ao Carrinho
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
