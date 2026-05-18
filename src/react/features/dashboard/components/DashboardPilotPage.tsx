import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart as RechartsAreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import ReactCountUp from 'react-countup';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, 
  Col
} from '@tremor/react';

// Fallback para garantir que CountUp seja um componente válido em produção (Vercel)
const CountUp = (ReactCountUp as any).default || ReactCountUp;
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  HelpCircle,
  Zap,
  ShieldCheck,
  FileText as FileIcon
} from 'lucide-react';
import { fiscalService } from '../../pedidos/services/fiscalService';
import { useToastStore } from '../../../app/lib/useToastStore';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';


import { useDashboardStore, type Periodo, type Visao } from '../store/useDashboardStore';
import { useDashboardData } from '../hooks/useDashboardData';
import { useGlobalAlerts } from '../hooks/useGlobalAlerts';
import { LoadingState, ErrorState, EmptyState, StatusBadge, Button, Badge, Card, Typography, PageHeader, PillGroup } from '../../../shared/ui';
import { HealthCheckCard } from './HealthCheckCard';
import type { Pedido, PedidoItem } from '../../../../types/domain';
import DashboardWorker from '../workers/dashboard.worker?worker';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => BRL.format(v || 0);

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  orcamento: { label: 'Orçamento', color: '#94A3B8' },
  em_andamento: { label: 'Em andamento', color: 'var(--color-indigo-vibrant)' },
  em_separacao: { label: 'Em separação', color: 'var(--color-amber-vibrant)' },
  entregue_aguardando_pagamento: { label: 'Aguardando Pagamento', color: 'var(--color-cyan-vibrant)' },
  pago_aguardando_entrega: { label: 'Aguardando Entrega', color: 'var(--color-indigo-vibrant)' },
  concluido: { label: 'Concluído', color: 'var(--color-emerald-vibrant)' },
  cancelado: { label: 'Cancelado', color: 'var(--color-rose-vibrant)' }
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shell único para padronizar TODOS os tooltips do sistema
function TooltipShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "bg-slate-900/95 backdrop-blur-2xl p-5 border border-white/10 rounded-[24px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/5 animate-in fade-in zoom-in duration-200",
      className
    )}>
      {children}
    </div>
  );
}

function PremiumTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            align="center"
            sideOffset={8}
            className="z-[9999]"
          >
            <TooltipShell className="p-3 rounded-xl min-w-[120px]">
              <p className="text-[10px] font-black text-white uppercase tracking-tight text-center">{content}</p>
              <TooltipPrimitive.Arrow className="fill-slate-900/90" />
            </TooltipShell>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

type DashboardPilotPageProps = {
  onNavigatePage?: (page: string) => void;
  onReload?: () => void;
};

export function DashboardPilotPage({ onNavigatePage, onReload }: DashboardPilotPageProps = {}) {
  const { reload } = useDashboardData();
  const navigate = useNavigate();
  
  const { 
    periodo, setPeriodo, 
    visao, setVisao,
    pedidos, produtos, clientes, contasReceber, filial,
    status, error 
  } = useDashboardStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { alerts } = useGlobalAlerts();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await reload();
    setIsRefreshing(false);
  };

  // --- Cálculos via Web Worker ---
  const [workerData, setWorkerData] = useState<{
    stats: any;
    chartData: any;
    periodoDatas: string;
    topProducts: any;
    statusDistribution: any;
  } | null>(null);

  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new DashboardWorker();
    workerRef.current.onmessage = (e) => setWorkerData(e.data);
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      pedidos,
      produtos,
      clientes,
      contasReceber,
      periodo,
      statusKeys: Object.keys(STATUS_CONFIG)
    });
  }, [pedidos, produtos, clientes, contasReceber, periodo]);

  if (status === 'loading' || !workerData) return <LoadingState description="Consolidando indicadores..." />;
  const { stats, chartData, periodoDatas, topProducts, statusDistribution } = workerData;
  if (status === 'error') return <ErrorState title="Falha ao carregar dashboard" description={error || ''} onRetry={reload} />;

  return (
    <div className="flex-1 w-full flex flex-col gap-8 animate-in fade-in duration-500">
      <PageHeader
        kicker="Inteligência"
        title="Dashboard"
        description="Visão consolidada de performance, saúde operacional e projeções financeiras."
        actions={
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5">
              <PillGroup
                options={[
                  { id: 'semana', label: 'Semana' },
                  { id: 'mes', label: 'Mês' },
                  { id: 'ano', label: 'Ano' },
                  { id: 'tudo', label: 'Tudo' }
                ]}
                activeId={periodo}
                onChange={(id) => setPeriodo(id as Periodo)}
              />
            </div>

            <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5">
              <PillGroup
                options={[
                  { id: 'operacional', label: 'Operacional' },
                  { id: 'gerencial', label: 'Gerencial' },
                  { id: 'analitico', label: 'Analítico' }
                ]}
                activeId={visao}
                onChange={(id) => setVisao(id as Visao)}
              />
            </div>

            <Button 
              variant="secondary" 
              onClick={handleRefresh} 
              loading={isRefreshing}
              leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              className="!rounded-xl"
            >
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        }
      />

      {/* Linha 1: Stat Cards */}
      <motion.section 
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="rf-bento-grid"
      >
        {[
          { label: 'Faturamento', val: stats.faturamento, prefix: 'R$ ', color: 'text-white' },
          { label: 'Lucro bruto', val: stats.lucroTotal, prefix: 'R$ ', color: 'text-emerald-400', ring: 'ring-emerald-500/20' },
          { label: 'Ticket médio', val: stats.ticketMedio, prefix: 'R$ ', color: 'text-white' },
          { label: 'Em aberto', val: stats.valorEmAberto, prefix: 'R$ ', color: stats.valorEmAberto > 0 ? 'text-amber-400' : 'text-emerald-400', ring: stats.valorEmAberto > 0 ? 'ring-amber-500/20' : 'ring-emerald-500/20' }
        ].map((stat, i) => (
          <motion.article 
            key={i}
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className={cn(
              "rf-bento-item rf-bento-span-3 !bg-surface-card/40 backdrop-blur-xl flex flex-col gap-1 border border-white/5 shadow-2xl",
              stat.ring
            )}
          >
            <Typography variant="label" color="muted" className="mb-1">{stat.label}</Typography>
            <div className={cn("text-3xl font-black font-display", stat.color)}>
              <CountUp end={stat.val} decimals={2} decimal="," prefix={stat.prefix} duration={2} separator="." />
            </div>
          </motion.article>
        ))}
      </motion.section>

      {/* Linha Principal: Gráfico de Performance */}
      <div className="rf-bento-grid mt-4">
        {visao !== 'operacional' && (
          <div className="rf-bento-item rf-bento-span-8 rf-glass-glow shadow-premium overflow-hidden !p-0">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="space-y-0.5">
                <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight">Desempenho Comercial</Typography>
                <Typography variant="caption" color="muted">Faturamento vs Lucro Bruto</Typography>
              </div>
              <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                {periodoDatas}
              </div>
            </div>
            
            <div className="p-6">
              <div 
                className="h-80 w-full mt-4" 
                role="figure" 
                aria-label={`Gráfico de área exibindo o faturamento e lucro ao longo do período: ${periodoDatas}`}
              >
                {chartData.length === 0 ? (
                  <EmptyState 
                    icon={<TrendingUp size={32} className="text-slate-500" />} 
                    title="Nenhum registro comercial" 
                    description="Não existem vendas registradas para o período selecionado." 
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                  <RechartsAreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLuc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} dy={10} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl ring-1 ring-white/10">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{label}</p>
                            <div className="space-y-2">
                              {payload.map((entry: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between gap-8">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase">{entry.name}</span>
                                  </div>
                                  <span className="text-xs font-black text-white">{fmt(entry.value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#fbbf24" strokeWidth={3} fillOpacity={1} fill="url(#colorFat)" />
                    <Area type="monotone" dataKey="lucro" name="Lucro" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorLuc)" />
                  </RechartsAreaChart>
                </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-white/5">
                {[
                  { label: 'Melhor Dia', val: Math.max(...chartData.map(d => d.faturamento), 0) },
                  { label: 'Média Diária', val: chartData.length > 0 ? chartData.reduce((acc, d) => acc + d.faturamento, 0) / chartData.length : 0 },
                  { label: 'Total Período', val: chartData.reduce((acc, d) => acc + d.faturamento, 0) },
                  { label: 'Margem Bruta', val: stats.margem, suffix: '%' }
                ].map((m, i) => (
                  <div key={i}>
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{m.label}</span>
                    <span className="block text-lg font-black text-white">
                      {m.suffix ? `${m.val.toFixed(1)}%` : fmt(m.val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mix de Vendas */}
        <div className="rf-bento-item rf-bento-span-4 rf-glass overflow-hidden !p-0">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight">Mix de Vendas</Typography>
            <Typography variant="caption" color="muted">Performance por Categoria</Typography>
          </div>
          <div className="p-6 flex flex-col gap-6">
            {topProducts.length === 0 ? (
              <EmptyState 
                icon={<PieChart size={32} className="text-slate-500" />} 
                title="Mix vazio" 
                description="Sem movimentação de produtos no período." 
              />
            ) : (
              <>
                <div 
                  className="h-48 relative"
                  role="figure"
                  aria-label="Gráfico de rosca exibindo a distribuição das vendas por categoria de produto"
                >
                  <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topProducts} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="receita" stroke="none">
                    {topProducts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#22d3ee', '#fbbf24', '#10b981', '#818cf8', '#fb7185'][index]} />
                    ))}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-3 rounded-2xl shadow-2xl">
                          <p className="text-[10px] font-black text-white uppercase">{payload[0].name}</p>
                          <p className="text-xs font-black text-cyan-400 mt-1">{fmt(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <Typography variant="label" color="muted" className="!text-[9px]">Total</Typography>
                 <span className="text-xl font-black text-white font-display">{fmt(topProducts.reduce((acc, p) => acc + p.receita, 0))}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {topProducts.slice(0, 3).map((p, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: ['#22d3ee', '#fbbf24', '#10b981'][i] }} />
                      <span className="text-slate-300 truncate max-w-[120px]">{p.nome}</span>
                    </div>
                    <span className="text-white">{p.percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${p.percent}%` }} className="h-full rounded-full" style={{ background: ['#22d3ee', '#fbbf24', '#10b981'][i] }} />
                  </div>
                </div>
              ))}
            </div>
            </>
            )}
          </div>
        </div>
      </div>

      {/* Terceira Linha: Health, Status, Alerts */}
      <div className="rf-bento-grid mt-4">
        {/* Health Check */}
        <div className="rf-bento-item rf-bento-span-4 rf-glass flex flex-col gap-6">
           <HealthCheckCard />
           <div className="mt-auto pt-6 border-t border-white/5">
              <FiscalHubCard />
           </div>
        </div>

        {/* Status da Base */}
        <div className="rf-bento-item rf-bento-span-4 rf-glass flex flex-col overflow-hidden !p-0">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight">Status da Base</Typography>
            <Typography variant="label" color="muted" className="!text-[10px]">{pedidos.length} Pedidos Sincronizados</Typography>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(STATUS_CONFIG).slice(0, 5).map(([key, config]) => {
              const count = statusDistribution[key] || 0;
              const perc = pedidos.length > 0 ? (count / pedidos.length) * 100 : 0;
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{config.label}</span>
                    <span className="text-xs font-black text-white">{count}</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${perc}%` }} className="h-full rounded-full" style={{ background: config.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CRM / Alertas */}
        <div className="rf-bento-item rf-bento-span-4 rf-glass flex flex-col overflow-hidden !p-0">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight">Alertas do CRM</Typography>
            <Badge variant="red">{alerts.length}</Badge>
          </div>
          <div className="p-6 space-y-4">
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4">
                <div className={cn("p-2 rounded-lg", a.tone === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400')}>
                  <Zap size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[11px] font-bold text-white truncate uppercase tracking-tight">{a.title}</span>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{a.desc}</p>
                </div>
              </div>
            ))}
            <div className="pt-4 mt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ação CRM</span>
                 <TrendingUp size={12} className="text-indigo-400" />
              </div>
              <Button size="sm" variant="secondary" className="w-full !rounded-xl !text-[10px] font-black uppercase">Ativar Campanha</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FiscalHubCard() {
  const { token } = useApiContext();
  const [isEmitting, setIsEmitting] = useState(false);

  const handleEmit = async () => {
    setIsEmitting(true);
    try {
      const result = await fiscalService.emitirNFe(token!, 'PENDING');
      if (result.ok) {
        useToastStore.getState().addToast(`NFe emitida com sucesso!`, 'success');
      } else {
        useToastStore.getState().addToast(result.error || 'Erro na emissão.', 'error');
      }
    } finally {
      setIsEmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-4 h-4 text-emerald-400" />
           <span className="text-[10px] font-black text-white uppercase tracking-widest">Fiscal Hub</span>
        </div>
        <Badge variant="green" className="!py-0 !text-[8px]">ACTIVE</Badge>
      </div>
      <Button 
        size="sm" 
        variant="secondary" 
        className="w-full !rounded-lg !text-[10px] font-black uppercase"
        onClick={handleEmit}
        loading={isEmitting}
      >
        {isEmitting ? 'Processando...' : 'Processar NFes Pendentes'}
      </Button>
    </div>
  );
}
