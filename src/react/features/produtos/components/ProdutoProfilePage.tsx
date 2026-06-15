import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap,
  DollarSign,
  Share2,
  Clock,
  Camera,
  ChevronLeft,
  Package,
  TrendingUp,
  Layers,
  Database,
  History,
  Info
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import ReactCountUp from 'react-countup';
const CountUp = (ReactCountUp as any).default || ReactCountUp;

import { ProdutoResumoTab } from './ProdutoResumoTab';
import { ProdutoEstoqueTab } from './ProdutoEstoqueTab';
import { ProdutoCadastroTab } from './ProdutoCadastroTab';
import { buildKpis, getStockStatus, formatCurrency, toNumber, formatQuantity } from './ProdutoUtils';

import { useInterModuleStore } from '../../../app/lib/useInterModuleStore';
import { useUIStore } from '../../../app/useUIStore';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { formValuesToProduto } from '../hooks/useProdutoCalculations';
import { ErrorState, LoadingState, Button, Badge } from '../../../shared/ui';
import { markupToPrice, priceToMargin } from '../hooks/useProdutoCalculations';
import { useProdutoMutations, useMovimentacoesQuery, useVariantesQuery } from '../hooks/useProdutosQuery';
import type { ProdutoFormValues, ProdutoSaldo } from '../types';
import { ProdutoForm } from './ProdutoForm';
import { ProdutoVariantesTab } from './ProdutoVariantesTab';
import { toast } from 'sonner';

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
  onReload
}: Props) {
  const navigate = useNavigate();
  const { sidebarCollapsed: collapsed } = useUIStore();
  const isMobile = useIsMobile(1024);
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingCadastro, setEditingCadastro] = useState(searchParams.get('edit') === '1');
  const [showConfetti, setShowConfetti] = useState(false);
  
  const { 
    save: saveMutation, 
    cascadeRename: renameMutation, 
    cascadeUpdate: updateMutation 
  } = useProdutoMutations();
  
  const formRef = useRef<HTMLDivElement>(null);

  const activeTab = normalizeTab(searchParams.get('tab'));
  
  const isPai = !produto.produto_pai_id;
  const { data: variantes = [] } = useVariantesQuery(isPai ? produto.id : null);
  const queryIds = isPai ? [produto.id, ...variantes.map(v => v.id)] : [produto.id];

  const { data: movs = [], isLoading: loadingMovs } = useMovimentacoesQuery(queryIds);

  const calculatedSaldo = useMemo(() => {
    const isPaiComVariantes = isPai && variantes.length > 0;
    const saldo = isPaiComVariantes 
      ? variantes.reduce((acc, v) => acc + toNumber(v.esal), 0)
      : toNumber(produto.esal);
      
    return { 
      saldo, 
      cm: toNumber(produto.ecm) || toNumber(produto.custo) 
    };
  }, [produto.esal, produto.ecm, produto.custo, isPai, variantes]);


  const kpis = useMemo(() => buildKpis(produto, calculatedSaldo), [produto, calculatedSaldo]);
  const stockStatus = getStockStatus(produto, calculatedSaldo);
  
  const sortedHist = useMemo(
    () =>
      [...(produto.hist_cot ?? [])].sort((a, b) =>
        String(b.mes ?? '').localeCompare(String(a.mes ?? ''))
      ),
    [produto.hist_cot]
  );

  useEffect(() => {
    const isEditing = searchParams.get('edit') === '1';
    setEditingCadastro(isEditing);
    
    // Se estiver editando, garante que estamos na aba de cadastro
    if (isEditing && activeTab !== 'cadastro') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'cadastro');
        return next;
      }, { replace: true });
    }
  }, [produto.id, searchParams, activeTab]);

  useEffect(() => {
    if (editingCadastro && formRef.current) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = formRef.current.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, [editingCadastro]);

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

  async function handleSalvar(values: any, grade?: string[], cores?: string[]) {
    const novoNome = values.nome.trim();
    const nomeAlterado = novoNome !== produto.nome;
    const catAlterada = (values.cat || '').trim() !== (produto.cat || '');
    const unAlterada = (values.un || '').trim() !== (produto.un || '');
    
    const mapped = formValuesToProduto(values, produto.filial_id || '', produto);
    
    // Preparar lote se houver grade ou cores
    const payload: Produto[] = [mapped];
    const hasGrade = grade && grade.length > 0;
    const hasCores = cores && cores.length > 0;

    if (hasGrade || hasCores) {
      const activeCores = hasCores ? cores : [null];
      const activeSizes = hasGrade ? grade : [null];

      activeCores.forEach(color => {
        activeSizes.forEach(size => {
          if (!color && !size) return;

          const nameParts = [mapped.nome.trim()];
          if (color) nameParts.push(color);
          if (size) nameParts.push(size);
          
          const skuParts = [mapped.sku?.trim() || 'PROD'];
          if (color) skuParts.push(color.toUpperCase().slice(0, 3));
          if (size) skuParts.push(size);

          payload.push({
            ...mapped,
            id: crypto.randomUUID(),
            produto_pai_id: mapped.id,
            nome: nameParts.join(' - '),
            sku: skuParts.join('-'),
            tamanho: size,
            esal: 0
          });
        });
      });
    }

    saveMutation.mutate(payload as any, {
      onSuccess: async () => {
        if (nomeAlterado) {
          toast.message(`O nome do produto foi alterado para "${novoNome}".`, {
            description: 'Deseja atualizar o nome em todo o histórico de vendas?',
            duration: 10000,
            action: {
              label: 'Atualizar Histórico',
              onClick: () => {
                renameMutation.mutate({ 
                  id: produto.id, 
                  novoNome, 
                  antigoNome: produto.nome 
                });
              }
            }
          });
        }

        if (!produto.produto_pai_id && (catAlterada || unAlterada)) {
          toast.message(`A classificação do produto principal foi alterada.`, {
            description: 'Deseja replicar a Categoria e Unidade para todas as variantes?',
            duration: 10000,
            action: {
              label: 'Atualizar Variantes',
              onClick: () => {
                updateMutation.mutate({ 
                  id: produto.id, 
                  data: { cat: values.cat?.trim() || null, un: values.un?.trim() || 'un' } 
                });
              }
            }
          });
        }

        toast.success(payload.length > 1 ? `Produto e ${payload.length - 1} variantes salvos!` : 'Alterações salvas com sucesso');
        setEditingCadastro(false);
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.set('tab', 'cadastro');
          next.delete('edit');
          return next;
        });

        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
        onReload?.();
      }
    });
  }

  if (loadingProduto) {
    return (
      <div className="w-full">
        <LoadingState title="Carregando detalhes do produto…" />
      </div>
    );
  }

  const profileTabs = [...BASE_TABS];
  if (!produto.produto_pai_id || produto.produto_pai_id === produto.id) {
    profileTabs.splice(1, 0, { id: 'variantes', label: 'Variantes' });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex flex-col gap-8"
      data-testid="produto-profile-page"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link to="/app/produtos" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Produtos
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-white font-semibold">{produto.sku || `#${produto.id.slice(0,6)}`}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-medium text-slate-500">Status do Sistema</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-400">Sincronizado</span>
            </div>
          </div>

          <Button 
            variant="secondary"
            className="gap-2"
            onClick={() => window.print()}
            leftIcon={<Database className="w-4 h-4 text-emerald-500" />}
          >
            Relatório
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            className="!p-2 rounded-xl"
            onClick={() => {}}
            aria-label="Compartilhar"
            leftIcon={<Share2 className="w-4 h-4" />}
          />
        </div>
      </div>

      <AnimatePresence>
        {showConfetti && <Confetti />}
      </AnimatePresence>

      {error ? <ErrorState title={error} compact onRetry={onReload} /> : null}

      <section className="flex items-center gap-8">
        <div 
          className="w-28 h-28 rounded-3xl bg-slate-900 shadow-2xl border border-white/5 flex items-center justify-center relative overflow-hidden group cursor-pointer"
          style={{ viewTransitionName: `product-thumb-${produto.id}` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] to-blue-600 opacity-0 group-hover:opacity-90 transition-all duration-500 flex flex-col items-center justify-center text-white gap-2">
            <Camera className="w-6 h-6 translate-y-4 group-hover:translate-y-0 transition-transform" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium text-slate-400">Trocar Foto</span>
          </div>
          <Package className="w-12 h-12 text-slate-700 group-hover:scale-110 transition-transform duration-500" />
          
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
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
                <h1 className="text-3xl font-black text-white tracking-tight m-0">{produto.nome}</h1>
                <Badge variant={stockStatus.tone === 'success' ? 'green' : 'red'}>
                  {stockStatus.label}
                </Badge>
                {produto.produto_pai_id && (
                  <Badge variant="slate">Variante</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-medium text-slate-500">Atualizado em {new Date().toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => useInterModuleStore.getState().navegarParaMovProduto(produto.id)}
                leftIcon={<Layers className="w-4 h-4 text-emerald-500" />}
              >
                Movimentar estoque
              </Button>
              <Button variant="primary" onClick={startEdit}>
                Editar cadastro
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium">
            {produto.cat || 'Sem categoria'} · {produto.un} · SKU: {produto.sku || '—'}
            {produto.qualidade ? ` · Qualidade: ${produto.qualidade}` : ''}
          </p>
        </div>
      </section>

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
                <div className={`p-2 rounded-lg bg-white/5 border border-white/10 shadow-sm ${card.tone === 'positive' ? 'text-emerald-400' : card.tone === 'negative' ? 'text-rose-400' : 'text-slate-400'}`}>
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
                {!isCurrency && <span className="text-sm font-bold text-slate-500 ml-1.5">{card.value.split(' ')[1]}</span>}
              </div>

              <span className={`rf-stat-sub ${card.tone === 'positive' ? 'success' : card.tone === 'negative' ? 'danger' : 'muted'} font-bold`}>
                {card.tone === 'positive' && <TrendingUp size={12} strokeWidth={3} />}
                {card.subtitle}
              </span>
            </motion.article>
          );
        })}
      </section>

      <nav className="rf-tabs-premium" ref={formRef}>
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
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500"
              />
            )}
          </button>
        ))}
      </nav>

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
              <ProdutoResumoTab 
                produto={produto}
                saldo={saldo}
                sortedHist={sortedHist}
                calculatedSaldo={calculatedSaldo}
              />
            )}

            {activeTab === 'estoque' && (
              <ProdutoEstoqueTab 
                loadingMovs={loadingMovs}
                movs={movs}
              />
            )}

            {activeTab === 'cadastro' && (
              <ProdutoCadastroTab 
                produto={produto}
                startEdit={startEdit}
              />
            )}

            {activeTab === 'variantes' && (
              <ProdutoVariantesTab
                produto={produto}
                onOpenProduto={(id, options) => {
                  const search = options?.edit ? '?tab=cadastro&edit=1' : '';
                  navigate(`/app/produtos/${id}${search}`);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {editingCadastro && (
          <motion.div 
            className="fixed bottom-0 right-0 z-50 flex items-center justify-center sm:p-4 bg-slate-950/80 backdrop-blur-sm"
            style={{ left: isMobile ? 0 : (collapsed ? '80px' : '280px'), top: isMobile ? 0 : '80px' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            data-testid="produto-form-modal"
          >
            <div className={`w-full max-w-5xl max-h-full sm:max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 shadow-2xl relative ${isMobile ? 'h-full rounded-none px-4 py-6' : 'rounded-3xl p-6'}`}>
              <div className="flex-1 overflow-hidden flex flex-col">
                <ProdutoForm
                  produto={produto}
                  pais={pais}
                  variantes={variantes}
                  saving={saveMutation.isPending}
                  error={saveMutation.error instanceof Error ? saveMutation.error.message : null}
                  onSalvar={(values, grade, cores) => void handleSalvar(values, grade, cores)}
                  onCancelar={() => {
                    setEditingCadastro(false);
                    setSearchParams((current) => {
                      const next = new URLSearchParams(current);
                      next.delete("edit");
                      return next;
                    });
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

