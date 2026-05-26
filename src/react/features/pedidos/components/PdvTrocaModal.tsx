import { useState } from 'react';
import type { Pedido, PedidoItem } from '../../../../types/domain';
import { registrarDevolucaoCompleta } from '../services/pedidosApi';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { LucideX, LucideSave, RefreshCw, Copy, CheckCircle2, Ticket } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
  pedido: Pedido;
};

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PdvTrocaModal({ open, onClose, pedido }: Props) {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [valeGerado, setValeGerado] = useState<{ codigo: string; valor: number } | null>(null);

  if (!open) return null;

  // Parse items safely
  const parseItens = (): PedidoItem[] => {
    if (Array.isArray(pedido.itens)) return pedido.itens as PedidoItem[];
    try {
      const parsed = JSON.parse(pedido.itens as string);
      return Array.isArray(parsed) ? (parsed as PedidoItem[]) : [];
    } catch {
      return [];
    }
  };

  const itens = parseItens();

  // Handle increment/decrement
  const updateQty = (prodId: string, delta: number, max: number) => {
    const current = quantities[prodId] || 0;
    const next = Math.max(0, Math.min(max, current + delta));
    setQuantities({ ...quantities, [prodId]: next });
  };

  // Calculate return total
  const selectedTotal = Object.entries(quantities).reduce((acc, [prodId, qty]) => {
    const item = itens.find(i => i.prodId === prodId);
    if (!item) return acc;
    return acc + (item.preco || 0) * qty;
  }, 0);

  const totalItemsCount = Object.values(quantities).reduce((acc, qty) => acc + qty, 0);

  const handleConfirm = async () => {
    if (totalItemsCount === 0) {
      toast.error('Selecione pelo menos um item para devolução');
      return;
    }

    setLoading(true);
    try {
      const cfg = getSupabaseConfig();
      const ctx = {
        url: cfg.url,
        key: cfg.key,
        token: session?.access_token ?? '',
        filialId: filialId ?? ''
      };

      const itensDevolver = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([prodId, qty]) => {
          const item = itens.find(i => i.prodId === prodId);
          return {
            produtoId: prodId,
            quantidade: qty,
            valorUnitario: item?.preco || 0
          };
        });

      const res = await registrarDevolucaoCompleta(ctx, {
        pedidoId: pedido.id,
        clienteId: pedido.cliente_id || null,
        valorTotalCredito: selectedTotal,
        itens: itensDevolver
      });

      setValeGerado({
        codigo: res.valeCodigo,
        valor: res.valeValor
      });
      toast.success('Devolução registrada e Vale-Troca emitido!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao processar troca/devolução');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!valeGerado) return;
    navigator.clipboard.writeText(valeGerado.codigo);
    toast.success('Código copiado para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-5 bg-white/[0.02]">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <RefreshCw size={18} className="text-teal-400 animate-spin-slow" />
              Troca & Devolução de Mercadorias
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Ref: Pedido #{pedido.num || pedido.id.substring(0, 8)}
            </p>
          </div>
          <button 
            disabled={loading}
            onClick={onClose} 
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LucideX className="h-5 w-5" />
          </button>
        </div>

        {valeGerado ? (
          /* Success Screen with Voucher Code */
          <div className="p-6 text-center space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-400" />
            </div>
            
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Estorno Concluído com Sucesso!</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                As peças selecionadas retornaram ao estoque de vendas da filial. Um vale-troca exclusivo foi emitido para abatimento em compras futuras.
              </p>
            </div>

            {/* Premium Voucher Card Layout */}
            <div className="relative mx-auto max-w-sm rounded-2xl border-2 border-dashed border-teal-500/30 bg-teal-950/10 p-6 shadow-lg shadow-teal-900/5 overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Ticket size={120} className="text-teal-400" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="text-[9px] font-black uppercase tracking-widest text-teal-400 bg-teal-500/10 border border-teal-500/25 px-2.5 py-1 rounded-full w-max mx-auto">
                  CUPOM CRÉDITO LOJA
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Código de Resgate</div>
                  <div className="font-mono text-2xl font-black text-white tracking-widest select-all uppercase">
                    {valeGerado.codigo}
                  </div>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor do Crédito</div>
                  <div className="text-2xl font-black text-teal-400">{fmtCurrency(valeGerado.valor)}</div>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="mx-auto flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-xs font-bold text-teal-400 hover:bg-teal-500/20 active:scale-[0.98] transition-all"
                >
                  <Copy size={14} />
                  Copiar Código
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs font-black uppercase tracking-wider text-white transition-all active:scale-[0.98]"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        ) : (
          /* Selection Screen */
          <div className="p-6 space-y-6">
            
            <div className="text-xs text-slate-400 leading-relaxed font-medium">
              Indique a quantidade de cada peça do pedido original que está sendo devolvida. O sistema ajustará o estoque das variantes automaticamente ao concluir.
            </div>

            <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3">
              {itens.map(item => {
                const selectedQty = quantities[item.prodId] || 0;
                const max = item.qty || 1;
                return (
                  <div 
                    key={item.item_id || item.prodId} 
                    className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                      selectedQty > 0 
                        ? 'border-teal-500/40 bg-teal-500/[0.02]' 
                        : 'border-white/5 bg-white/[0.01]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black text-slate-500 uppercase">REF: #{item.prodId.substring(0, 8)}</div>
                      <div className="font-bold text-white text-xs truncate mt-0.5">{item.nome}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1">
                        Preço unitário: {fmtCurrency(item.preco || 0)} • Comprado: {item.qty} un
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateQty(item.prodId, -1, max)}
                        disabled={selectedQty === 0}
                        className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 hover:border-teal-500/30 text-white flex items-center justify-center disabled:opacity-30 transition-all font-black text-sm"
                      >
                        -
                      </button>
                      <span className={`w-6 text-center text-xs font-black ${selectedQty > 0 ? 'text-teal-400' : 'text-slate-500'}`}>
                        {selectedQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.prodId, 1, max)}
                        disabled={selectedQty >= max}
                        className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 hover:border-teal-500/30 text-white flex items-center justify-center disabled:opacity-30 transition-all font-black text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Summary */}
            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 flex items-center justify-between text-xs font-bold">
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[10px]">Total Devolvido</div>
                <div className="text-white text-sm font-black mt-0.5">{totalItemsCount} peças selecionadas</div>
              </div>
              <div className="text-right">
                <div className="text-slate-500 uppercase tracking-wider text-[10px]">Crédito a Emitir</div>
                <div className="text-teal-400 text-base font-black mt-0.5">{fmtCurrency(selectedTotal)}</div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-3 justify-end border-t border-white/5 pt-5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || totalItemsCount === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-[0.98] disabled:opacity-40 transition-all"
              >
                <LucideSave className="h-4 w-4" />
                {loading ? 'Confirmando...' : 'Confirmar Devolução'}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
