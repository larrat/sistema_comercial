import { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { Button, Card } from '../../../shared/ui';
import type { PedidoCompraItem, PedidoCompra } from '../services/comprasApi';

type Props = {
  onSave: (pedido: Partial<PedidoCompra>, itens: PedidoCompraItem[]) => void;
  onClose: () => void;
  filialId: string;
};

export function PedidoCompraForm({ onSave, onClose, filialId }: Props) {
  const [fornecedor, setFornecedor] = useState('');
  const [itens, setItens] = useState<PedidoCompraItem[]>([]);
  const [formaPgto, setFormaPgto] = useState('Boleto');
  const [obs, setObs] = useState('');

  const addItem = () => {
    setItens([...itens, { produto_id: '', nome: '', qty: 1, custo_unitario: 0, total_item: 0 }]);
  };

  const updateItem = (index: number, field: keyof PedidoCompraItem, value: any) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    if (field === 'qty' || field === 'custo_unitario') {
      newItens[index].total_item = newItens[index].qty * newItens[index].custo_unitario;
    }
    setItens(newItens);
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
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Forma de Pagamento</label>
              <select 
                value={formaPgto}
                onChange={(e) => setFormaPgto(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none"
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
                <div key={idx} className="flex gap-4 items-end p-4 rounded-2xl bg-white/[0.02] border border-white/5 rf-animate-fade">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Produto</label>
                    <input 
                      type="text" 
                      value={item.nome}
                      onChange={(e) => updateItem(idx, 'nome', e.target.value)}
                      placeholder="Nome do produto"
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="w-24 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Qtd</label>
                    <input 
                      type="number" 
                      value={item.qty}
                      onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="w-32 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Custo Un.</label>
                    <input 
                      type="number" 
                      value={item.custo_unitario}
                      onChange={(e) => updateItem(idx, 'custo_unitario', Number(e.target.value))}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="w-32 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Total</label>
                    <div className="w-full bg-white/5 border border-transparent rounded-lg px-3 py-2 text-xs font-bold text-cyan-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_item)}
                    </div>
                  </div>
                  <button onClick={() => removeItem(idx)} className="p-2.5 text-slate-600 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
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
