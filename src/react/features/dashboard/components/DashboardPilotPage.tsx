import { fmtBRL } from '../../../shared/lib/formatters';
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

// Fallback para garantir que CountUp seja um componente válido em produção (Vercel)
const CountUp = (ReactCountUp as any).default || ReactCountUp;
import {
  AlertCircle,
  Activity,
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
import { FunnelChart } from './FunnelChart';
import { RcaRankingChart } from './RcaRankingChart';
import { MetaGaugeChart } from './MetaGaugeChart';
import { AgingChart } from './AgingChart';
import { CashFlowProjection } from './CashFlowProjection';
import { RfmSegmentation } from './RfmSegmentation';
import DashboardWorker from '../workers/dashboard.worker?worker';

const fmt = (v: number) => fmtBRL(v || 0);

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  orcamento: { label: 'Orçamento', color: '#94A3B8' },
  em_andamento: { label: 'Em andamento', color: '#818cf8' },
  em_separacao: { label: 'Em separação', color: '#f59e0b' },
  entregue_aguardando_pagamento: { label: 'Aguardando Pagamento', color: '#14b8a6' },
  pago_aguardando_entrega: { label: 'Aguardando Entrega', color: '#818cf8' },
  concluido: { label: 'Concluído', color: '#10b981' },
  cancelado: { label: 'Cancelado', color: '#f43f5e' }
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shell único para padronizar TODOS os tooltips do sistema
function TooltipShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "bg-slate-900/95 backdrop-blur-2xl p-5 border border-white/10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/5 animate-in fade-in zoom-in duration-200",
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

// Componente BadgeDelta no Estilo Tremor UI
function BadgeDelta({ value, isPositive, isNeutral }: { value: string; isPositive: boolean; isNeutral: boolean }) {
  if (isNeutral) {
    return (
      <span className="text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-0.5 border bg-slate-500/10 text-slate-400 border-slate-500/20 uppercase tracking-wider">
        {value}
      </span>
    );
  }
  return (
    <span className={cn(
      "text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-0.5 border uppercase tracking-wider",
      isPositive 
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
    )}>
      <ArrowUpRight size={10} className={isPositive ? "" : "rotate-90"} />
      {value}
    </span>
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
    healthMetrics: any;
    rcaRanking: any;
    funnelData: any;
    agingData: any;
    financeMetrics: any;
    cashFlowData: any;
    rfmData: any;
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

  if (status === 'loading' || !workerData) return <LoadingState description="Consolidando indicadores comerciais..." />;
  const { stats, chartData, periodoDatas, topProducts, statusDistribution } = workerData;
  if (status === 'error') return <ErrorState title="Falha ao carregar dashboard" description={error || ''} onRetry={reload} />;

  // Mapeamento dos cartões de métricas superiores (KPIs)
  const metricCards = [
    { 
      label: 'Faturamento', val: stats.faturamento, prefix: 'R$ ', color: 'text-white', 
      trend: stats.trends?.faturamento !== null ? `${stats.trends.faturamento > 0 ? '+' : ''}${stats.trends.faturamento.toFixed(1)}%` : '-', 
      trendLabel: periodo === 'tudo' ? '-' : `vs ${periodo} anterior`, 
      trendUp: stats.trends?.faturamento !== null ? stats.trends.faturamento >= 0 : true,
    },
    { 
      label: 'Lucro bruto', val: stats.lucroTotal, prefix: 'R$ ', color: 'text-emerald-400', 
      trend: stats.trends?.lucro !== null ? `${stats.trends.lucro > 0 ? '+' : ''}${stats.trends.lucro.toFixed(1)}%` : '-', 
      trendLabel: periodo === 'tudo' ? '-' : `vs ${periodo} anterior`, 
      trendUp: stats.trends?.lucro !== null ? stats.trends.lucro >= 0 : true,
    },
    { 
      label: 'Ticket médio', val: stats.ticketMedio, prefix: 'R$ ', color: 'text-white', 
      trend: stats.trends?.ticket !== null ? `${stats.trends.ticket > 0 ? '+' : ''}${stats.trends.ticket.toFixed(1)}%` : '-', 
      trendLabel: periodo === 'tudo' ? '-' : `vs ${periodo} anterior`, 
      trendUp: stats.trends?.ticket !== null ? stats.trends.ticket >= 0 : true,
    },
    { 
      label: 'Contas em aberto', val: stats.valorEmAberto, prefix: 'R$ ', color: stats.valorEmAberto > 0 ? 'text-amber-400' : 'text-emerald-400', 
      trend: '-', 
      trendLabel: 'Variação N/A', 
      trendUp: stats.valorEmAberto === 0,
    },
    { 
      label: 'Inadimplência', val: workerData.financeMetrics?.inadimplencia || 0, prefix: '', suffix: '%', color: (workerData.financeMetrics?.inadimplencia || 0) > 5 ? 'text-rose-400' : 'text-emerald-400', 
      trend: '-', 
      trendLabel: 'Variação N/A', 
      trendUp: (workerData.financeMetrics?.inadimplencia || 0) <= 5,
    },
    { 
      label: 'DSO (Prazo)', val: workerData.financeMetrics?.dso || 0, prefix: '', suffix: ' dias', color: 'text-white', 
      trend: '-', 
      trendLabel: 'Variação N/A', 
      trendUp: true,
    }
  ];

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

      {/* Linha 1: Grade Uniforme de KPIs */}
      <motion.section 
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6"
      >
        {metricCards.map((stat, i) => (
          <motion.article 
            key={i}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          >
            <Card className="hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between h-full min-h-[140px]" variant="solid">
              <div className="flex items-start justify-between gap-2">
                <Typography variant="label" color="muted" className="text-[10px] font-black uppercase tracking-wider">{stat.label}</Typography>
                <BadgeDelta value={stat.trend} isPositive={stat.trendUp} isNeutral={stat.trend === '-'} />
              </div>
              <div className="mt-4 mb-2">
                <span className={cn("text-3xl font-black font-display tracking-tight text-white", stat.color)}>
                  <CountUp 
                    end={stat.val} 
                    decimals={stat.suffix === ' dias' ? 0 : 2} 
                    decimal="," 
                    prefix={stat.prefix} 
                    suffix={stat.suffix} 
                    duration={1.5} 
                    separator="." 
                  />
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">{stat.trendLabel}</span>
            </Card>
          </motion.article>
        ))}
      </motion.section>

      {/* Linha Principal: Desempenho Comercial & Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visao !== 'operacional' && (
          <div className="lg:col-span-2">
            <Card padding="none" variant="solid" className="h-full flex flex-col justify-between">
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="space-y-0.5">
                  <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Desempenho Comercial</Typography>
                  <Typography variant="caption" color="muted">Faturamento vs Lucro Bruto</Typography>
                </div>
                <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold uppercase tracking-widest">
                  {periodoDatas}
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div 
                  className="h-72 w-full mt-2" 
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
                      <RechartsAreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorFatAnt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.08}/>
                            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip content={({ active, payload, label }) => {
                          if (active && payload?.length) {
                            return (
                              <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl ring-1 ring-white/10 min-w-[180px]">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{label}</p>
                                <div className="space-y-2.5">
                                  {payload.map((entry: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between gap-6">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{entry.name}</span>
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
                        <Area type="monotone" dataKey="faturamentoAnt" name="Período Anterior" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorFatAnt)" />
                        <Area type="monotone" dataKey="faturamento" name="Faturamento Atual" stroke="#fbbf24" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFat)" />
                      </RechartsAreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-white/5">
                  {[
                    { label: 'Melhor Dia', val: Math.max(...chartData.map((d: any) => d.faturamento), 0) },
                    { label: 'Média Diária', val: chartData.length > 0 ? chartData.reduce((acc: any, d: any) => acc + d.faturamento, 0) / chartData.length : 0 },
                    { label: 'Total Período', val: chartData.reduce((acc: any, d: any) => acc + d.faturamento, 0) },
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
            </Card>
          </div>
        )}

        {/* Meta Gauge */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col items-center justify-center h-full text-center" variant="solid">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white mb-2">Meta Mensal</Typography>
            <Typography variant="caption" color="muted">Percentual de Atingimento</Typography>
            <div className="w-full flex justify-center py-2">
              <MetaGaugeChart faturamento={stats.faturamento} meta={filial?.meta_mensal || 0} />
            </div>
            {(!filial || !filial.meta_mensal) && (
              <div className="mt-2">
                 <Typography variant="label" color="muted">Nenhuma meta configurada nas definições da filial.</Typography>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Gráficos Secundários Analíticos (Grid Simétrico de 3 Colunas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Funil de Vendas */}
        <Card padding="none" variant="solid" className="flex flex-col">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Funil de Vendas</Typography>
            <Typography variant="caption" color="muted">Eficiência por etapa do pedido</Typography>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <FunnelChart data={workerData.funnelData || []} />
          </div>
        </Card>

        {/* Mix de Vendas */}
        <Card padding="none" variant="solid" className="flex flex-col">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Mix de Vendas</Typography>
            <Typography variant="caption" color="muted">Top Categorias mais vendidas</Typography>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {topProducts.length === 0 ? (
              <EmptyState 
                icon={<PieChart size={32} className="text-slate-500" />} 
                title="Mix vazio" 
                description="Sem movimentação de produtos no período." 
              />
            ) : (
              <div className="flex flex-col gap-6">
                <div className="h-32 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topProducts} cx="50%" cy="50%" innerRadius={42} outerRadius={55} paddingAngle={4} dataKey="receita" stroke="none">
                        {topProducts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#22d3ee', '#fbbf24', '#10b981', '#818cf8', '#fb7185'][index]} />
                        ))}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload?.length) {
                          return (
                            <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-3 rounded-2xl shadow-2xl">
                              <p className="text-[10px] font-black text-white uppercase">{payload[0].name}</p>
                              <p className="text-xs font-black text-teal-400 mt-1">{fmt(payload[0].value as number)}</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <Typography variant="label" color="muted" className="!text-[9px] uppercase tracking-widest font-black">Total</Typography>
                     <span className="text-sm font-black text-white font-display">{fmt(topProducts.reduce((acc: any, p: any) => acc + p.receita, 0))}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {topProducts.slice(0, 3).map((p: any, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ['#22d3ee', '#fbbf24', '#10b981'][i] }} />
                          <span className="text-slate-300 truncate max-w-[120px]">{p.nome}</span>
                        </div>
                        <span className="text-white pl-2">{p.percent.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Aging Contas a Receber */}
        <Card padding="none" variant="solid" className="flex flex-col">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Aging Receber</Typography>
            <Typography variant="caption" color="muted">Distribuição de contas vencidas por faixas</Typography>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
             <AgingChart data={workerData.agingData || []} />
          </div>
        </Card>
      </div>

      {/* Projeções Financeiras & RFM (Grid de 2 Colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Previsão de Recebimentos */}
        <div className="lg:col-span-7">
          <Card padding="none" variant="solid" className="h-full flex flex-col">
            <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
              <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Fluxo de Caixa (Previsão)</Typography>
              <Typography variant="caption" color="muted">Valores a receber previstos para os próximos 7 dias</Typography>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
               <CashFlowProjection data={workerData.cashFlowData || []} />
            </div>
          </Card>
        </div>

        {/* Segmentação RFM */}
        <div className="lg:col-span-5">
          <Card padding="none" variant="solid" className="h-full flex flex-col">
            <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
              <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Segmentação RFM</Typography>
              <Typography variant="caption" color="muted">Classificação analítica dos clientes ativos</Typography>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
               <RfmSegmentation data={workerData.rfmData || []} />
            </div>
          </Card>
        </div>
      </div>

      {/* Terceira Linha: Vitalidade, CRM & Ações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Métricas Vitais & Saúde do Sistema */}
        <Card variant="solid" className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
               <Activity size={16} className="text-teal-400" />
               <span className="text-[10px] font-black text-white uppercase tracking-widest">Saúde Operacional</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Contato', val: workerData.healthMetrics?.contato || 0, color: 'text-teal-400' },
                { label: 'Mix', val: workerData.healthMetrics?.mix || 0, color: 'text-indigo-400' },
                { label: 'Entrega', val: workerData.healthMetrics?.entrega || 0, color: 'text-amber-400' }
              ].map((m, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="relative w-12 h-12 rounded-full flex items-center justify-center border border-white/10 bg-slate-900/50">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="24" cy="24" r="21" stroke="#1e293b" strokeWidth="2.5" fill="none" />
                      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="131.9" strokeDashoffset={131.9 - (131.9 * m.val) / 100} className={`${m.color} transition-all duration-1000`} />
                    </svg>
                    <span className="text-[9px] font-black text-white">{Math.round(m.val)}%</span>
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <HealthCheckCard />
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
             <FiscalHubCard />
          </div>
        </Card>

        {/* Vendedores / Ranking RCAs */}
        <Card padding="none" variant="solid" className="flex flex-col">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Desempenho Comercial Vendedores</Typography>
            <Typography variant="caption" color="muted">Top 5 faturamento no período</Typography>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
             <RcaRankingChart data={workerData.rcaRanking || []} />
          </div>
        </Card>

        {/* CRM / Alertas de Ação Comercial */}
        <Card padding="none" variant="solid" className="flex flex-col">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
            <div>
              <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Alertas Operacionais & CRM</Typography>
              <Typography variant="caption" color="muted">Ações preditivas sugeridas pela IA</Typography>
            </div>
            <Badge variant="red">{alerts.length}</Badge>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-3.5">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-slate-500 font-bold text-xs uppercase tracking-wider">
                  Nenhum alerta crítico ativo
                </div>
              ) : (
                alerts.slice(0, 3).map(a => (
                  <div key={a.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4 hover:bg-white/[0.04] transition-all">
                    <div className={cn("p-2 rounded-lg flex-shrink-0 flex items-center justify-center h-8 w-8", a.tone === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400')}>
                      <Zap size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[11px] font-black text-white truncate uppercase tracking-wider">{a.title}</span>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-3.5">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ação CRM Automatizada</span>
                 <TrendingUp size={12} className="text-indigo-400" />
              </div>
              <Button size="sm" variant="secondary" className="w-full !rounded-xl !text-[10px] font-black uppercase py-2.5">Ativar Campanha Comercial</Button>
            </div>
          </div>
        </Card>
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
        useToastStore.getState().addToast(`NFes emitidas com sucesso!`, 'success');
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
        <Badge variant="green" className="!py-0 !text-[8px]">EMISSÃO AUTOMÁTICA</Badge>
      </div>
      <Button 
        size="sm" 
        variant="secondary" 
        className="w-full !rounded-lg !text-[10px] font-black uppercase py-2"
        onClick={handleEmit}
        loading={isEmitting}
      >
        {isEmitting ? 'Processando...' : 'Processar NFes Pendentes'}
      </Button>
    </div>
  );
}
