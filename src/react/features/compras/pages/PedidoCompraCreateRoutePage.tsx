import { fmtBRL } from '../../../shared/lib/formatters';
import { useState, useMemo, useDeferredValue } from 'react';
import { Plus, Trash2, Save, Search, Package, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Shimmer, Badge } from '../../../shared/ui';
import type { PedidoCompraItem, PedidoCompra } from '../services/comprasApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listProdutos } from '../../produtos/services/produtosApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { savePedidoCompra } from '../services/comprasApi';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function PedidoCompraCreateRoutePage() {
  const navigate = useNavigate();
  const { resolve, token } = useApiContext();
  const { filialId } = useFilialStore();
  const queryClient = useQueryClient();
  
  const [fornecedor, setFornecedor] = useState('');
  const [itens, setItens] = useState<PedidoCompraItem[]>([]);
  const [formaPgto, setFormaPgto] = useState('Boleto');
  const [obs, setObs] = useState('');
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const { data: produtos = [], isLoading: isLoadingProdutos } = useQuery({
    queryKey: ['produtos-compras', filialId],
    queryFn: () => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return listProdutos(context);
    },
    enabled: !!filialId
  });

  const saveMutation = useMutation({
    mutationFn: ({ pedido, itensPayload }: any) => savePedidoCompra(token!, pedido, itensPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-compra'] });
      toast.success('Pedido salvo com sucesso!');
      navigate('/app/compras');
    },
    onError: () => {
      toast.error('Erro ao salvar pedido.');
    }
  });

  const addItem = () => {
    setItens([...itens, { produto_id: '', nome: '', qty: 1, custo_unitario: 0, total_item: 0 }]);
  };

  const updateItem = (index: number, field: keyof PedidoCompraItem, value: any) => {
    setItens(prev => {
      const newItens = [...prev];
      newItens[index] = { ...newItens[index], [field]: value };
      if (field === 'qty' || field === 'custo_unitario') {
        newItens[index].total_item = newItens[index].qty * newItens[index].custo_unitario;
      }
      return newItens;
    });
  };

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const total = itens.reduce((acc, i) => acc + i.total_item, 0);

  const handleSave = () => {
    if (!fornecedor) return toast.error('Informe o fornecedor');
    if (itens.length === 0) return toast.error('Adicione pelo menos um item');
    
    const pedido: Partial<PedidoCompra> = {
      id: `PC-${Date.now()}`,
      filial_id: filialId!,
      fornecedor_nome: fornecedor,
      total,
      forma_pagamento: formaPgto,
      obs,
      status: 'aberto'
    };
    saveMutation.mutate({ pedido, itensPayload: itens });
  };

  const filteredProdutos = useMemo(() => {
    // Identifica quais IDs são "Pais" (possuem filhos vinculados)
    const parentIds = new Set(produtos.map(p => p.produto_pai_id).filter(Boolean));
    
    // Filtra apenas os que NÃO são pais (filhos ou independentes)
    const sellable = produtos.filter(p => !parentIds.has(p.id));

    if (!deferredSearchTerm) return sellable.slice(0, 50); // Mostra primeiros 50 por padrão

    const low = deferredSearchTerm.toLowerCase();
    return sellable.filter(p => 
      p.nome.toLowerCase().includes(low) || 
      (p.sku && p.sku.toLowerCase().includes(low))
    ).slice(0, 15);
  }, [produtos, deferredSearchTerm]);

  const selectProduto = (idx: number, p: any) => {
    setItens(prev => {
      const newItens = [...prev];
      newItens[idx] = {
        ...newItens[idx],
        produto_id: p.id,
        nome: p.nome,
        custo_unitario: p.custo || 0,
        total_item: newItens[idx].qty * (p.custo || 0)
      };
      return newItens;
    });
    setActiveItemIdx(null);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col h-[100dvh]"
    >
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/app/compras')}
          aria-label="Voltar para a listagem de compras"
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-slate-400 transition-all hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Novo Pedido de Compra</h1>
          <p className="text-slate-500">Crie uma nova ordem de suprimentos e insira os itens.</p>
        </div>
      </div>

      <div className="flex-1 bg-surface-card/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Header Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label htmlFor="fornecedor" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fornecedor</label>
              <div className="relative flex items-center">
                {fornecedor && (
                  <div className="absolute left-4 w-8 h-8 bg-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center font-black text-xs uppercase border border-teal-500/30">
                    {fornecedor.substring(0, 2)}
                  </div>
                )}
                <input 
                  id="fornecedor"
                  name="fornecedor"
                  autoComplete="organization"
                  type="text" 
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  placeholder="Nome do fornecedor ou razão social"
                  className={`w-full bg-black/20 border border-white/5 rounded-2xl py-4 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-lg ${fornecedor ? 'pl-16 pr-5' : 'px-5'}`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="formaPgto" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Forma de Pagamento</label>
              <select 
                id="formaPgto"
                name="forma_pagamento"
                value={formaPgto}
                onChange={(e) => setFormaPgto(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all appearance-none text-lg"
              >
                <option value="Boleto">Boleto Bancário</option>
                <option value="PIX">PIX</option>
                <option value="Transferencia">Transferência Bancária</option>
                <option value="Cartao">Cartão de Crédito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Itens do Pedido</h3>
              <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={addItem} className="!rounded-xl">
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-4">
              {itens.map((item, idx) => (
                <div key={idx} className="relative flex flex-col md:flex-row gap-4 items-end p-6 rounded-3xl bg-white/[0.02] border border-white/5 rf-animate-fade">
                  <div className="flex-1 w-full md:w-auto space-y-2 relative">
                    <label htmlFor={`search-${idx}`} className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Produto / SKU</label>
                    
                    <div className="relative">
                      <input 
                        id={`search-${idx}`}
                        name={`search_${idx}`}
                        autoComplete="off"
                        type="text" 
                        value={activeItemIdx === idx ? searchTerm : item.nome}
                        onChange={(e) => {
                          setActiveItemIdx(idx);
                          setSearchTerm(e.target.value);
                        }}
                        onFocus={() => {
                          setActiveItemIdx(idx);
                          setSearchTerm(item.nome);
                          setHighlightedIndex(-1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlightedIndex(prev => (prev < filteredProdutos.length - 1 ? prev + 1 : prev));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (highlightedIndex >= 0 && filteredProdutos[highlightedIndex]) {
                              selectProduto(idx, filteredProdutos[highlightedIndex]);
                            }
                          } else if (e.key === 'Escape') {
                            setActiveItemIdx(null);
                            setHighlightedIndex(-1);
                          }
                        }}
                        placeholder="Buscar produto pelo nome ou SKU..."
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white pr-10"
                      />
                      <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                    </div>

                    {activeItemIdx === idx && (
                      <div className="absolute top-full left-0 right-0 z-[60] mt-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                        {isLoadingProdutos ? (
                          <div className="p-4 space-y-2">
                            <Shimmer height={12} width="100%" />
                            <Shimmer height={12} width="80%" />
                          </div>
                        ) : filteredProdutos.length > 0 ? (
                          filteredProdutos.map((p, pIndex) => (
                            <button
                              key={p.id}
                              onClick={() => selectProduto(idx, p)}
                              className={`w-full flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors group text-left ${highlightedIndex === pIndex ? 'bg-white/10 border-l-4 !border-l-teal-500' : ''}`}
                            >
                              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center group-hover:border-teal-500/30 transition-colors">
                                 {p.foto_url ? (
                                   <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                                 ) : (
                                   <Package size={18} className="text-slate-600" />
                                 )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 w-full mb-1">
                                  <span className="text-[10px] font-black text-teal-500 uppercase">{p.sku || 'S/SKU'}</span>
                                  {p.produto_pai_id ? (
                                    <Badge variant="neutral" className="!text-[8px] !py-0">Variante</Badge>
                                  ) : (
                                    <Badge variant="emerald" className="!text-[8px] !py-0">Único</Badge>
                                  )}
                                  {p.genero && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">/ {p.genero}</span>}
                                  {p.tamanho && <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">/ TAM: {p.tamanho}</span>}
                                </div>
                                <div className="text-sm font-bold text-white truncate">{p.nome}</div>
                                <div className="text-[10px] text-slate-500 mt-1 font-bold tracking-tight">Custo Atual: {fmtBRL(p.custo || 0)}</div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-6 text-center">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                              {searchTerm ? `Nenhum produto para "${searchTerm}"` : 'Nenhum produto encontrado'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="w-24 space-y-2">
                      <label htmlFor={`qty-${idx}`} className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Qtd</label>
                      <input 
                        id={`qty-${idx}`}
                        name={`qty_${idx}`}
                        type="number" 
                        value={item.qty}
                        onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white"
                      />
                    </div>
                    <div className="flex-1 md:w-36 space-y-2">
                      <label htmlFor={`custo-${idx}`} className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Custo Un.</label>
                      <input 
                        id={`custo-${idx}`}
                        name={`custo_${idx}`}
                        type="number" 
                        value={item.custo_unitario}
                        onChange={(e) => updateItem(idx, 'custo_unitario', Number(e.target.value))}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white"
                      />
                    </div>
                    <div className="flex-1 md:w-36 space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total</label>
                      <div className="w-full bg-white/5 border border-transparent rounded-xl px-4 py-3 text-sm font-black text-teal-400">
                        {fmtBRL(item.total_item || 0)}
                      </div>
                    </div>
                    <div className="pb-1">
                      <button aria-label="Remover item" onClick={() => removeItem(idx)} className="p-3 bg-white/5 rounded-xl text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 transition-colors h-[46px] flex items-center justify-center">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {itens.length === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                  <p className="text-sm text-slate-500 font-bold tracking-tight">Nenhum item adicionado ao pedido.</p>
                  <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={addItem} className="mt-4 !rounded-xl mx-auto">
                    Começar a inserir
                  </Button>
                </div>
              )}
            </div>
            
            <div className="pt-6">
              <label htmlFor="obs" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Observações Adicionais</label>
              <textarea 
                id="obs"
                name="observacoes"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Observações do pedido, previsão de entrega, transportadora..."
                className="w-full bg-black/20 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-sm h-24 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-8 border-t border-white/5 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total do Pedido</span>
            <span className="text-3xl font-black text-white tracking-tight">
              {fmtBRL(total)}
            </span>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-4">
            <Button variant="secondary" className="flex-1 sm:flex-none !py-4 !px-6 !rounded-2xl" onClick={() => navigate('/app/compras')}>Cancelar</Button>
            <Button variant="primary" className="flex-1 sm:flex-none !py-4 !px-8 !rounded-2xl text-base" leftIcon={<Save size={20} />} onClick={handleSave} loading={saveMutation.isPending}>
              Salvar Pedido de Compra
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
