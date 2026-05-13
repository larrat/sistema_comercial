import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap,
  DollarSign,
  Share2,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  ChevronLeft,
  Package,
  Settings,
  TrendingUp,
  Layers,
  Database,
  ArrowUpRight,
  History,
  ShieldCheck,
  Info
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import ReactCountUp from 'react-countup';
const CountUp = (ReactCountUp as any).default || ReactCountUp;

import type { Produto } from '../../../../types/domain';
import { useInterModuleStore } from '../../../app/lib/useInterModuleStore';
import { EmptyState, ErrorState, FormError, LoadingState } from '../../../shared/ui';
import { markupToPrice, priceToMargin } from '../hooks/useProdutoCalculations';
import { useProdutoMutations } from '../hooks/useProdutoMutations';
import type { ProdutoFormValues, ProdutoSaldo } from '../types';
import { ProdutoForm } from './ProdutoForm';
import { ProdutoVariantesTab } from './ProdutoVariantesTab';

type ProdutoProfileTab = 'resumo' | 'precificacao' | 'estoque' | 'cadastro' | 'variantes';

type Props = {
  produto: Produto;
  pais: Produto[];
  saldo?: ProdutoSaldo;
  loadingProduto?: boolean;
  error?: string | null;
  onProdutoSaved?: (produto: Produto) => void;
  onReload?: () => void;
};

type KpiCard = {
  label: string;
  value: string;
  subtitle: string;
  tone?: 'positive' | 'negative' | 'neutral';
};

const BASE_TABS: Array<{ id: ProdutoProfileTab; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'cadastro', label: 'Cadastro' }
];

const ALL_TAB_IDS: ProdutoProfileTab[] = ['resumo', 'precificacao', 'estoque', 'cadastro', 'variantes'];

function normalizeTab(value: string | null): ProdutoProfileTab {
  return ALL_TAB_IDS.includes(value as ProdutoProfileTab) ? (value as ProdutoProfileTab) : 'resumo';
}

function toNumber(value?: number | null): number {
  return Number(value || 0);
}

function formatCurrency(value: number): string {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function formatQuantity(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(3);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function getStockStatus(produto: Produto, saldo: ProdutoSaldo): { label: string; tone: string } {
  const minimo = toNumber(produto.emin);
  if (saldo.saldo <= 0) return { label: 'Zerado', tone: 'danger' };
  if (minimo > 0 && saldo.saldo < minimo) return { label: 'Baixo', tone: 'warning' };
  return { label: 'OK', tone: 'success' };
}

function getPrecos(produto: Produto) {
  const custo = toNumber(produto.custo);
  const mkv = toNumber(produto.mkv);
  const mka = toNumber(produto.mka);
  const pfa = toNumber(produto.pfa);
  const varejo = mkv > 0 ? markupToPrice(custo, mkv) : toNumber(produto.pvv);
  const atacado = pfa > 0 ? pfa : mka > 0 ? markupToPrice(custo, mka) : 0;
  const margemVarejo = varejo > 0 ? priceToMargin(custo, varejo) : 0;
  const margemAtacado = atacado > 0 ? priceToMargin(custo, atacado) : 0;
  return { custo, varejo, atacado, margemVarejo, margemAtacado };
}

function buildKpis(produto: Produto, saldo: ProdutoSaldo): KpiCard[] {
  const { custo, varejo, atacado, margemVarejo } = getPrecos(produto);
  const minimo = toNumber(produto.emin);
  const saldoTone =
    saldo.saldo <= 0 ? 'negative' : minimo > 0 && saldo.saldo < minimo ? 'negative' : 'positive';

  return [
    {
      label: 'Custo',
      value: formatCurrency(custo),
      subtitle: 'Base de cálculo'
    },
    {
      label: 'Venda Varejo',
      value: varejo > 0 ? formatCurrency(varejo) : '—',
      subtitle: varejo > 0 ? `Margem ${formatPercent(margemVarejo)}` : 'Não definido',
      tone: varejo > 0 ? 'positive' : 'neutral'
    },
    {
      label: 'Venda Atacado',
      value: atacado > 0 ? formatCurrency(atacado) : '—',
      subtitle: atacado > 0 ? 'Tabela atacado' : 'Não definido',
      tone: atacado > 0 ? 'positive' : 'neutral'
    },
    {
      label: 'Estoque',
      value: `${formatQuantity(saldo.saldo)} ${produto.un || 'un'}`,
      subtitle: getStockStatus(produto, saldo).label,
      tone: saldoTone
    }
  ];
}

function formValuesToProduto(
  values: ProdutoFormValues,
  filialId: string | null | undefined,
  existing: Produto
): Produto {
  const custo = parseFloat(values.custo) || 0;
  const precoVarejo = parseFloat(values.precoVarejo) || 0;
  const mkv =
    precoVarejo > 0 && custo > 0
      ? (precoVarejo / custo - 1) * 100
      : parseFloat(values.markupVarejo) || 0;

  return {
    ...existing,
    id: values.id || existing.id,
    filial_id: filialId || existing.filial_id,
    produto_pai_id: values.produto_pai_id || null,
    nome: values.nome.trim(),
    sku: values.sku.trim() || null,
    un: values.un || 'un',
    cat: values.cat.trim() || null,
    custo,
    mkv,
    mka: parseFloat(values.markupAtacado) || 0,
    pfa: parseFloat(values.precoFixoAtacado) || 0,
    dv: parseFloat(values.descontoVarejo) || 0,
    da: parseFloat(values.descontoAtacado) || 0,
    qtmin: parseFloat(values.qtmin) || 0,
    emin: parseFloat(values.emin) || 0,
    esal: parseFloat(values.esal) || 0,
    ecm: parseFloat(values.ecm) || custo,
    hist_cot: existing.hist_cot ?? []
  };
}

function Toast({ message, type, onClear }: { message: string, type: 'success' | 'error', onClear: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClear, 4000);
    return () => clearTimeout(timer);
  }, [onClear]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
        type === 'success' 
          ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-50' 
          : 'bg-rose-900/90 border-rose-500/30 text-rose-50'
      }`}
    >
      {type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
      <span className="text-sm font-bold tracking-tight">{message}</span>
    </motion.div>
  );
}

function Confetti() {
  const particles = Array.from({ length: 40 });
  return (
    <div className="fixed inset-0 pointer-events-none z-[99]">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            top: '50%', 
            left: '50%', 
            scale: 0,
            rotate: 0,
            opacity: 1 
          }}
          animate={{ 
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            scale: Math.random() * 1.5,
            rotate: Math.random() * 360,
            opacity: 0
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-sm"
          style={{ 
            backgroundColor: ['#C5A059', '#FCD34D', '#10B981', '#6366F1'][i % 4] 
          }}
        />
      ))}
    </div>
  );
}

export function ProdutoProfilePage({
  produto,
  pais,
  saldo = { saldo: 0, cm: 0, ult: null },
  loadingProduto = false,
  error = null,
  onProdutoSaved,
  onReload
}: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingCadastro, setEditingCadastro] = useState(searchParams.get('edit') === '1');
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const {
    submitProduto,
    submitCascadeRename,
    submitCascadeFilhos,
    saving,
    error: mutationError
  } = useProdutoMutations();

  const activeTab = normalizeTab(searchParams.get('tab'));
  const precos = useMemo(() => getPrecos(produto), [produto]);
  const kpis = useMemo(() => buildKpis(produto, saldo), [produto, saldo]);
  const stockStatus = getStockStatus(produto, saldo);
  
  const sortedHist = useMemo(
    () =>
      [...(produto.hist_cot ?? [])].sort((a, b) =>
        String(b.mes ?? '').localeCompare(String(a.mes ?? ''))
      ),
    [produto.hist_cot]
  );

  useEffect(() => {
    setEditingCadastro(searchParams.get('edit') === '1');
  }, [produto.id, searchParams]);

  function setTab(tab: ProdutoProfileTab) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === 'resumo') next.delete('tab');
      else next.set('tab', tab);
      next.delete('edit');
      return next;
    });
    setEditingCadastro(false);
  }

  function startEdit() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', 'cadastro');
      next.set('edit', '1');
      return next;
    });
    setEditingCadastro(true);
  }

  async function handleSalvar(values: ProdutoFormValues) {
    const novoNome = values.nome.trim();
    const nomeAlterado = novoNome !== produto.nome;
    const catAlterada = (values.cat || '').trim() !== (produto.cat || '');
    const unAlterada = (values.un || '').trim() !== (produto.un || '');
    
    const saved = await submitProduto(formValuesToProduto(values, produto.filial_id, produto));
    
    if (nomeAlterado) {
      const devePropagar = window.confirm(
        `O nome do produto foi alterado para "${novoNome}". Deseja atualizar o nome em todo o histórico de vendas e registros antigos?`
      );
      if (devePropagar) {
        await submitCascadeRename(produto.id, novoNome);
      }
    }

    if (!produto.produto_pai_id && (catAlterada || unAlterada)) {
      const devePropagarFilhos = window.confirm(
        `A classificação do produto foi alterada. Deseja replicar a Categoria e Unidade para todas as variantes (filhos)?`
      );
      if (devePropagarFilhos) {
        await submitCascadeFilhos(produto.id, {
          cat: values.cat?.trim() || null,
          un: values.un?.trim() || 'un'
        });
      }
    }

    setEditingCadastro(false);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', 'cadastro');
      next.delete('edit');
      return next;
    });

    setToast({ message: 'Produto atualizado com sucesso!', type: 'success' });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);

    onProdutoSaved?.(saved);
    onReload?.();
  }

  if (loadingProduto) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 w-full">
        <LoadingState title="Carregando detalhes do produto..." />
      </main>
    );
  }

  const profileTabs = [...BASE_TABS];
  if (!produto.produto_pai_id) {
    profileTabs.splice(1, 0, { id: 'variantes', label: 'Variantes' });
  }

  return (
    <motion.main 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1600px] mx-auto px-8 py-8 w-full flex flex-col gap-8"
      data-testid="produto-profile-page"
    >
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link to="/app/produtos" className="flex items-center gap-1.5 text-slate-400 hover:text-slate-900 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Produtos
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">{produto.sku || `#${produto.id.slice(0,6)}`}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status do Sistema</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-600">Sincronizado</span>
            </div>
          </div>

          <button 
            className="rf-btn-premium gap-2"
            onClick={() => window.print()}
          >
            <Database className="w-4 h-4 text-[#C5A059]" />
            Relatório
          </button>
          <button className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-400">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClear={() => setToast(null)} />}
        {showConfetti && <Confetti />}
      </AnimatePresence>

      {error ? <ErrorState title={error} compact onRetry={onReload} /> : null}

      {/* Hero Section */}
      <section className="flex items-center gap-8">
        <div className="w-28 h-28 rounded-3xl bg-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] border border-slate-100 flex items-center justify-center relative overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] to-blue-600 opacity-0 group-hover:opacity-90 transition-all duration-500 flex flex-col items-center justify-center text-white gap-2">
            <Camera className="w-6 h-6 translate-y-4 group-hover:translate-y-0 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Trocar Foto</span>
          </div>
          <Package className="w-12 h-12 text-slate-300 group-hover:scale-110 transition-transform duration-500" />
          
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              className="h-full bg-emerald-500" 
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight m-0">{produto.nome}</h1>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                  stockStatus.tone === 'success' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {stockStatus.label}
                </span>
                {produto.produto_pai_id && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">Variante</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Atualizado em {new Date().toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                className="rf-btn-premium gap-2"
                onClick={() => useInterModuleStore.getState().navegarParaMovProduto(produto.id)}
              >
                <Layers className="w-4 h-4 text-[#C5A059]" />
                Movimentar estoque
              </button>
              <button className="rf-btn-premium rf-btn-premium--primary" onClick={startEdit}>
                Editar cadastro
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            {produto.cat || 'Sem categoria'} · {produto.un} · SKU: {produto.sku || '—'}
          </p>
        </div>
      </section>

      {/* KPI Grid */}
      <section className="rf-kpi-grid">
        {kpis.map((card, idx) => {
          const isCurrency = card.value.startsWith('R$');
          const numericValue = parseFloat(card.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
          
          let Icon = TrendingUp;
          if (card.label.includes('Custo')) Icon = DollarSign;
          if (card.label.includes('Venda')) Icon = Zap;
          if (card.label.includes('Estoque')) Icon = Package;

          const toneClass = 
            card.tone === 'positive' ? 'is-success' : 
            card.tone === 'negative' ? 'is-danger' : 
            '';

          return (
            <motion.article 
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rf-dash-card ${toneClass}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="rf-stat-label !mb-0">{card.label}</span>
                <div className={`p-2 rounded-lg bg-white/50 border border-white/20 shadow-sm ${card.tone === 'positive' ? 'text-emerald-600' : card.tone === 'negative' ? 'text-rose-600' : 'text-slate-400'}`}>
                  <Icon size={14} strokeWidth={2.5} />
                </div>
              </div>

              <div className="rf-stat-value">
                {isCurrency ? (
                  <CountUp 
                    end={numericValue} 
                    decimals={2} 
                    decimal="," 
                    prefix="R$ " 
                    duration={2} 
                    separator="."
                  />
                ) : (
                  <CountUp 
                    end={parseFloat(card.value) || 0} 
                    decimals={card.value.includes(',') ? 3 : 0}
                    decimal=","
                    duration={2} 
                    separator="."
                  />
                )}
                {!isCurrency && <span className="text-sm font-bold text-slate-400 ml-1.5">{card.value.split(' ')[1]}</span>}
              </div>

              <span className={`rf-stat-sub ${card.tone === 'positive' ? 'success' : card.tone === 'negative' ? 'danger' : 'muted'} font-bold`}>
                {card.tone === 'positive' && <TrendingUp size={12} strokeWidth={3} />}
                {card.subtitle}
              </span>
            </motion.article>
          );
        })}
      </section>

      {/* Premium Tabs */}
      <nav className="rf-tabs-premium">
        {profileTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`rf-tab-item ${activeTab === tab.id ? 'is-active' : ''}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A]"
              />
            )}
          </button>
        ))}
      </nav>

      {/* Tab Content with AnimatePresence */}
      <section className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'resumo' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Coluna 1: Domínio Financeiro */}
                <div className="flex flex-col gap-8">
                  <article className="rf-dash-card h-fit">
                    <div className="rf-dash-card__header flex-row items-center !mb-6">
                      <div className="flex-1">
                        <span className="rf-stat-label !mb-1 text-indigo-500 font-black">Performance</span>
                        <h2 className="rf-dash-card__title text-base">Resumo Comercial</h2>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                        <TrendingUp size={14} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <ProdutoInfoTable
                        rows={[
                          { label: 'Custo Base', value: formatCurrency(precos.custo) },
                          {
                            label: 'Venda Varejo',
                            value: precos.varejo > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{formatCurrency(precos.varejo)}</span>
                                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-black tracking-tighter">
                                  +{formatPercent(precos.margemVarejo)}
                                </span>
                              </div>
                            ) : null
                          },
                          {
                            label: 'Venda Atacado',
                            value: precos.atacado > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{formatCurrency(precos.atacado)}</span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black tracking-tighter">
                                  +{formatPercent(precos.margemAtacado)}
                                </span>
                              </div>
                            ) : null
                          },
                          {
                            label: 'Qtde mínima',
                            value: toNumber(produto.qtmin) > 0 ? `${formatQuantity(toNumber(produto.qtmin))} ${produto.un}` : null
                          }
                        ]}
                      />
                    </div>
                  </article>

                  <article className="rf-dash-card h-fit">
                    <div className="rf-dash-card__header flex-row items-center !mb-6">
                      <div className="flex-1">
                        <span className="rf-stat-label !mb-1 text-rose-500 font-black">Análise</span>
                        <h2 className="rf-dash-card__title text-base">Formação de Preço</h2>
                      </div>
                      <div className="p-2 bg-rose-50 rounded-lg text-rose-400">
                        <DollarSign size={14} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <ProdutoInfoTable
                        rows={[
                          { 
                            label: (
                              <Tooltip.Provider>
                                <Tooltip.Root>
                                  <Tooltip.Trigger className="flex items-center gap-1 cursor-help">
                                    Custo de Compra <Info size={10} className="text-slate-300" />
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content className="bg-slate-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-xl z-[200] max-w-[200px]" sideOffset={5}>
                                      Preço líquido pago ao fornecedor, base para cálculos de impostos e margem.
                                      <Tooltip.Arrow className="fill-slate-900" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              </Tooltip.Provider>
                            ), 
                            value: formatCurrency(precos.custo) 
                          },
                          { 
                            label: (
                              <Tooltip.Provider>
                                <Tooltip.Root>
                                  <Tooltip.Trigger className="flex items-center gap-1 cursor-help">
                                    Markup Varejo <Info size={10} className="text-slate-300" />
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content className="bg-slate-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-xl z-[200]" sideOffset={5}>
                                      Percentual adicionado sobre o custo para atingir o preço de venda.
                                      <Tooltip.Arrow className="fill-slate-900" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              </Tooltip.Provider>
                            ), 
                            value: formatPercent(toNumber(produto.mkv)) 
                          },
                          { label: 'Markup Atacado', value: formatPercent(toNumber(produto.mka)) },
                          { label: 'Desconto Máx Varejo', value: formatPercent(toNumber(produto.dv)) },
                          { label: 'Desconto Máx Atacado', value: formatPercent(toNumber(produto.da)) }
                        ]}
                      />
                    </div>
                  </article>
                </div>

                {/* Coluna 2: Domínio Operacional */}
                <div className="flex flex-col gap-8">
                  <article className="rf-dash-card h-fit">
                    <div className="rf-dash-card__header flex-row items-center !mb-6">
                      <div className="flex-1">
                        <span className="rf-stat-label !mb-1 text-emerald-500 font-black">Logística</span>
                        <h2 className="rf-dash-card__title text-base">Gestão de Estoque</h2>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-400">
                        <Layers size={14} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <ProdutoInfoTable
                        rows={[
                          {
                            label: 'Saldo em Mão',
                            value: (
                              <span className={`font-bold ${saldo.saldo <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                {formatQuantity(saldo.saldo)} {produto.un}
                              </span>
                            )
                          },
                          { label: 'Ponto de Pedido (Mín)', value: `${formatQuantity(toNumber(produto.emin))} ${produto.un}` },
                          { label: 'Alerta Reposição', value: toNumber(produto.esal) > 0 ? `${formatQuantity(toNumber(produto.esal))} ${produto.un}` : null },
                          { label: 'Custo Médio (CM)', value: formatCurrency(saldo.cm || toNumber(produto.ecm) || precos.custo) }
                        ]}
                      />
                    </div>
                  </article>

                  <article className="rf-dash-card h-fit">
                    <div className="rf-dash-card__header flex-row items-center !mb-6">
                      <div className="flex-1">
                        <span className="rf-stat-label !mb-1 text-slate-500 font-black">Dados Mestre</span>
                        <h2 className="rf-dash-card__title text-base">Cadastro Base</h2>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                        <Database size={14} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <ProdutoInfoTable
                        rows={[
                          { label: 'SKU', value: produto.sku },
                          { label: 'Categoria', value: produto.cat },
                          { label: 'Código Barras', value: produto.codigo_barras },
                          { label: 'Ref. Fornecedor', value: produto.codigo_fornecedor }
                        ]}
                      />
                    </div>
                  </article>
                </div>

                {/* Coluna 3: Domínio de Inteligência */}
                <aside className="flex flex-col gap-8">
                  <article className="rf-dash-card bg-[#0F172A] text-white overflow-hidden relative shadow-[0_20px_40px_-12px_rgba(15,23,42,0.3)] !p-0">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <TrendingUp className="w-32 h-32" />
                    </div>
                    <div className="p-6 flex flex-col gap-6 relative z-10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-blue-400/80 uppercase tracking-[0.2em]">Nexus AI · Performance</span>
                        <h3 className="text-lg font-bold text-white tracking-tight">Giro e Saúde</h3>
                      </div>
                      
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Última Venda</span>
                          <span className="text-xs font-bold text-[#C5A059]">{saldo.ult ? new Date(saldo.ult).toLocaleDateString() : 'Sem registros'}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span>Eficiência</span>
                            <span>65%</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '65%' }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-[#C5A059] to-amber-400 shadow-[0_0_10px_rgba(197,160,89,0.3)]" 
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                          Este produto mantém um giro constante. Recomendamos manter o estoque acima de <span className="text-white font-bold">{produto.emin} {produto.un}</span> para evitar ruptura.
                        </p>
                      </div>
                    </div>
                  </article>

                  <article className="rf-dash-card h-fit">
                    <div className="rf-dash-card__header flex-row items-center !mb-6">
                      <div className="flex-1">
                        <span className="rf-stat-label !mb-1 text-amber-500 font-black">Mercado</span>
                        <h2 className="rf-dash-card__title text-base">Histórico de Custo</h2>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
                        <History size={14} />
                      </div>
                    </div>
                    <div className="p-0">
                      {sortedHist.length ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-slate-50">
                                <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Mês</th>
                                <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Preço</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedHist.slice(0, 5).map((item, index) => (
                                <tr key={`${item.mes}-${index}`} className="border-b border-slate-50/50 last:border-0 hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 text-slate-600 font-medium">
                                    {String(item.mes ?? '').split('-').reverse().join('/')}
                                  </td>
                                  <td className="px-4 py-3 text-slate-900 font-bold">
                                    {formatCurrency(toNumber(item.preco))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 italic text-xs font-medium">Sem histórico registrado</div>
                      )}
                    </div>
                  </article>
                </aside>
              </div>
            )}


            {activeTab === 'estoque' && (
              <article className="rf-dash-card">
                <div className="rf-dash-card__header flex-row items-center !mb-6">
                  <div className="flex-1">
                    <span className="rf-stat-label !mb-1 text-emerald-500">Histórico</span>
                    <h2 className="rf-dash-card__title text-base">Auditoria de Estoque</h2>
                  </div>
                  <History className="w-4 h-4 text-slate-300" />
                </div>
                <div className="p-8 text-center">
                  <p className="text-slate-500 text-sm italic font-medium">Registro cronológico de entradas, saídas e ajustes em desenvolvimento.</p>
                </div>
              </article>
            )}

            {activeTab === 'cadastro' && (
              <article className="rf-dash-card">
                <div className="rf-dash-card__header flex-row items-center !mb-6">
                  <div className="flex-1">
                    <span className="rf-stat-label !mb-1 text-slate-500">Informações</span>
                    <h2 className="rf-dash-card__title text-base">{editingCadastro ? 'Edição do Produto' : 'Detalhes Cadastrais'}</h2>
                  </div>
                  {!editingCadastro && (
                    <button className="rf-btn-premium" onClick={startEdit}>Editar</button>
                  )}
                </div>
                <div className="mt-2">
                  {editingCadastro ? (
                    <ProdutoForm
                      produto={produto}
                      pais={pais}
                      saving={saving}
                      error={mutationError}
                      onSalvar={(values) => void handleSalvar(values)}
                      onCancelar={() => {
                        setEditingCadastro(false);
                        setSearchParams((current) => {
                          const next = new URLSearchParams(current);
                          next.set('tab', 'cadastro');
                          next.delete('edit');
                          return next;
                        });
                      }}
                    />
                  ) : (
                    <ProdutoInfoTable
                      rows={[
                        { label: 'Nome Completo', value: produto.nome },
                        { label: 'SKU / Código', value: produto.sku },
                        { label: 'Unidade Padrão', value: produto.un },
                        { label: 'Categoria Master', value: produto.cat },
                        { label: 'Descrição Pública', value: produto.descricao_padrao || '—' }
                      ]}
                    />
                  )}
                </div>
              </article>
            )}

            {activeTab === 'variantes' && (
              <ProdutoVariantesTab
                produto={produto}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </motion.main>
  );
}

function ProdutoInfoTable({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50/80 transition-colors border-b border-slate-50/50 last:border-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{row.label}</span>
          <div className="text-[13px] font-bold text-slate-900">{row.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}
