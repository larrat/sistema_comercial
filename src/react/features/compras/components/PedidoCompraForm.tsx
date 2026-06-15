import { fmtBRL } from '../../../shared/lib/formatters';
import { useState, useMemo } from 'react';
import { X, Search, Check, AlertCircle, Plus, Trash2, Save, Package, FileText, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Shimmer, Badge } from '../../../shared/ui';
import type { PedidoCompraItem, PedidoCompra } from '../services/comprasApi';
import { useQuery } from '@tanstack/react-query';
import { listProdutos } from '../../produtos/services/produtosApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { contratosApi } from '../../contratos/services/contratosApi';
import { parseNFXML } from '../lib/xmlInvoiceParser';
import { useUIStore } from '../../../app/useUIStore';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';

type Props = {
  onSave: (pedido: Partial<PedidoCompra>, itens: PedidoCompraItem[]) => void;
  onClose: () => void;
  filialId: string;
  prefillData?: { fornecedor: string; itens: PedidoCompraItem[] };
};

interface FormItem extends PedidoCompraItem {
  isXmlMatched?: boolean;
  xmlSku?: string;
}

export function PedidoCompraForm({ onSave, onClose, filialId, prefillData }: Props) {
  const { sidebarCollapsed: collapsed } = useUIStore();
  const isMobile = useIsMobile(1024);
  const { resolve } = useApiContext();
  const [fornecedor, setFornecedor] = useState(prefillData?.fornecedor || '');
  const [itens, setItens] = useState<FormItem[]>(prefillData?.itens || []);
  const [formaPgto, setFormaPgto] = useState('Boleto');
  const [tipo, setTipo] = useState<'material_obra' | 'estoque'>('material_obra');
  const [obs, setObs] = useState('');
  const [contratoId, setContratoId] = useState<string | null>(null);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { data: produtos = [], isLoading: isLoadingProdutos } = useQuery({
    queryKey: ['produtos-compras', filialId],
    queryFn: () => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return listProdutos(context);
    },
    enabled: !!filialId
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos-compras-selector', filialId],
    queryFn: () => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return contratosApi.getContratos(context);
    },
    enabled: !!filialId
  });

  const addItem = () => {
    setItens([...itens, { produto_id: '', nome: '', qty: 1, custo_unitario: 0, total_item: 0 }]);
  };

  const updateItem = (index: number, field: keyof FormItem, value: any) => {
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
    
    // Check if there are any unmatched products
    const unmatchedCount = itens.filter(i => i.produto_id === '').length;
    if (unmatchedCount > 0) {
      return toast.error(`Existem ${unmatchedCount} itens sem vínculo no catálogo. Por favor, associe todos os produtos antes de salvar.`);
    }

    const pedido: Partial<PedidoCompra> = {
      id: `PC-${Date.now()}`,
      filial_id: filialId,
      fornecedor_nome: fornecedor,
      total,
      forma_pagamento: formaPgto,
      obs,
      status: 'aberto',
      contrato_id: contratoId
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
        custo_unitario: newItens[idx].custo_unitario || p.custo || 0,
        total_item: newItens[idx].qty * (newItens[idx].custo_unitario || p.custo || 0),
        isXmlMatched: true
      };
      return newItens;
    });
    setActiveItemIdx(null);
    setSearchTerm('');
  };

  const matchProduct = (importedSku: string, importedName: string, importedEan?: string) => {
    const parentIds = new Set(produtos.map(p => p.produto_pai_id).filter(Boolean));
    const sellable = produtos.filter(p => !parentIds.has(p.id));

    // 1. Try match by SKU or barcode/EAN
    let found = sellable.find(p => 
      (p.sku && p.sku.toLowerCase() === importedSku.toLowerCase()) ||
      (importedEan && p.codigo_barras && p.codigo_barras === importedEan) ||
      (p.codigo_fornecedor && p.codigo_fornecedor.toLowerCase() === importedSku.toLowerCase())
    );

    // 2. Try match by name exactly
    if (!found) {
      found = sellable.find(p => 
        p.nome.toLowerCase().trim() === importedName.toLowerCase().trim()
      );
    }

    return found;
  };

  const handleXmlUpload = (file: File) => {
    if (!file.name.endsWith('.xml')) {
      toast.error('Por favor, envie apenas arquivos XML de Notas Fiscais.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target?.result as string;
        const parsed = parseNFXML(xmlText);

        setFornecedor(parsed.nomeEmitente);

        const newItens: FormItem[] = parsed.itens.map(imported => {
          const matched = matchProduct(imported.cProd, imported.xProd, imported.cEAN);
          return {
            produto_id: matched ? matched.id : '',
            nome: matched ? matched.nome : imported.xProd,
            qty: imported.qCom,
            custo_unitario: imported.vUnCom,
            total_item: imported.qCom * imported.vUnCom,
            isXmlMatched: !!matched,
            xmlSku: imported.cProd
          };
        });

        setItens(newItens);

        const matchedCount = newItens.filter(i => i.isXmlMatched).length;
        const unmatchedCount = newItens.length - matchedCount;

        if (unmatchedCount === 0) {
          toast.success(`NF-e importada! Todos os ${matchedCount} itens foram vinculados ao catálogo.`);
        } else {
          toast.warning(
            `NF-e importada com pendências: ${matchedCount} de ${newItens.length} itens vinculados. ` +
            `${unmatchedCount} itens precisam ser associados manualmente.`,
            { duration: 8000 }
          );
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Erro ao processar o arquivo XML.');
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleXmlUpload(file);
    }
  };

  return (
    <div 
      className="fixed bottom-0 right-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 transition-all duration-300"
      style={{ left: isMobile ? 0 : (collapsed ? '80px' : '280px'), top: isMobile ? 0 : '80px' }}
    >
      <Card className={`w-full max-w-4xl max-h-full sm:max-h-[90vh] overflow-hidden flex flex-col bg-surface-card border-white/10 shadow-2xl ${isMobile ? 'h-full rounded-none' : ''}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Pedido de Compra</h2>
            <p className="text-sm font-medium text-slate-400 mt-0.5">Suprimentos e Aquisições</p>
          </div>
          <button onClick={onClose} aria-label="Fechar pedido" className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative p-6 border-2 border-dashed rounded-3xl transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden ${ isDragging ? 'border-teal-400 bg-teal-950/20 shadow-lg shadow-teal-500/10 scale-[1.01]' : 'border-white/10 hover:border-teal-500/30 bg-white/[0.01] hover:bg-white/[0.02]' }`}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-teal-500/5 animate-pulse pointer-events-none" />
            )}

            <div className="flex items-center gap-4 text-left">
              <div className={`p-4 rounded-2xl transition-all duration-300 ${ isDragging ? 'bg-teal-500/20 text-teal-300 scale-110' : 'bg-white/5 text-slate-400 group-hover:text-teal-400 group-hover:bg-teal-500/10' }`}>
                {isDragging ? <UploadCloud size={28} className="animate-bounce" /> : <FileText size={28} />}
              </div>
              <div>
                <h4 className="text-white flex items-center gap-2 text-sm font-medium text-slate-400">
                  Importador Inteligente de Nota Fiscal (XML)
                  <Badge variant="green" className="!py-0 !px-1.5 !text-[8px]">Novo</Badge>
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-md leading-relaxed">
                  Arraste o arquivo XML da NF-e (.xml) ou clique para preencher automaticamente o fornecedor, itens, custos e quantidades.
                </p>
              </div>
            </div>

            <label className="flex-shrink-0 cursor-pointer">
              <input 
                type="file" 
                accept=".xml" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleXmlUpload(file);
                }} 
                className="hidden" 
              />
              <span className="inline-flex items-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-400 rounded-xl transition-all hover:shadow-lg hover:shadow-teal-500/20 active:scale-95 text-sm font-medium text-slate-400">
                Selecionar Arquivo
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-5 rounded-2xl border border-white/5 bg-white/[0.01]">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-400">Tipo de Aquisição</label>
              <select
                name="tipo_compra"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'material_obra' | 'estoque')}
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus-visible:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/50 transition-all appearance-none"
              >
                <option value="material_obra">Material para Obra</option>
                <option value="estoque">Reposição de Estoque</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-400">Fornecedor</label>
              <input 
                type="text" 
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Nome do fornecedor ou razão social"
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
              />
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-400">Forma de Pagamento</label>
              <select 
                value={formaPgto}
                onChange={(e) => setFormaPgto(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus-visible:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/50 transition-all appearance-none"
              >
                <option value="Boleto">Boleto Bancário</option>
                <option value="PIX">PIX</option>
                <option value="Transferencia">Transferência</option>
                <option value="Cartao">Cartão de Crédito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            {tipo === 'material_obra' && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-slate-400">Destinação (Obra/Contrato)</label>
                <select 
                  value={contratoId || ''}
                  onChange={(e) => setContratoId(e.target.value || null)}
                  className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus-visible:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/50 transition-all appearance-none"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} ({c.cliente?.nome || 'Sem nome'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-400">Itens do Pedido</h3>
              <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={addItem}>
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-4 px-4 pb-2 text-xs font-medium text-slate-500">
                <div className="col-span-5">Produto</div>
                <div className="col-span-2 text-center">Qtd</div>
                <div className="col-span-2 text-right">Custo Un.</div>
                <div className="col-span-3 text-right">Total</div>
              </div>

              {itens.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`rounded-2xl border transition-all duration-300 ${ item.isXmlMatched === false ? 'bg-rose-950/10 border-rose-500/20' : 'bg-white/[0.02] border-white/5' }`}
                >
                  {item.isXmlMatched === false && (
                    <div className="px-4 py-1.5 border-b border-rose-500/20 flex items-center gap-2 text-sm font-medium text-slate-400">
                      <AlertCircle size={10} />
                      Não Vinculado ({item.xmlSku || 'S/SKU'}) — Associe um produto abaixo
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
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
                        placeholder="Buscar produto no catálogo…"
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 pl-10 text-xs text-white focus:outline-none focus-visible:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/50"
                      />

                      {activeItemIdx === idx && (
                        <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                          {isLoadingProdutos ? (
                            <div className="p-4 space-y-2"><Shimmer height={12} width="100%" /></div>
                          ) : filteredProdutos.length > 0 ? (
                            filteredProdutos.map(p => (
                              <button
                                key={p.id}
                                onClick={() => selectProduto(idx, p)}
                                className="w-full flex flex-col gap-1.5 p-3 hover:bg-white/5 border-b border-white/5 text-left transition-colors"
                              >
                                <div className="text-xs font-bold text-white">{p.nome}</div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {p.cat && <Badge variant="slate" className="bg-white/5 text-slate-300 border-white/10 text-[9px] px-1.5 py-0 h-4">{p.cat}</Badge>}
                                  {p.qualidade && <Badge variant="slate" className="bg-teal-500/10 text-teal-400 border-teal-500/20 text-[9px] px-1.5 py-0 h-4">{p.qualidade}</Badge>}
                                  {p.genero && (
                                    <Badge variant="slate" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px] capitalize px-1.5 py-0 h-4">
                                      {p.genero === 'masculino' ? 'Masc.' : p.genero === 'feminino' ? 'Fem.' : p.genero}
                                    </Badge>
                                  )}
                                  <span className="text-[9px] text-slate-500 font-mono ml-auto">
                                    {p.sku || 'S/ SKU'}
                                  </span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-[10px] text-slate-500">Nenhum produto encontrado.</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5 text-[10px] text-slate-400 truncate">
                        {item.produto_id ? 'Vínculo: OK' : 'Sem vínculo no catálogo'}
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          value={item.qty}
                          onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                          className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.custo_unitario}
                          onChange={(e) => updateItem(idx, 'custo_unitario', Number(e.target.value))}
                          className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-right text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50"
                        />
                      </div>
                      <div className="col-span-3 flex items-center justify-end gap-3">
                        <span className="text-xs font-medium text-white">
                          {fmtBRL(item.total_item || 0)}
                        </span>
                        <button onClick={() => removeItem(idx)} aria-label="Remover item" className="text-slate-600 hover:text-rose-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
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
          <div className="flex items-center gap-8 w-full md:w-auto">
            <div>
              <span className="text-xs font-medium text-slate-500 block mb-1">Total de Itens</span>
              <span className="text-lg font-black text-slate-300">{itens.reduce((acc, item) => acc + item.qty, 0)} un</span>
            </div>
            <div className="hidden lg:block h-8 w-px bg-white/10" />
            <div>
              <span className="text-xs font-medium text-teal-500 block mb-1">Total Previsto</span>
              <span className="text-2xl font-black text-white">{fmtBRL(total)}</span>
            </div>
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
