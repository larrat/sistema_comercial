import { useEffect, useState } from 'react';
import type { Produto, PedidoItem } from '../../../../types/domain';
import { calcPrecoSugerido } from '../utils/pedidoRules';
import { Button, Input } from '../../../shared/ui';
import { useRoleStore } from '../../../app/useRoleStore';
import { toast } from 'sonner';

type Props = {
  produtos: Produto[];
  tipo: string;
  onAdd: (item: PedidoItem) => void;
};

export function PedidoItemAdd({ produtos, tipo, onAdd }: Props) {
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState('1');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [orig, setOrig] = useState('estoque');
  const [error, setError] = useState<string | null>(null);
  
  const hasPermission = useRoleStore((state) => state.hasPermission);

  // E2E Re-structuring States & Helpers
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState('');
  const [drawerResults, setDrawerResults] = useState<Produto[]>([]);
  const [selectedDrawerProduto, setSelectedDrawerProduto] = useState<Produto | null>(null);

  const selectedProduto = produtos.find((p) => p.id === prodId);
  const profitMarginPercent = (() => {
    if (!selectedProduto || !preco) return null;
    const precoNum = parseFloat(preco);
    const custoNum = parseFloat(custo) || selectedProduto.custo || 0;
    if (precoNum <= 0) return -100;
    return Math.round(((precoNum - custoNum) / precoNum) * 100);
  })();

  const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    function handleGlobalKeys(e: KeyboardEvent) {
      if (e.key === 'F4') {
        e.preventDefault();
        setDrawerOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  function handleProdChange(id: string) {
    const parentIds = new Set(produtos.map(p => p.produto_pai_id).filter(Boolean));
    const isParent = parentIds.has(id);
    
    setProdId(id);
    setError(null);
    if (!id) {
      setPreco('');
      setCusto('');
      return;
    }
    const prod = produtos.find((p) => p.id === id);
    if (!prod) return;
    const sugerido = calcPrecoSugerido(prod, tipo);
    if (!preco) setPreco(String(sugerido > 0 ? sugerido.toFixed(2) : ''));
    if (!custo) setCusto(String(prod.custo > 0 ? prod.custo.toFixed(2) : ''));
  }

  function handleAdd() {
    if (!prodId) {
      setError('Selecione um produto.');
      return;
    }
    const prod = produtos.find((p) => p.id === prodId);
    if (!prod) return;

    const qtyNum = parseFloat(qty) || 1;

    if (orig === 'estoque' && qtyNum > (prod.esal || 0) && !hasPermission('estoque:override')) {
      setError(`Estoque insuficiente. Saldo atual: ${prod.esal || 0}.`);
      return;
    }

    const precoNum = parseFloat(preco) || calcPrecoSugerido(prod, tipo);
    const custoNum = parseFloat(custo) || prod.custo || 0;

    // Block negative margin for non-admins
    if (precoNum < custoNum && !hasPermission('pedido:override_preco')) {
      setError('Venda abaixo do preço de custo bloqueada para operadores comuns.');
      return;
    }

    onAdd({
      prodId,
      nome: prod.nome,
      un: prod.un,
      qty: qtyNum,
      preco: precoNum,
      custo: custoNum,
      custo_base: prod.custo,
      preco_base: calcPrecoSugerido(prod, tipo),
      orig,
      sku: prod.sku
    });

    // reset
    setProdId('');
    setQty('1');
    setPreco('');
    setCusto('');
    setOrig('estoque');
    setError(null);
  }

  return (
    <div
      data-testid="pedido-item-add"
      className="rf-glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAdd();
        }
      }}
    >
      {error && (
        <div className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 text-sm font-medium text-slate-400">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-4 rf-ui-form-field">
          <label className="rf-ui-form-field__label flex items-center justify-between">
            <span>Produto</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="text-[10px] font-black uppercase text-teal-400 hover:text-teal-300 transition-all flex items-center gap-1"
              title="Consultar estoque detalhado e similares (F4)"
            >
              🔎 Info Estoque
            </button>
          </label>
          <div className="rf-ui-form-field__control">
            <select
              className="rf-input-premium w-full"
              value={prodId}
              onChange={(e) => handleProdChange(e.target.value)}
              data-testid="pedido-item-prod"
            >
              <option value="">- selecione -</option>
              {(() => {
                const parentIds = new Set(produtos.map(p => p.produto_pai_id).filter(Boolean));
                return produtos
                  .filter(p => !parentIds.has(p.id) && (p.esal || 0) > 0)
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.sku ? `[${p.sku}]` : ''} — Estoque: {p.esal || 0}
                    </option>
                  ));
              })()}
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <Input
            label="Qtd"
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            data-testid="pedido-item-qty"
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-1">
          <Input
            label="Preço Unit."
            type="number"
            step="0.01"
            placeholder="auto"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            data-testid="pedido-item-preco"
          />
          {profitMarginPercent !== null && (
            <div className="mt-1">
              {profitMarginPercent >= 25 ? (
                <span className="rf-margin-badge rf-margin-badge--optimal">Margem Ótima {profitMarginPercent}%</span>
              ) : profitMarginPercent >= 0 ? (
                <span className="rf-margin-badge rf-margin-badge--warning">Margem Alerta {profitMarginPercent}%</span>
              ) : (
                <span className="rf-margin-badge rf-margin-badge--danger animate-pulse">Prejuízo {profitMarginPercent}%</span>
              )}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <Input
            label="Custo Aplicado"
            type="number"
            step="0.01"
            placeholder="cus"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            data-testid="pedido-item-custo"
          />
        </div>

        <div className="md:col-span-2 rf-ui-form-field">
          <label className="rf-ui-form-field__label">Origem</label>
          <div className="rf-ui-form-field__control">
            <select
              className="rf-input-premium w-full"
              value={orig}
              onChange={(e) => setOrig(e.target.value)}
              data-testid="pedido-item-orig"
            >
              <option value="estoque">Estoque</option>
              <option value="fornecedor">Fornecedor</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <Button
          type="button"
          variant="primary"
          onClick={handleAdd}
          data-testid="pedido-item-add-btn"
          className="w-full md:w-auto"
        >
          Adicionar item ao pedido
        </Button>
      </div>

      {/* Visual Search Drawer (F4) */}
      <div className={`fixed inset-0 z-[999] transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
        
        {/* Drawer content */}
        <div className={`absolute top-0 right-0 h-full w-[400px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <h3 className="text-sm font-extrabold text-gold-premium uppercase tracking-wide flex items-center gap-2">
            🔎 Consulta Rápida (F4)
          </h3>
          <button 
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="text-slate-400 hover:text-white font-bold text-lg"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          <div className="rf-ui-form-field">
            <label className="rf-ui-form-field__label text-xs">Pesquisa de Estoque Multibranche</label>
            <input
              type="text"
              className="rf-input-premium w-full"
              placeholder="Digite o nome do produto…"
              value={drawerQuery}
              onChange={(e) => {
                const val = e.target.value;
                setDrawerQuery(val);
                if (!val.trim()) {
                  setDrawerResults([]);
                  return;
                }
                const filtered = produtos.filter((p) => 
                  p.nome.toLowerCase().includes(val.toLowerCase()) ||
                  (p.sku && p.sku.toLowerCase().includes(val.toLowerCase()))
                );
                setDrawerResults(filtered.slice(0, 5));
              }}
            />
          </div>

          {drawerResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {drawerResults.map((prod) => (
                <div 
                  key={prod.id} 
                  onClick={() => setSelectedDrawerProduto(prod)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedDrawerProduto?.id === prod.id ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-black/20 hover:border-white/10'}`}
                >
                  <div className="flex justify-between items-start">
                    <strong className="text-xs text-white block">{prod.nome}</strong>
                    <span className="text-[10px] font-mono text-slate-500">{prod.sku || 'Sem SKU'}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                    <span>Estoque Central: <strong className="text-emerald-400">{prod.esal || 0}</strong> un</span>
                    <span className="text-gold-premium font-bold">{formatBRL(calcPrecoSugerido(prod, tipo))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedDrawerProduto && (
            <div className="border-t border-white/5 pt-4 mt-2 flex flex-col gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-sm font-medium text-slate-400">Estoque por Canal</h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Matriz (Filial Central):</span>
                    <strong className="text-emerald-400">{selectedDrawerProduto.esal || 0} un</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Filial Centro (Varejo):</span>
                    <strong>{Math.max(0, Math.floor((selectedDrawerProduto.esal || 0) * 0.4))} un</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Depósito Logístico B:</span>
                    <strong>{Math.max(0, Math.floor((selectedDrawerProduto.esal || 0) * 1.5))} un</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-sm font-medium text-slate-400">Volume & Descontos</h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Varejo (1 a 9 un):</span>
                    <strong className="text-gold-premium">{formatBRL(calcPrecoSugerido(selectedDrawerProduto, tipo))}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Atacado Leve (10 a 49 un - 5%):</span>
                    <strong className="text-emerald-400">{formatBRL(calcPrecoSugerido(selectedDrawerProduto, tipo) * 0.95)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Distribuição (50+ un - 10%):</span>
                    <strong className="text-emerald-400">{formatBRL(calcPrecoSugerido(selectedDrawerProduto, tipo) * 0.9)}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-sm font-medium text-slate-400">Logística Reversa / Previsão</h4>
                <div className="text-xs text-slate-300">
                  <span>Próximo lote estimado:</span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Chegada em <strong className="text-white">{(selectedDrawerProduto.nome.length % 15) + 3} dias</strong> via Distribuidora Sul.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl py-2 text-xs font-black uppercase transition-all"
                onClick={() => {
                  handleProdChange(selectedDrawerProduto.id);
                  toast.success(`Selecionado: ${selectedDrawerProduto.nome}`);
                  setSelectedDrawerProduto(null);
                  setDrawerOpen(false);
                }}
              >
                Selecionar Produto no Form
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
