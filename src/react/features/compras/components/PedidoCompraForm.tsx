import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Save, Search, Package } from 'lucide-react';
import { Button, Card, Shimmer, Badge } from '../../../shared/ui';
import type { PedidoCompraItem, PedidoCompra } from '../services/comprasApi';
import { useQuery } from '@tanstack/react-query';
import { listProdutos } from '../../produtos/services/produtosApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';

type Props = {
  onSave: (pedido: Partial<PedidoCompra>, itens: PedidoCompraItem[]) => void;
  onClose: () => void;
  filialId: string;
};

export function PedidoCompraForm({ onSave, onClose, filialId }: Props) {
  const { resolve } = useApiContext();
  const [fornecedor, setFornecedor] = useState('');
  const [itens, setItens] = useState<PedidoCompraItem[]>([]);
  const [formaPgto, setFormaPgto] = useState('Boleto');
  const [obs, setObs] = useState('');
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: produtos = [], isLoading: isLoadingProdutos } = useQuery({
    queryKey: ['produtos-compras', filialId],
    queryFn: () => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return listProdutos(context);
    },
    enabled: !!filialId
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
    if (!fornecedor) return alert('Informe o fornecedor');
    if (itens.length === 0) return alert('Adicione pelo menos um item');
    
    const pedido: Partial<PedidoCompra> = {
      id: `PC-${Date.now()}`,
      filial_id: filialId,
      fornecedor_nome: fornecedor,
      total,
      forma_pagamento: formaPgto,
      obs,
      status: 'aberto'
    };
    onSave(pedido, itens);
  };

  const filteredProdutos = useMemo(() => {
    // Identifica quais IDs são "Pais" (possuem filhos vinculados)
    const parentIds = new Set(produtos.map(p => p.produto_pai_id).filter(Boolean));
    
    // Filtra apenas os que NÃO são pais (filhos ou independentes)
    const sellable = produtos.filter(p => !parentIds.has(p.id));

    if (!searchTerm) return sellable;
    const low = searchTerm.toLowerCase();
    return sellable.filter(p => 
      p.nome.toLowerCase().includes(low) || 
      (p.sku && p.sku.toLowerCase().includes(low))
    );
  }, [produtos, searchTerm]);

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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-surface-card border-white/10 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Novo Pedido de Compra</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fornecedor</label>
              <input 
                type="text" 
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Nome do fornecedor ou razão social"
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Forma de Pagamento</label>
              <select 
                value={formaPgto}
                onChange={(e) => setFormaPgto(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 transition-all appearance-none"
              >
                <option value="Boleto">Boleto Bancário</option>
                <option value="PIX">PIX</option>
                <option value="Transferencia">Transferência</option>
                <option value="Cartao">Cartão de Crédito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Itens do Pedido</h3>
              <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={addItem}>
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-3">
              {itens.map((item, idx) => (
                <div key={idx} className="relative flex gap-4 items-end p-4 rounded-2xl bg-white/[0.02] border border-white/5 rf-animate-fade">
                  <div className="flex-1 space-y-1.5 relative">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Produto</label>
                    
                    <div className="relative">
                      <input 
                        type="text" 
                        value={activeItemIdx === idx ? searchTerm : item.nome}
                        onChange={(e) => {
                          setActiveItemIdx(idx);
                          setSearchTerm(e.target.value);
                        }}
                        onFocus={() => {
                          setActiveItemIdx(idx);
                          setSearchTerm(item.nome);
                        }}
                        placeholder="Buscar produto..."
                        className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-white pr-8"
                      />
                      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    </div>

                    {activeItemIdx === idx && (
                      <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                        {isLoadingProdutos ? (
                          <div className="p-4 space-y-2">
                            <Shimmer height={12} width="100%" />
                            <Shimmer height={12} width="80%" />
                          </div>
                        ) : filteredProdutos.length > 0 ? (
                          filteredProdutos.map(p => (
                            <button
                              key={p.id}
                              onClick={() => selectProduto(idx, p)}
                              className="w-full flex items-center gap-4 p-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors group text-left"
                            >
                              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center group-hover:border-teal-500/30 transition-colors">
                                 {p.foto_url ? (
                                   <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                                 ) : (
                                   <Package size={18} className="text-slate-600" />
                                 )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 w-full mb-0.5">
                                  <span className="text-[10px] font-black text-teal-500 uppercase">{p.sku || 'S/SKU'}</span>
                                  {p.produto_pai_id ? (
                                    <Badge variant="neutral" className="!text-[8px] !py-0">Variante</Badge>
                                  ) : (
                                    <Badge variant="emerald" className="!text-[8px] !py-0">Único</Badge>
                                  )}
                                  {p.genero && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">/ {p.genero}</span>}
                                  {p.tamanho && <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">/ TAM: {p.tamanho}</span>}
                                </div>
                                <div className="text-xs font-bold text-white truncate">{p.nome}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 font-bold tracking-tight">Custo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.custo || 0)}</div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                              {searchTerm ? `Nenhum produto para "${searchTerm}"` : 'Nenhum produto encontrado'}
                            </p>
                            {!produtos.length && !isLoadingProdutos && (
                              <p className="text-[8px] text-rose-400 mt-2 font-black uppercase tracking-tighter">Erro na conexão ou banco vazio</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-24 space-y-1.5 self-start pt-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Qtd</label>
                    <input 
                      type="number" 
                      value={item.qty}
                      onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="w-32 space-y-1.5 self-start pt-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Custo Un.</label>
                    <input 
                      type="number" 
                      value={item.custo_unitario}
                      onChange={(e) => updateItem(idx, 'custo_unitario', Number(e.target.value))}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="w-32 space-y-1.5 self-start pt-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Total</label>
                    <div className="w-full bg-white/5 border border-transparent rounded-lg px-3 py-2 text-xs font-bold text-teal-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_item || 0)}
                    </div>
                  </div>
                  <div className="pb-1.5">
                    <button onClick={() => removeItem(idx)} className="p-2.5 text-slate-600 hover:text-rose-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {itens.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl">
                  <p className="text-xs text-slate-500 font-medium">Nenhum item adicionado ao pedido.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total do Pedido</span>
            <span className="text-2xl font-black text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" leftIcon={<Save size={18} />} onClick={handleSave}>Salvar Pedido</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
