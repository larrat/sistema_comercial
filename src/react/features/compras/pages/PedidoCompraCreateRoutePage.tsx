import { fmtBRL } from '../../../shared/lib/formatters';
import { useState, useMemo, useDeferredValue } from 'react';
import { Plus, Trash2, Save, Search, Package, ArrowLeft, Info, Tag, Ruler, CheckCircle2, AlertTriangle, FileText, UploadCloud } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Shimmer, Badge } from '../../../shared/ui';
import type { PedidoCompraItem, PedidoCompra } from '../services/comprasApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listProdutos } from '../../produtos/services/produtosApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { savePedidoCompra, vincularNotaImportada, importarXMLCompra } from '../services/comprasApi';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { Produto } from '../../../../types/domain';
import { parseNFXML, type ParsedDuplicata } from '../lib/xmlInvoiceParser';

interface FormItem extends PedidoCompraItem {
  isXmlMatched?: boolean;
  xmlSku?: string;
  foto_url?: string | null;
  un?: string;
  ipi?: number;
  impostos_recuperaveis?: number;
  frete?: number;
}

export function PedidoCompraCreateRoutePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillFromState = location.state?.prefillData;

  const { resolve, token } = useApiContext();
  const { filialId } = useFilialStore();
  const queryClient = useQueryClient();
  
  const [fornecedor, setFornecedor] = useState(prefillFromState?.fornecedor || '');
  const [itens, setItens] = useState<FormItem[]>(prefillFromState?.itens || []);
  const [formaPgto, setFormaPgto] = useState('Boleto');
  const [obs, setObs] = useState('');
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedProductPreview, setSelectedProductPreview] = useState<Produto | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // New states for phase 2.2 ingestion
  const [parsedDuplicatas, setParsedDuplicatas] = useState<ParsedDuplicata[]>([]);
  const [isXmlImport, setIsXmlImport] = useState(false);

  const { data: produtos = [], isLoading: isLoadingProdutos } = useQuery({
    queryKey: ['produtos', 'compras', filialId],
    queryFn: () => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return listProdutos(context);
    },
    enabled: !!filialId
  });

  const saveMutation = useMutation({
    mutationFn: async ({ pedido, itensPayload }: any) => {
      // 1. Save standard header & items
      const savedPedido = await savePedidoCompra(token!, pedido, itensPayload);
      
      // 2. If it is an XML import, trigger backend transational RPCs (Kardex and AP Provisioning)
      if (isXmlImport && filialId) {
        const isAVista = ['dinheiro', 'pix', 'debito'].includes(formaPgto.toLowerCase());
        
        // Prepare mapped items for backend format
        const mappedItens = itensPayload.map((i: FormItem) => ({
          produto_id: i.produto_id,
          qty: i.qty,
          custo_unitario: i.custo_unitario,
          ipi: i.ipi || 0,
          frete: i.frete || 0,
          impostos_recuperaveis: i.impostos_recuperaveis || 0
        }));

        await importarXMLCompra(
          token!,
          filialId,
          savedPedido.id,
          fornecedor,
          mappedItens,
          parsedDuplicatas,
          isAVista
        );
      }

      return savedPedido;
    },
    onSuccess: async (savedPedido) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-compra'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      
      // Se veio de uma nota destinada importada da SEFAZ, vinculamos a nota ao pedido
      if (prefillFromState?.notaId) {
        try {
          await vincularNotaImportada(token!, prefillFromState.notaId, savedPedido.id);
          queryClient.invalidateQueries({ queryKey: ['nfe-destinadas'] });
          toast.success('Pedido, Financeiro e Estoque cadastrados com sucesso!');
        } catch (err) {
          console.error(err);
          toast.error('Pedido salvo, mas falhou ao vincular nota fiscal destinada.');
        }
      } else {
        toast.success('Integração transacional concluída. Estoque e financeiro atualizados!');
      }

      navigate('/app/compras');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar pedido transacionalmente.');
    }
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
    if (selectedProductPreview && activeItemIdx === index) {
      setSelectedProductPreview(null);
    }
  };

  const total = itens.reduce((acc, i) => acc + i.total_item, 0);

  const handleSave = () => {
    if (!fornecedor) return toast.error('Informe o fornecedor');
    if (itens.length === 0) return toast.error('Adicione pelo menos um item');
    const unmatchedCount = itens.filter(i => i.produto_id === '').length;
    if (unmatchedCount > 0) {
      return toast.error(`Existem ${unmatchedCount} itens sem vínculo no catálogo. Por favor, associe todos os produtos antes de salvar.`);
    }
    const pedido: Partial<PedidoCompra> = {
      id: `PC-${Date.now()}`,
      filial_id: filialId!,
      fornecedor_nome: fornecedor,
      total,
      forma_pagamento: formaPgto,
      obs,
      status: 'aberto' // O RPC do backend não se importa com isso, mas para registro
    };
    saveMutation.mutate({ pedido, itensPayload: itens });
  };

  const sellableProdutos = useMemo(() => {
    const parentIds = new Set(produtos.map(p => p.produto_pai_id).filter(Boolean));
    return produtos.filter(p => !parentIds.has(p.id));
  }, [produtos]);

  const filteredProdutos = useMemo(() => {
    if (!deferredSearchTerm) return sellableProdutos.slice(0, 50);
    const low = deferredSearchTerm.toLowerCase();
    return sellableProdutos.filter(p =>
      p.nome.toLowerCase().includes(low) ||
      (p.sku && p.sku.toLowerCase().includes(low)) ||
      (p.cat && p.cat.toLowerCase().includes(low))
    ).slice(0, 20);
  }, [sellableProdutos, deferredSearchTerm]);

  const selectProduto = (idx: number, p: Produto) => {
    setItens(prev => {
      const newItens = [...prev];
      newItens[idx] = {
        ...newItens[idx],
        produto_id: p.id,
        nome: p.nome,
        custo_unitario: p.custo || 0,
        total_item: newItens[idx].qty * (p.custo || 0),
        isXmlMatched: true,
        foto_url: p.foto_url,
        un: p.un
      };
      return newItens;
    });
    setSelectedProductPreview(p);
    setActiveItemIdx(null);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const matchProduct = (importedSku: string, importedName: string, importedEan?: string) => {
    let found = sellableProdutos.find(p =>
      (p.sku && p.sku.toLowerCase() === importedSku.toLowerCase()) ||
      (importedEan && p.codigo_barras && p.codigo_barras === importedEan) ||
      (p.codigo_fornecedor && p.codigo_fornecedor.toLowerCase() === importedSku.toLowerCase())
    );
    if (!found) {
      found = sellableProdutos.find(p => p.nome.toLowerCase().trim() === importedName.toLowerCase().trim());
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
        setParsedDuplicatas(parsed.duplicatas || []);
        setIsXmlImport(true);

        const newItens: FormItem[] = parsed.itens.map(imported => {
          const matched = matchProduct(imported.cProd, imported.xProd, imported.cEAN);
          return {
            produto_id: matched ? matched.id : '',
            nome: matched ? matched.nome : imported.xProd,
            qty: imported.qCom,
            custo_unitario: imported.vUnCom,
            total_item: imported.qCom * imported.vUnCom,
            isXmlMatched: !!matched,
            xmlSku: imported.cProd,
            foto_url: matched?.foto_url,
            un: matched?.un,
            ipi: imported.vIPI || 0,
            frete: 0,
            impostos_recuperaveis: 0
          };
        });
        setItens(newItens);
        const matchedCount = newItens.filter(i => i.isXmlMatched).length;
        const unmatchedCount = newItens.length - matchedCount;
        if (unmatchedCount === 0) {
          toast.success(`NF-e importada! Todos os ${matchedCount} itens foram vinculados.`);
        } else {
          toast.warning(`NF-e importada: ${matchedCount}/${newItens.length} itens vinculados. ${unmatchedCount} precisam de associação manual.`, { duration: 8000 });
        }
      } catch (err: any) {
        toast.error(err.message || 'Erro ao processar o arquivo XML.');
      }
    };
    reader.readAsText(file);
  };

  const unmatchedCount = itens.filter(i => i.produto_id === '').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full h-[calc(100dvh-theme(spacing.16))] flex flex-col gap-0 overflow-hidden"
    >
      {/* ─── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/5 bg-black/20 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/compras')}
            aria-label="Voltar"
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-slate-400 transition-all hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">Novo Pedido de Compra</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {itens.length > 0
                ? `${itens.length} ${itens.length === 1 ? 'item' : 'itens'} · Total: ${fmtBRL(total)}`
                : 'Adicione os itens do pedido'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* XML Import */}
          <label
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all
              ${isDragging
                ? 'bg-teal-500/20 border-teal-400 text-teal-300'
                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleXmlUpload(file);
            }}
          >
            <input type="file" accept=".xml" className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleXmlUpload(file);
            }} />
            {isDragging ? <UploadCloud size={14} className="animate-bounce" /> : <FileText size={14} />}
            Importar NF-e (XML)
          </label>

          <Button
            variant="secondary"
            className="!rounded-xl !py-2.5"
            onClick={() => navigate('/app/compras')}
          >
            Cancelar
          </Button>

          <Button
            variant="primary"
            leftIcon={<Save size={16} />}
            className="!rounded-xl !py-2.5"
            onClick={handleSave}
            loading={saveMutation.isPending}
            disabled={itens.length === 0 || !fornecedor}
          >
            Salvar Pedido
          </Button>
        </div>
      </div>

      {/* ─── Warnings ───────────────────────────────────────────────────────────── */}
      {unmatchedCount > 0 && (
        <div className="px-6 py-2.5 bg-rose-950/30 border-b border-rose-500/20 flex items-center gap-2 text-rose-400 text-xs font-bold flex-shrink-0">
          <AlertTriangle size={14} />
          {unmatchedCount} {unmatchedCount === 1 ? 'item não vinculado ao catálogo' : 'itens não vinculados ao catálogo'} — associe antes de salvar
        </div>
      )}

      {/* ─── Body: 2-column layout ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT: Form (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fornecedor *</label>
              <input
                type="text"
                value={fornecedor}
                onChange={e => setFornecedor(e.target.value)}
                placeholder="Nome do fornecedor ou razão social"
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Forma de Pagamento</label>
              <select
                value={formaPgto}
                onChange={e => setFormaPgto(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all appearance-none"
              >
                <option value="Boleto">Boleto Bancário</option>
                <option value="PIX">PIX</option>
                <option value="Transferencia">Transferência Bancária</option>
                <option value="Cartao">Cartão de Crédito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Observações</label>
              <input
                type="text"
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Prazo de entrega, transportadora..."
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Itens do Pedido {itens.length > 0 && <span className="text-teal-400">({itens.length})</span>}
              </h3>
              <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={addItem} className="!rounded-xl">
                Adicionar Item
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {itens.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`relative rounded-2xl border transition-all duration-200 ${
                    item.isXmlMatched === false
                      ? 'bg-rose-950/10 border-rose-500/20'
                      : activeItemIdx === idx || selectedProductPreview?.id === item.produto_id
                        ? 'bg-teal-950/10 border-teal-500/20'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  {item.isXmlMatched === false && (
                    <div className="absolute -top-2.5 left-4 flex items-center gap-1.5 bg-[#0f172a] text-rose-400 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-rose-500/30">
                      <AlertTriangle size={8} />
                      Não vinculado {item.xmlSku ? `(SKU: ${item.xmlSku})` : ''} — Associe um produto
                    </div>
                  )}

                  <div className="p-4 sm:p-5 flex flex-col gap-4">
                    {/* Top Row: Thumbnail + Search + Delete */}
                    <div className="flex gap-4 items-start">
                      {/* Thumbnail */}
                      <div
                        className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl bg-slate-800/80 border border-white/5 overflow-hidden flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                        onClick={() => {
                          if (item.produto_id) {
                            const prod = sellableProdutos.find(p => p.id === item.produto_id);
                            if (prod) setSelectedProductPreview(prod);
                          }
                        }}
                        title="Ver detalhes do produto"
                      >
                        {item.foto_url ? (
                          <img src={item.foto_url} alt={item.nome} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-slate-600" />
                        )}
                      </div>

                      {/* Product Search */}
                      <div className="flex-1 min-w-0 relative">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Produto / SKU</label>
                        <div className="relative">
                          <input
                            type="text"
                            autoComplete="off"
                            value={activeItemIdx === idx ? searchTerm : item.nome}
                            onChange={e => {
                              setActiveItemIdx(idx);
                              setSearchTerm(e.target.value);
                            }}
                            onFocus={() => {
                              setActiveItemIdx(idx);
                              setSearchTerm(item.nome);
                              setHighlightedIndex(-1);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(prev => Math.min(prev + 1, filteredProdutos.length - 1)); }
                              else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => Math.max(prev - 1, 0)); }
                              else if (e.key === 'Enter') { e.preventDefault(); if (highlightedIndex >= 0 && filteredProdutos[highlightedIndex]) selectProduto(idx, filteredProdutos[highlightedIndex]); }
                              else if (e.key === 'Escape') { setActiveItemIdx(null); setHighlightedIndex(-1); }
                            }}
                            placeholder="Buscar por nome, SKU ou categoria..."
                            className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-sm text-white pr-10 focus:outline-none transition-all ${
                              item.isXmlMatched === false
                                ? 'border-rose-500/30 focus:border-rose-400/60'
                                : 'border-white/5 focus:border-teal-500/50'
                            }`}
                          />
                          {item.produto_id
                            ? <CheckCircle2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-400" />
                            : <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                          }
                        </div>

                        {/* Dropdown */}
                        {activeItemIdx === idx && (
                          <div className="absolute top-full left-0 z-[60] mt-1.5 w-full bg-[#0a1628] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                            {isLoadingProdutos ? (
                              <div className="p-4 space-y-2">
                                <Shimmer height={12} width="100%" />
                                <Shimmer height={12} width="70%" />
                              </div>
                            ) : filteredProdutos.length > 0 ? (
                              <>
                                <div className="px-3 pt-3 pb-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-black/20">
                                  {filteredProdutos.length} {filteredProdutos.length === 1 ? 'resultado' : 'resultados'}
                                </div>
                                {filteredProdutos.map((p, pIndex) => (
                                  <button
                                    key={p.id}
                                    onClick={() => selectProduto(idx, p)}
                                    onMouseEnter={() => setSelectedProductPreview(p)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors text-left ${
                                      highlightedIndex === pIndex ? 'bg-teal-500/10 border-l-2 border-l-teal-500' : 'border-l-2 border-l-transparent'
                                    }`}
                                  >
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                      {p.foto_url
                                        ? <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                                        : <Package size={14} className="text-slate-600" />
                                      }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                        <span className="text-[9px] font-black text-teal-400 uppercase tracking-wider">{p.sku || 'S/SKU'}</span>
                                        {p.cat && <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">· {p.cat}</span>}
                                        {p.qualidade && <span className="text-[8px] text-teal-500/80 font-bold uppercase tracking-wider">· {p.qualidade}</span>}
                                        {p.genero && (
                                          <span className="text-[8px] text-indigo-400/80 font-bold uppercase tracking-wider">
                                            · {p.genero === 'masculino' ? 'Masc' : p.genero === 'feminino' ? 'Fem' : p.genero}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs font-bold text-white line-clamp-1">{p.nome}</div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] text-emerald-400 font-bold">Custo: {fmtBRL(p.custo || 0)}</span>
                                        <span className="text-[9px] text-slate-600">· {p.un}</span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </>
                            ) : (
                              <div className="p-6 text-center">
                                <p className="text-xs text-slate-500 font-bold">
                                  {searchTerm ? `Nenhum produto para "${searchTerm}"` : 'Nenhum produto encontrado'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Remove */}
                      <div className="flex-shrink-0 pt-6">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          aria-label="Remover item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Metrics */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 sm:pl-[72px]">
                      {/* Qty */}
                      <div className="w-full sm:w-24 flex-shrink-0">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Qtd</label>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.qty}
                          onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-sm font-bold text-white text-center focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all"
                        />
                      </div>

                      {/* Cost */}
                      <div className="w-full sm:w-32 flex-shrink-0">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Custo Un.</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-black">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.custo_unitario}
                            onChange={e => updateItem(idx, 'custo_unitario', Number(e.target.value))}
                            className="w-full bg-black/40 border border-white/5 rounded-xl pl-8 pr-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all"
                          />
                        </div>
                      </div>

                      {/* Total */}
                      <div className="w-full sm:w-auto sm:flex-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Total Item</label>
                        <div className="w-full bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-2.5 text-sm font-black text-teal-400">
                          {fmtBRL(item.total_item || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {itens.length === 0 && (
              <div
                className="py-14 border-2 border-dashed border-white/5 rounded-2xl text-center cursor-pointer hover:border-teal-500/20 transition-all group"
                onClick={addItem}
              >
                <Package size={32} className="text-slate-700 mx-auto mb-3 group-hover:text-teal-600 transition-colors" />
                <p className="text-sm text-slate-500 font-bold">Nenhum item no pedido</p>
                <p className="text-xs text-slate-600 mt-1">Clique aqui ou em "Adicionar Item" para começar</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Product Detail Panel + Order Summary (sticky) */}
        <div className="w-80 xl:w-96 flex-shrink-0 border-l border-white/5 bg-black/20 flex flex-col overflow-hidden">

          {/* Product Preview Panel */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <AnimatePresence mode="wait">
              {selectedProductPreview ? (
                <motion.div
                  key={selectedProductPreview.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Info size={10} />
                    Ficha do Produto
                  </div>

                  {/* Product Image */}
                  <div className="w-full aspect-square rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden flex items-center justify-center">
                    {selectedProductPreview.foto_url ? (
                      <img
                        src={selectedProductPreview.foto_url}
                        alt={selectedProductPreview.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-700">
                        <Package size={48} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Sem Foto</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-sm font-black text-white leading-tight">{selectedProductPreview.nome}</h3>
                      {selectedProductPreview.sku && (
                        <p className="text-[10px] text-teal-500 font-black uppercase mt-0.5">SKU: {selectedProductPreview.sku}</p>
                      )}
                    </div>

                    {/* Meta tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProductPreview.cat && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[9px] font-black uppercase">
                          <Tag size={8} />
                          {selectedProductPreview.cat}
                        </span>
                      )}
                      {selectedProductPreview.un && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded-full text-[9px] font-black uppercase">
                          <Ruler size={8} />
                          {selectedProductPreview.un}
                        </span>
                      )}
                      {selectedProductPreview.genero && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-full text-[9px] font-black uppercase">
                          {selectedProductPreview.genero}
                        </span>
                      )}
                      {selectedProductPreview.tamanho && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[9px] font-black uppercase">
                          TAM {selectedProductPreview.tamanho}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {selectedProductPreview.descricao_padrao && (
                      <p className="text-[11px] text-slate-400 leading-relaxed bg-white/[0.02] rounded-xl px-3 py-2.5 border border-white/5">
                        {selectedProductPreview.descricao_padrao}
                      </p>
                    )}

                    {/* Financial details */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Custo Cadastrado</div>
                        <div className="text-sm font-black text-emerald-400">{fmtBRL(selectedProductPreview.custo || 0)}</div>
                      </div>
                      {selectedProductPreview.emin != null && (
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Estoque Mínimo</div>
                          <div className="text-sm font-black text-amber-400">
                            {selectedProductPreview.emin} {selectedProductPreview.un}
                          </div>
                        </div>
                      )}
                      {selectedProductPreview.pvv != null && selectedProductPreview.pvv > 0 && (
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Preço Varejo</div>
                          <div className="text-sm font-black text-slate-300">{fmtBRL(selectedProductPreview.pvv || 0)}</div>
                        </div>
                      )}
                      {selectedProductPreview.codigo_barras && (
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Cód. Barras</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{selectedProductPreview.codigo_barras}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full py-16 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
                    <Package size={28} className="text-slate-700" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">Nenhum produto selecionado</p>
                  <p className="text-[10px] text-slate-700 mt-1 max-w-[180px] leading-relaxed">
                    Passe o mouse sobre um resultado ou clique na foto de um item para ver os detalhes
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Footer */}
          <div className="border-t border-white/5 bg-black/30 p-5 space-y-3 flex-shrink-0">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumo do Pedido</div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Itens</span>
                <span className="text-white font-bold">{itens.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Não vinculados</span>
                <span className={unmatchedCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-600 font-bold'}>{unmatchedCount}</span>
              </div>
              <div className="h-px bg-white/5 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-xl font-black text-white">{fmtBRL(total)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              leftIcon={<Save size={16} />}
              className="w-full !rounded-xl"
              onClick={handleSave}
              loading={saveMutation.isPending}
              disabled={itens.length === 0 || !fornecedor}
            >
              Salvar Pedido de Compra
            </Button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
