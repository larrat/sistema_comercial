import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart as RechartsAreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Sector
} from 'recharts';
import ReactCountUp from 'react-countup';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DonutChart, 
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
  Zap
} from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';


import { useDashboardStore, type Periodo, type Visao } from '../store/useDashboardStore';
import { useDashboardData } from '../hooks/useDashboardData';
import { LoadingState, ErrorState, StatusBadge, Button, Badge, Card, Typography } from '../../../shared/ui';
import { HealthCheckCard } from './HealthCheckCard';
import type { Pedido, PedidoItem } from '../../../../types/domain';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => BRL.format(v || 0);

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  orcamento: { label: 'Orçamento', color: '#94A3B8' },
  em_andamento: { label: 'Em andamento', color: '#6366F1' },
  em_separacao: { label: 'Em separação', color: '#C5A059' },
  entregue_aguardando_pagamento: { label: 'Entregue · aguardando pgto', color: '#F59E0B' },
  pago_aguardando_entrega: { label: 'Pago · aguardando entrega', color: '#8B5CF6' },
  concluido: { label: 'Concluído', color: '#10B981' },
  cancelado: { label: 'Cancelado', color: '#EF4444' }
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
  const [activePieIndex, setActivePieIndex] = useState(-1);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await reload();
    setIsRefreshing(false);
  };

  // --- Cálculos ---
  const stats = useMemo(() => {
    // Vendas Reais: Apenas pedidos que já saíram do orçamento/andamento/separação e não foram cancelados
    // Idealmente: entregue, pago ou concluído.
    const statusVenda = ['entregue_aguardando_pagamento', 'pago_aguardando_entrega', 'concluido'];
    const vendasReais = pedidos.filter(p => statusVenda.includes(p.status));
    
    // Todos os pedidos que não foram cancelados (para ticket médio operacional se necessário, mas usaremos vendas reais por consistência)
    const faturamento = vendasReais.reduce((acc, p) => acc + Number(p.total || 0), 0);
    
    let lucroTotal = 0;
    vendasReais.forEach(p => {
      const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || [])) as PedidoItem[];
      items.forEach(item => {
        const preco = Number(item.preco || 0);
        const custo = Number(item.custo || 0);
        const qty = Number(item.qty || 0);
        lucroTotal += (preco - custo) * qty;
      });
    });

    const ticketMedio = vendasReais.length > 0 ? faturamento / vendasReais.length : 0;
    const valorEmAberto = contasReceber.reduce((acc, c) => acc + Number(c.valor_em_aberto || 0), 0);
    
    return {
      vendasReais,
      faturamento,
      lucroTotal,
      margem: faturamento > 0 ? (lucroTotal / faturamento) * 100 : 0,
      ticketMedio,
      valorEmAberto,
      totalPedidos: vendasReais.length,
      pedidosEntregues: vendasReais.length, // Já filtrado por status real de venda
      pedidosPendentes: contasReceber.length
    };
  }, [pedidos, contasReceber]);

  const chartData = useMemo(() => {
    const groups: Record<string, { name: string; faturamento: number; lucro: number }> = {};
    
    // IMPORTANTE: O gráfico deve usar a MESMA base das stats (vendasReais) para ser "Certeiro"
    stats.vendasReais.forEach(p => {
      const date = new Date(p.data || '');
      let key = '';
      let label = '';
      
      if (periodo === 'semana') {
        key = date.toISOString().slice(0, 10);
        label = `${date.getDate()}/${date.getMonth() + 1}`;
      } else if (periodo === 'mes') {
        const week = Math.ceil(date.getDate() / 7);
        key = `W${week}`;
        label = `Semana ${week}`;
      } else {
        key = date.toISOString().slice(0, 7);
        label = date.toLocaleString('pt-BR', { month: 'short' });
      }

      if (!groups[key]) groups[key] = { name: label, faturamento: 0, lucro: 0 };
      groups[key].faturamento += Number(p.total || 0);
      
      const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || [])) as PedidoItem[];
      items.forEach(item => {
        groups[key].lucro += (Number(item.preco || 0) - Number(item.custo || 0)) * Number(item.qty || 0);
      });
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [stats.vendasReais, periodo]);

  const periodoDatas = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (periodo === 'semana') {
      const day = now.getDay();
      start.setDate(now.getDate() - day);
      end.setDate(now.getDate() + (6 - day));
    } else if (periodo === 'mes') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (periodo === 'ano') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else {
      if (!pedidos.length) return 'Todo o período';
      const dates = pedidos.map(p => new Date(p.data || ''));
      start = new Date(Math.min(...dates.map(d => d.getTime())));
      end = new Date(Math.max(...dates.map(d => d.getTime())));
    }
    
    const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    return `${fmtDate(start)} — ${fmtDate(end)}`;
  }, [pedidos, periodo]);

  const topProducts = useMemo(() => {
    const productSales: Record<string, { nome: string; receita: number }> = {};
    
    // Criar mapa de produto_pai para agrupamento inteligente
    const parentMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    produtos.forEach(p => {
      if (p.produto_pai_id) parentMap.set(p.id, p.produto_pai_id);
      nameMap.set(p.id, p.nome);
    });

    stats.vendasReais.forEach(p => {
      const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || [])) as PedidoItem[];
      items.forEach(item => {
        if (!item.prodId) return;
        
        // Se for filho, agrupar no ID do pai. Caso contrário, usar o próprio ID.
        const effectiveId = parentMap.get(item.prodId) || item.prodId;
        const effectiveName = nameMap.get(effectiveId) || item.nome || 'Produto';
        
        if (!productSales[effectiveId]) {
          productSales[effectiveId] = { 
            nome: effectiveName, 
            receita: 0
          };
        }
        productSales[effectiveId].receita += Number(item.preco || 0) * Number(item.qty || 0);
      });
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.receita - a.receita);
  }, [stats.vendasReais]);

  const topProductsColors = [
    'var(--chart-primary)', 
    'var(--chart-secondary)', 
    'var(--chart-tertiary)', 
    'var(--chart-quaternary)', 
    'var(--chart-quinary)'
  ];

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.1))' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 14}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.3}
        />
      </g>
    );
  };

  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    pedidos.forEach(p => {
      dist[p.status] = (dist[p.status] || 0) + 1;
    });
    
    // Identifica se há algum status não mapeado no STATUS_CONFIG
    const knownKeys = Object.keys(STATUS_CONFIG);
    const otherCount = pedidos.filter(p => !knownKeys.includes(p.status)).length;
    if (otherCount > 0) {
      dist['outros'] = otherCount;
    }
    
    return dist;
  }, [pedidos]);

  const healthMetrics = useMemo(() => {
    const totalClientes = clientes.length;
    const comContato = clientes.filter(c => c.whatsapp || c.email).length;
    
    const totalProdutos = produtos.length;
    const comEstoque = produtos.filter(p => Number(p.esal || 0) > 0).length;
    
    const produtosVendidos = new Set();
    pedidos.forEach(p => {
      if (p.status === 'cancelado') return;
      const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || [])) as PedidoItem[];
      items.forEach(i => produtosVendidos.add(i.prodId));
    });

    const validPedidos = pedidos.filter(p => p.status !== 'cancelado');
    const entregues = validPedidos.filter(p => ['entregue_aguardando_pagamento', 'concluido'].includes(p.status)).length;

    return {
      contato: totalClientes > 0 ? (comContato / totalClientes) * 100 : 0,
      estoque: totalProdutos > 0 ? (comEstoque / totalProdutos) * 100 : 0,
      mix: totalProdutos > 0 ? (produtosVendidos.size / totalProdutos) * 100 : 0,
      entrega: validPedidos.length > 0 ? (entregues / validPedidos.length) * 100 : 0,
      zeroStockCount: totalProdutos - comEstoque
    };
  }, [clientes, produtos, pedidos]);

  const customerMetrics = useMemo(() => {
    const total = clientes.length;
    const comWhats = clientes.filter(c => c.whatsapp).length;
    const comEmail = clientes.filter(c => c.email).length;
    const optIn = clientes.filter(c => c.optin_marketing).length;
    
    const compradores = new Set();
    pedidos.forEach(p => {
      if (p.status !== 'cancelado') compradores.add(p.cliente_id);
    });

    return {
      total,
      comWhats,
      comEmail,
      optIn,
      compraram: compradores.size,
      coberturaWhats: total > 0 ? (comWhats / total) * 100 : 0
    };
  }, [clientes, pedidos]);

  const alerts = useMemo(() => {
    const list = [];
    const semBaixaPedidos = pedidos.filter(p => p.status === 'entregue_aguardando_pagamento');
    if (semBaixaPedidos.length > 0) {
      const p = semBaixaPedidos[0];
      const clienteNome = clientes.find(c => c.id === p.cliente_id)?.nome || 'Cliente';
      list.push({
        id: 'sem-baixa',
        title: `${semBaixaPedidos.length} pedido${semBaixaPedidos.length > 1 ? 's' : ''} entregue${semBaixaPedidos.length > 1 ? 's' : ''} sem baixa`,
        desc: `${clienteNome} · R$ ${fmt(p.total)} em aberto`,
        link: `/app/pedidos/${p.id}`,
        tone: 'warning'
      });
    }

    if (healthMetrics.zeroStockCount > 0) {
      list.push({
        id: 'estoque-zero',
        title: `Ruptura detectada em ${healthMetrics.zeroStockCount} itens`,
        desc: 'Nexus AI: Risco de perda de venda imediata',
        link: '/app/estoque',
        tone: 'danger',
        isPredictive: true
      });
    }

    if (filial?.meta_mensal && stats.faturamento < filial.meta_mensal * 0.5) {
      list.push({
        id: 'meta-risco',
        title: 'Meta mensal em risco',
        desc: 'Nexus AI: Projeção atual indica 15% abaixo do alvo',
        link: '/app/dashboard',
        tone: 'warning',
        isPredictive: true
      });
    }

    if (healthMetrics.mix < 10 && stats.totalPedidos > 0) {
      list.push({
        id: 'mix-baixo',
        title: 'Mix ativo crítico',
        desc: 'Baixa diversificação de portfólio no período',
        link: '/app/produtos',
        tone: 'danger',
        isPredictive: false
      });
    }

    const vencidas = contasReceber.filter(c => c.vencimento && new Date(c.vencimento) < new Date()).length;
    if (vencidas > 0) {
      const valorVencido = contasReceber
        .filter(c => c.vencimento && new Date(c.vencimento) < new Date())
        .reduce((acc, c) => acc + Number(c.valor_em_aberto || 0), 0);
      list.push({
        id: 'contas-vencidas',
        title: `${vencidas} conta(s) vencida(s)`,
        desc: `R$ ${fmt(valorVencido)} em atraso`,
        link: '/app/receber',
        tone: 'danger'
      });
    }

    return list;
  }, [pedidos, stats, healthMetrics, contasReceber]);

  if (status === 'loading') return <LoadingState description="Consolidando indicadores..." />;
  if (status === 'error') return <ErrorState title="Falha ao carregar dashboard" description={error || ''} onRetry={reload} />;

  const getHealthTone = (val: number, thresholds: [number, number]) => {
    if (val >= thresholds[0]) return 'success';
    if (val >= thresholds[1]) return 'warning';
    return 'danger';
  };

  return (
    <div className="rf-dashboard">
      {/* Topbar */}
      <header className="rf-dashboard-topbar">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="rf-dashboard-title">Dashboard</h1>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rf-dashboard-filters"
        >
          <div className="rf-pill-group">
            {(['semana', 'mes', 'ano', 'tudo'] as Periodo[]).map(p => (
              <button 
                key={p} 
                className={`rf-pill ${periodo === p ? 'is-active' : ''}`}
                onClick={() => setPeriodo(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <div className="rf-pill-group">
            {(['operacional', 'gerencial', 'analitico'] as Visao[]).map(v => (
              <button 
                key={v} 
                className={`rf-pill ${visao === v ? 'is-active' : ''}`}
                onClick={() => setVisao(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <Button 
            variant="secondary" 
            onClick={handleRefresh} 
            loading={isRefreshing}
            leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </motion.div>
      </header>

      {/* Linha 1: Stat Cards */}
      <motion.section 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        className="rf-dashboard-row rf-dashboard-row--1"
      >
        <motion.article 
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="rf-dash-card"
        >
          <span className="rf-stat-label">Faturamento</span>
          <div className="rf-stat-value">
            <CountUp 
              end={stats.faturamento} 
              decimals={2} 
              decimal="," 
              prefix="R$ " 
              duration={2} 
              separator="."
            />
          </div>
          <span className="rf-stat-sub muted">{stats.pedidosEntregues} entregue(s) no período</span>
        </motion.article>

        {visao !== 'operacional' && (
          <motion.article 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="rf-dash-card is-success"
          >
            <span className="rf-stat-label">Lucro bruto</span>
            <div className="rf-stat-value text-emerald-400">
              <CountUp 
                end={stats.lucroTotal} 
                decimals={2} 
                decimal="," 
                prefix="R$ " 
                duration={2.5} 
                separator="."
              />
            </div>
            <span className="rf-stat-sub success font-bold">
              <TrendingUp size={12} strokeWidth={3} /> Margem {stats.margem.toFixed(1)}%
            </span>
          </motion.article>
        )}

        <motion.article 
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="rf-dash-card"
        >
          <span className="rf-stat-label">Ticket médio</span>
          <div className="rf-stat-value">
            <CountUp 
              end={stats.ticketMedio} 
              decimals={2} 
              decimal="," 
              prefix="R$ " 
              duration={2.2} 
              separator="."
            />
          </div>
          <span className="rf-stat-sub muted">{stats.totalPedidos} pedido(s) no período</span>
        </motion.article>

        <motion.article 
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className={`rf-dash-card ${stats.valorEmAberto === 0 ? 'is-success' : 'is-warning'}`}
        >
          <span className="rf-stat-label">Em aberto</span>
          <div className={`rf-stat-value ${stats.valorEmAberto > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            <CountUp 
              end={stats.valorEmAberto} 
              decimals={2} 
              decimal="," 
              prefix="R$ " 
              duration={2.4} 
              separator="."
            />
          </div>
          <span className={`rf-stat-sub ${stats.valorEmAberto > 0 ? 'warning' : 'success'} font-bold`}>
            {stats.pedidosPendentes} pendências · {stats.valorEmAberto === 0 ? 'Quitado' : 'Aguardando'}
          </span>
        </motion.article>

        {visao !== 'operacional' && (
          <motion.article 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className={`rf-dash-card ${!filial?.meta_mensal ? 'is-warning' : ''}`}
          >
            <span className="rf-stat-label">Pacing mensal</span>
            {filial?.meta_mensal ? (
              <>
                <div className={`rf-stat-value ${stats.faturamento >= filial.meta_mensal ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <CountUp 
                    end={(stats.faturamento / filial.meta_mensal) * 100} 
                    decimals={1} 
                    decimal="," 
                    suffix="%" 
                    duration={2.6} 
                  />
                </div>
                <span className="rf-stat-sub muted">Meta: {fmt(filial.meta_mensal)}</span>
              </>
            ) : (
              <>
                <span className="rf-stat-value text-slate-400">—%</span>
                <span className="rf-stat-sub muted">Meta não configurada</span>
              </>
            )}
          </motion.article>
        )}
      </motion.section>

      {/* Linha Principal de Gráficos e Status */}
      <Grid numItemsLg={3} className="gap-6 mt-8">
        {/* Gráfico de Faturamento e Lucro (Ocupa 2 colunas no LG) */}
        {visao !== 'operacional' && (
          <Col numColSpanLg={2}>
            <div className="rf-card-premium h-full rf-glass-glow shadow-premium overflow-hidden">
              <div className="rf-card-premium__head">
                <div>
                  <h3 className="rf-card-premium__title">Faturamento e Lucro</h3>
                  <p className="rf-card-premium__subtitle">Projeção e performance histórica</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                  {periodoDatas}
                </div>
              </div>
              
              <div className="rf-card-premium__body">
                <div className="h-80 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsAreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-amber-vibrant)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--color-amber-vibrant)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-emerald-vibrant)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--color-emerald-vibrant)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        vertical={false} 
                        stroke="rgba(255,255,255,0.05)" 
                      />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis 
                        hide={true} 
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-950/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl ring-1 ring-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{label}</p>
                                <div className="space-y-2">
                                  {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between gap-8">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-[11px] font-bold text-slate-300 capitalize">{entry.name}</span>
                                      </div>
                                      <span className="text-xs font-black text-white">{fmt(entry.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="faturamento"
                        stroke="var(--color-amber-vibrant)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorFaturamento)"
                        animationDuration={1500}
                        dot={{ fill: 'var(--color-amber-vibrant)', r: 4, strokeWidth: 2, stroke: 'var(--surface-card)' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="lucro"
                        stroke="var(--color-emerald-vibrant)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorLucro)"
                        animationDuration={2000}
                        dot={{ fill: 'var(--color-emerald-vibrant)', r: 4, strokeWidth: 2, stroke: 'var(--surface-card)' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </RechartsAreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom Legend (Requested by user) */}
                <div className="flex justify-center gap-8 mt-4 mb-2">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-amber-vibrant)] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-emerald-vibrant)] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro</span>
                   </div>
                </div>

                {/* KPIs no rodapé do Card */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8 pt-6 border-t border-white/5">
                  <div className="px-4 first:pl-0 border-r border-white/5">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Melhor Dia</span>
                    <span className="block text-lg font-black text-white">
                      {fmt(Math.max(...chartData.map(d => d.faturamento), 0))}
                    </span>
                  </div>
                  <div className="px-4 border-r border-white/5">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média Diária</span>
                    <span className="block text-lg font-black text-white">
                      {fmt(chartData.length > 0 ? chartData.reduce((acc, d) => acc + d.faturamento, 0) / chartData.length : 0)}
                    </span>
                  </div>
                  <div className="px-4 border-r border-white/5">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Período</span>
                    <span className="block text-lg font-black text-white">
                      {fmt(chartData.reduce((acc, d) => acc + d.faturamento, 0))}
                    </span>
                  </div>
                  <div className="px-4 last:pr-0">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Margem Média</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-emerald-400">
                        {chartData.reduce((acc, d) => acc + d.faturamento, 0) > 0 
                          ? ((chartData.reduce((acc, d) => acc + d.lucro, 0) / chartData.reduce((acc, d) => acc + d.faturamento, 0)) * 100).toFixed(1)
                          : 0}%
                      </span>
                      <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        )}

        {/* Health Check & Alerts (Integrated into Grid) */}
        <Col numColSpanLg={1}>
          <HealthCheckCard />
          
          <div className="mt-6 flex flex-col gap-4">
            {alerts.slice(0, 2).map(alert => (
              <div key={alert.id} className={`p-4 rounded-2xl border ${alert.tone === 'danger' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'} rf-animate-fade`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={14} className={alert.tone === 'danger' ? 'text-rose-400' : 'text-amber-400'} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">{alert.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mb-3">{alert.desc}</p>
                <Button size="sm" variant="secondary" className="w-full !text-[10px] !py-1" onClick={() => navigate(alert.link)}>
                  Tratar agora
                </Button>
              </div>
            ))}
          </div>
        </Col>

        {/* Coluna Lateral: Status e Mix */}
        <Col>
          <div className="rf-card-premium h-full rf-glass shadow-premium flex flex-col overflow-hidden">
            <div className="rf-card-premium__head">
              <h3 className="rf-card-premium__title">Status dos Pedidos</h3>
              <div className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                {pedidos.length} TOTAL
              </div>
            </div>

            <div className="rf-card-premium__body flex-1 space-y-5">
              {[...Object.entries(STATUS_CONFIG), ...(statusDistribution['outros'] ? [['outros', { label: 'Outros', color: '#CBD5E1' }]] : [])].map(([key, config]: any) => {
                const count = statusDistribution[key] || 0;
                const perc = pedidos.length > 0 ? (count / pedidos.length) * 100 : 0;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{config.label}</span>
                      <span className="text-xs font-black text-white">{count}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${perc}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: config.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mix de Vendas Integrado */}
            <div className="p-6 pt-0">
              <div className="pt-6 border-t border-white/5">
                <span className="block text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Mix de Vendas</span>
                <div className="h-44">
                  <DonutChart
                    className="h-full"
                    data={topProducts}
                    category="receita"
                    index="nome"
                    valueFormatter={fmt}
                    colors={["amber", "indigo", "emerald", "cyan", "violet", "rose", "fuchsia", "sky", "lime", "orange"]}
                    showAnimation={true}
                    variant="donut"
                  />
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Grid>
      {/* Linha 3: Saúde + Clientes + Alertas */}
      <Grid numItemsLg={3} className="gap-6 mt-6">
        {visao !== 'operacional' && (
          <div className="rf-card-premium h-full rf-glass shadow-premium flex flex-col overflow-hidden">
            <div className="rf-card-premium__head">
              <div>
                <h3 className="rf-card-premium__title">Saúde da operação</h3>
                <p className="rf-card-premium__subtitle">Sinais de maturidade da base</p>
              </div>
            </div>
            
            <div className="rf-card-premium__body space-y-6">
              {[
                { label: 'Contato da base', sub: 'WhatsApp ou e-mail', val: healthMetrics.contato, th: [80, 50] },
                { label: 'Estoque saudável', sub: 'Produtos com saldo > 0', val: healthMetrics.estoque, th: [90, 70] },
                { label: 'Mix ativo', sub: 'Saída no período', val: healthMetrics.mix, th: [30, 10] },
                { label: 'Taxa de entrega', sub: 'Pedidos concluídos', val: healthMetrics.entrega, th: [70, 40] }
              ].map(m => (
                <div key={m.label} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{m.label}</span>
                      <span className="block text-[9px] text-slate-400">{m.sub}</span>
                    </div>
                    <span className="text-xs font-black text-white">{m.val.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${m.val}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ 
                        background: m.val >= m.th[0] ? '#10B981' : m.val >= m.th[1] ? '#F59E0B' : '#EF4444' 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Col>
          {visao === 'analitico' ? (
            <div className="rf-card-premium h-full rf-glass shadow-premium flex flex-col overflow-hidden">
              <div className="rf-card-premium__head">
                <div>
                  <h3 className="rf-card-premium__title">Base de clientes</h3>
                  <p className="rf-card-premium__subtitle">{customerMetrics.total} ativos</p>
                </div>
                <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                  {customerMetrics.coberturaWhats.toFixed(0)}% COBERTURA
                </div>
              </div>
              
              <div className="rf-card-premium__body space-y-6">
                {[
                  { label: 'Com WhatsApp', val: customerMetrics.comWhats, color: 'emerald' },
                  { label: 'Com e-mail', val: customerMetrics.comEmail, color: 'blue' },
                  { label: 'Opt-in campanhas', val: customerMetrics.optIn, color: 'indigo' },
                  { label: 'Compraram no período', val: customerMetrics.compraram, color: 'amber' }
                ].map(m => (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{m.label}</span>
                      <span className="text-xs font-black text-white">{m.val} / {customerMetrics.total}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.val / customerMetrics.total) * 100}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: m.color === 'emerald' ? '#10B981' : m.color === 'blue' ? '#3B82F6' : m.color === 'indigo' ? '#6366F1' : '#F59E0B' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rf-card-premium h-full rf-glass shadow-premium flex flex-col items-center justify-center text-center p-8 opacity-50 border-dashed">
              <HelpCircle size={40} className="text-slate-500 mb-4" />
              <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">Métricas de Base</h3>
              <p className="text-slate-400 text-xs mt-2">Disponível na visão Analítica</p>
            </div>
          )}
        </Col>

        <Col>
          <div className="rf-card-premium h-full rf-glass shadow-premium flex flex-col overflow-hidden">
            <div className="rf-card-premium__head">
              <div>
                <h3 className="rf-card-premium__title">Alertas e pendências</h3>
                <p className="rf-card-premium__subtitle">Ações que precisam de atenção</p>
              </div>
              <div className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                {alerts.length} PENDENTES
              </div>
            </div>

            <div className="rf-card-premium__body flex-1 space-y-4">
              {alerts.length > 0 ? alerts.map(a => (
                <div key={a.id} className="flex items-start gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-white/10 hover:bg-white/[0.04] transition-all">
                  <div className={`p-2 rounded-lg ${a.tone === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {a.isPredictive ? <Zap size={16} /> : <AlertCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-white truncate uppercase tracking-tight">{a.title}</span>
                      {a.isPredictive && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">NEXUS AI</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{a.desc}</p>
                  </div>
                  <button 
                    className="px-3 py-1 rounded text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-colors uppercase"
                    onClick={() => window.location.href = a.link}
                  >
                    VER
                  </button>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center gap-3">
                  <CheckCircle2 size={32} className="text-emerald-500/30" />
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Tudo limpo</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-black/10">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizado</span>
              <span className="text-[9px] font-bold text-slate-400">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </Col>
      </Grid>
    </div>
  );
}
