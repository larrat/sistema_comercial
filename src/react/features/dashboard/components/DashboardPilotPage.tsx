import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  Zap,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { fiscalService } from '../../pedidos/services/fiscalService';
import { useToastStore } from '../../../app/lib/useToastStore';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useDashboardStore, type Periodo, type Visao } from '../store/useDashboardStore';
import { DateRangeSlicer } from './DateRangeSlicer';
import { useQueryState, parseAsString } from 'nuqs';
import { useDashboardData } from '../hooks/useDashboardData';
import { useGlobalAlerts } from '../hooks/useGlobalAlerts';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { exportDashboardToCSV } from '../../relatorios/utils/exportEngine';
import { PageHeader, PillGroup, Button, LoadingState, ErrorState, ActionMenu, Card, Typography } from '../../../shared/ui';
import { HealthCheckCard } from './HealthCheckCard';
import { FunnelChart } from './FunnelChart';
import { RcaRankingChart } from './RcaRankingChart';
import { MetaGaugeChart } from './MetaGaugeChart';
import { AgingChart } from './AgingChart';
import { CashFlowProjection } from './CashFlowProjection';
import { RfmSegmentation } from './RfmSegmentation';
import { MetricsGrid } from './MetricsGrid';
import { SalesPerformanceChart } from './SalesPerformanceChart';
import { SalesMixCard } from './SalesMixCard';
import { ChartFilterProvider } from '../../../app/components/charts';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../../shared/ui/index';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

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
              <p className="text-white text-center text-sm font-medium text-slate-400">{content}</p>
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

function DashboardPilotPageContent({ onNavigatePage, onReload }: DashboardPilotPageProps = {}) {
  const { reload } = useDashboardData();
  const navigate = useNavigate();
  
  const { 
    periodo, setPeriodo, 
    visao, setVisao,
    filial,
    status, error 
  } = useDashboardStore();

  const [periodoUrl, setPeriodoUrl] = useQueryState('periodo', parseAsString.withDefault('30'));
  const [visaoUrl, setVisaoUrl] = useQueryState('visao', parseAsString.withDefault('macro'));

  useEffect(() => {
    if (periodoUrl) setPeriodo(periodoUrl as Periodo);
  }, [periodoUrl, setPeriodo]);

  useEffect(() => {
    if (visaoUrl) setVisao(visaoUrl as Visao);
  }, [visaoUrl, setVisao]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { alerts } = useGlobalAlerts();
  const { workerData } = useDashboardMetrics();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await reload();
    setIsRefreshing(false);
  };

  if (status === 'error') return <ErrorState title="Falha ao carregar dashboard" description={error || ''} onRetry={reload} />;
  if (status === 'loading' || !workerData) return <LoadingState description="Consolidando indicadores comerciais..." />;
  
  const { stats, chartData, periodoDatas, topProducts, financeMetrics } = workerData;

  return (
    <div className="flex-1 w-full flex flex-col gap-8 animate-in fade-in duration-500">
      <PageHeader
        kicker="Inteligência"
        title="Dashboard"
        description="Visão consolidada de performance, saúde operacional e projeções financeiras."
        actions={
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5">
                <DateRangeSlicer 
                  value={periodoUrl}
                  onChange={(val) => setPeriodoUrl(val)}
                />
            </div>

            <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5">
              <PillGroup
                options={[
                  { id: 'macro', label: 'Visão Macro' },
                  { id: 'vendas', label: 'Vendas/CRM' },
                  { id: 'produtos', label: 'Catálogo' },
                  { id: 'clientes', label: 'Base de Clientes' }
                ]}
                activeId={visaoUrl}
                onChange={(id) => setVisaoUrl(id)}
              />
            </div>

            <ActionMenu 
              items={[
                {
                  label: 'Imprimir / PDF',
                  icon: <FileText size={16} />,
                  onClick: () => window.print()
                },
                {
                  label: 'Exportar Dados (CSV)',
                  icon: <FileSpreadsheet size={16} />,
                  onClick: () => exportDashboardToCSV(workerData, periodoUrl || 'mes')
                }
              ]}
              align="end"
            >
              <Button 
                variant="secondary" 
                leftIcon={<Download size={14} />}
                className="!rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
              >
                Exportar
              </Button>
            </ActionMenu>

            <Button 
              variant="secondary" 
              onClick={handleRefresh} 
              loading={isRefreshing}
              leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              className="!rounded-xl"
            >
              {isRefreshing ? 'Atualizar' : 'Atualizar'}
            </Button>
          </div>
        }
      />

      {/* Linha 1: Grade Uniforme de KPIs */}
      <MetricsGrid stats={stats} financeMetrics={financeMetrics} periodo={periodo} />

      {/* Linha Principal: Desempenho Comercial & Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visao !== 'operacional' && (
          <div className="lg:col-span-2">
            <SalesPerformanceChart 
              chartData={chartData} 
              stats={stats} 
              periodoDatas={periodoDatas}
              onDrillDown={(p) => setPeriodoUrl(p)}
            />
          </div>
        )}

        {/* Meta Gauge */}
        <div className={visao === 'operacional' ? 'lg:col-span-3' : 'lg:col-span-1'}>
          <Card className="flex flex-col items-center justify-center h-full text-center transition-all duration-300 hover:shadow-2xl border-t-2! border-t-[#C5A059]" variant="glass">
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
        <Card padding="none" variant="glass" className="flex flex-col h-full transition-all duration-300 hover:scale-[1.01] hover:shadow-xl border-t-2! border-t-indigo-400">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Funil de Vendas</Typography>
            <Typography variant="caption" color="muted">Eficiência por etapa do pedido</Typography>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <FunnelChart data={workerData.funnelData || []} />
          </div>
        </Card>

        {/* Mix de Vendas */}
        <SalesMixCard topProducts={topProducts} />

        {/* Aging Contas a Receber */}
        <Card padding="none" variant="glass" className="flex flex-col h-full transition-all duration-300 hover:scale-[1.01] hover:shadow-xl border-t-2! border-t-emerald-400">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Atraso de Recebíveis (Aging)</Typography>
                <PremiumTooltip content="O Aging (Cronologia de Contas a Receber) organiza todos os valores que os clientes devem à sua empresa com base no tempo de atraso das faturas. Ele permite identificar rapidamente quais dívidas estão vencidas há pouco tempo (de 1 a 30 dias) e quais correm alto risco de inadimplência (mais de 90 dias), ajudando nas ações de cobrança e na saúde do fluxo de caixa.">
                  <HelpCircle size={13} className="text-slate-400 cursor-help hover:text-white transition-colors animate-pulse" />
                </PremiumTooltip>
              </div>
              <Typography variant="caption" color="muted">Distribuição de contas vencidas por faixas</Typography>
            </div>
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
          <Card padding="none" variant="glass" className="h-full flex flex-col transition-all duration-300 hover:shadow-2xl border-t-2! border-t-[#C5A059]">
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
          <Card padding="none" variant="glass" className="h-full flex flex-col transition-all duration-300 hover:shadow-2xl border-t-2! border-t-teal-400">
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
        <Card variant="glass" className="flex flex-col h-full gap-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl border-t-2! border-t-teal-400">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
               <Activity size={16} className="text-teal-400" />
               <span className="text-white text-sm font-medium text-slate-400">Saúde Operacional</span>
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
                      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="131.9" strokeDashoffset={131.9 - (131.9 * m.val) / 100} className={`${m.color}transition-all duration-1000`} />
                    </svg>
                    <span className="text-[9px] font-black text-white">{Math.round(m.val)}%</span>
                  </div>
                  <span className="text-sm font-medium text-slate-400">{m.label}</span>
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
        <Card padding="none" variant="glass" className="flex flex-col h-full transition-all duration-300 hover:scale-[1.01] hover:shadow-xl border-t-2! border-t-indigo-400">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Desempenho Comercial Vendedores</Typography>
            <Typography variant="caption" color="muted">Top 5 faturamento no período</Typography>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
             <RcaRankingChart data={workerData.rcaRanking || []} />
          </div>
        </Card>

        {/* CRM / Alertas de Ação Comercial */}
        <Card padding="none" variant="glass" className="flex flex-col h-full transition-all duration-300 hover:scale-[1.01] hover:shadow-xl border-t-2! border-t-rose-400">
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
                <div className="py-8 text-center text-sm font-medium text-slate-400">
                  Nenhum alerta crítico ativo
                </div>
              ) : (
                alerts.slice(0, 3).map(a => (
                  <div key={a.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4 hover:bg-white/[0.04] transition-all">
                    <div className={cn("p-2 rounded-lg flex-shrink-0 flex items-center justify-center h-8 w-8", a.tone === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400')}>
                      <Zap size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-white truncate text-sm font-medium text-slate-400">{a.title}</span>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-3.5">
                 <span className="text-sm font-medium text-slate-400">Ação CRM Automatizada</span>
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
  
  const activeFilial = useDashboardStore((s) => s.filial);
  const isFiscal = activeFilial?.is_fiscal ?? false;

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

  if (!isFiscal) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
        <ShieldAlert className="w-6 h-6 text-slate-500 mb-2" />
        <span className="block text-sm font-medium text-slate-400">Filial Não Fiscal</span>
        <span className="text-[8px] text-slate-500 block mt-1">Faturamento e SEFAZ desativados nesta unidade.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-4 h-4 text-emerald-400" />
           <span className="text-white text-sm font-medium text-slate-400">Fiscal Hub</span>
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

export function DashboardPilotPage(props: DashboardPilotPageProps) {
  return (
    <ChartFilterProvider>
      <DashboardPilotPageContent {...props} />
    </ChartFilterProvider>
  );
}
