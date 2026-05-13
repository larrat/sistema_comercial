import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Sector,
  Rectangle,
  Area,
  AreaChart
} from 'recharts';
import ReactCountUp from 'react-countup';
import { motion, AnimatePresence } from 'framer-motion';

// Fallback para garantir que CountUp seja um componente válido em produção (Vercel)
const CountUp = (ReactCountUp as any).default || ReactCountUp;
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';


import { useDashboardStore, type Periodo, type Visao } from '../store/useDashboardStore';
import { useDashboardData } from '../hooks/useDashboardData';
import { LoadingState, ErrorState, StatusBadge, Button, Badge, Card, Typography } from '../../../shared/ui';
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
    
    stats.vendasReais.forEach(p => {
      const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || [])) as PedidoItem[];
      items.forEach(item => {
        if (!item.prodId) return;
        
        if (!productSales[item.prodId]) {
          productSales[item.prodId] = { 
            nome: item.nome || 'Produto', 
            receita: 0
          };
        }
        productSales[item.prodId].receita += Number(item.preco || 0) * Number(item.qty || 0);
      });
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
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

      <section className="rf-dashboard-row rf-dashboard-row--2">
        {visao !== 'operacional' && (
          <Card className="flex-1 flex flex-col min-h-[480px]">
            <div className="flex flex-row items-center justify-between mb-8">
              <div>
                <Typography variant="h3" weight="bold">Faturamento e Lucro</Typography>
                <div className="flex items-center gap-2 mt-1">
                  <Typography variant="caption" color="muted">Projeção por período</Typography>
                  <span className="w-1 h-1 rounded-full bg-border-bold" />
                  <Badge variant="blue" className="text-[9px] uppercase">{periodoDatas}</Badge>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-secondary)] shadow-[0_0_12px_rgba(197,160,89,0.5)]" />
                  <Typography variant="label" color="muted">Faturamento</Typography>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-tertiary)] shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                  <Typography variant="label" color="muted">Lucro</Typography>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart 
                  data={chartData} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-secondary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--chart-secondary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLuc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-tertiary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--chart-tertiary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="4 4" 
                    vertical={false} 
                    stroke="rgba(255,255,255,0.03)" 
                  />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                    offset={20}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <Card padding="sm" className="min-w-[180px] bg-surface-sidebar/90 backdrop-blur-md border-border-bold">
                            <Typography variant="label" align="center" className="mb-3 pb-2 border-b border-border-subtle">
                              {payload[0].payload.name}
                            </Typography>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <Typography variant="caption" color="muted">Faturamento</Typography>
                                <Typography variant="body-sm" weight="bold" className="text-[var(--chart-secondary)]">{fmt(payload[0].value as number)}</Typography>
                              </div>
                              <div className="flex justify-between items-center">
                                <Typography variant="caption" color="muted">Lucro</Typography>
                                <Typography variant="body-sm" weight="bold" className="text-[var(--chart-tertiary)]">{fmt(payload[1].value as number)}</Typography>
                              </div>
                            </div>
                          </Card>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="faturamento" 
                    stroke="var(--chart-secondary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorFat)" 
                    animationDuration={1000}
                    activeDot={{ r: 6, fill: 'var(--chart-secondary)', stroke: '#020617', strokeWidth: 2 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lucro" 
                    stroke="var(--chart-tertiary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorLuc)" 
                    animationDuration={1200}
                    activeDot={{ r: 6, fill: 'var(--chart-tertiary)', stroke: '#020617', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Footer Legend/KPIs */}
            <div className="mt-8 pt-6 border-t border-border-subtle grid grid-cols-4 gap-0 divide-x divide-border-subtle">
              <div className="flex flex-col gap-1 px-4 first:pl-0">
                <Typography variant="label" color="muted">Melhor Dia</Typography>
                <Typography variant="body" weight="bold" color="primary">
                  {fmt(Math.max(...chartData.map(d => d.faturamento), 0))}
                </Typography>
              </div>
              <div className="flex flex-col gap-1 px-4">
                <Typography variant="label" color="muted">Média Diária</Typography>
                <Typography variant="body" weight="bold" color="primary">
                  {fmt(chartData.length > 0 ? chartData.reduce((acc, d) => acc + d.faturamento, 0) / chartData.length : 0)}
                </Typography>
              </div>
              <div className="flex flex-col gap-1 px-4">
                <Typography variant="label" color="muted">Total Período</Typography>
                <Typography variant="body" weight="bold" color="primary">
                  {fmt(chartData.reduce((acc, d) => acc + d.faturamento, 0))}
                </Typography>
              </div>
              <div className="flex flex-col gap-1 px-4 last:pr-0">
                <Typography variant="label" color="muted">Margem Média</Typography>
                <div className="flex items-center gap-2">
                  <Typography variant="body" weight="bold" className="text-emerald-400">
                    {chartData.reduce((acc, d) => acc + d.faturamento, 0) > 0 
                      ? ((chartData.reduce((acc, d) => acc + d.lucro, 0) / chartData.reduce((acc, d) => acc + d.faturamento, 0)) * 100).toFixed(1)
                      : 0}%
                  </Typography>
                  <TrendingUp size={14} className="text-emerald-500" />
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="flex flex-col min-h-[480px]">
          <div className="flex items-center justify-between mb-8 border-b border-border-subtle pb-4">
            <Typography variant="h3" weight="bold">Status dos pedidos</Typography>
            <div className="bg-surface-active px-3 py-1 rounded-full border border-border-bold">
              <Typography variant="label" color="accent" className="!tracking-tighter">
                {pedidos.length} TOTAL
              </Typography>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 flex-1">
            {[...Object.entries(STATUS_CONFIG), ...(statusDistribution['outros'] ? [['outros', { label: 'Outros', color: '#CBD5E1' }]] : [])].map(([key, config]: any) => {
              const count = statusDistribution[key] || 0;
              const perc = pedidos.length > 0 ? (count / pedidos.length) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: config.color }} />
                  <PremiumTooltip content={config.label}>
                    <Typography variant="body-sm" color="tertiary" className="w-[100px] truncate cursor-help">
                      {config.label}
                    </Typography>
                  </PremiumTooltip>
                  <div className="flex-1 h-[6px] bg-surface-hover rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.1)]" style={{ width: `${perc}%`, background: config.color }} />
                  </div>
                  <Typography variant="body-sm" weight="bold" color="primary" className="w-6 text-right">
                    {count}
                  </Typography>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 text-center">Mix de Vendas (Revenue Share)</h3>
            
            <div className="flex flex-col gap-6">
              <div className="h-[180px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      // @ts-ignore
                      activeIndex={activePieIndex}
                      activeShape={renderActiveShape}
                      data={topProducts}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="receita"
                      nameKey="nome"
                      stroke="none"
                      onMouseEnter={(_: any, index: number) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(-1)}
                    >
                      {topProducts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={topProductsColors[index % topProductsColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      position={{ x: 200, y: 0 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#0f172a]/95 backdrop-blur-md border border-border-bold p-3 rounded-lg shadow-2xl min-w-[150px]">
                              <Typography variant="caption" color="muted" weight="bold" className="mb-1 block border-b border-border-subtle pb-1">
                                {payload[0].name}
                              </Typography>
                              <div className="flex flex-col">
                                <Typography variant="h4" weight="black" color="accent">
                                  {fmt(payload[0].value as number)}
                                </Typography>
                                <Typography variant="label" className="text-[8px] opacity-50">PARTICIPAÇÃO NO MIX</Typography>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <Typography variant="h2" weight="black" color="primary" className="leading-none !text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                    {fmt(topProducts.reduce((acc, p) => acc + p.receita, 0))}
                  </Typography>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {topProducts.map((p, i) => {
                  const total = topProducts.reduce((acc, x) => acc + x.receita, 0);
                  const perc = total > 0 ? (p.receita / total) * 100 : 0;
                  const isActive = activePieIndex === i;
                  return (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between group transition-all duration-300 ${isActive ? 'translate-x-1' : ''}`}
                      onMouseEnter={() => setActivePieIndex(i)}
                      onMouseLeave={() => setActivePieIndex(-1)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform ${isActive ? 'scale-150' : ''}`} style={{ background: topProductsColors[i % topProductsColors.length] }} />
                        <PremiumTooltip content={p.nome}>
                          <Typography variant="body-sm" weight="bold" color={isActive ? 'primary' : 'secondary'} className="truncate cursor-help uppercase tracking-tight transition-colors">
                            {p.nome}
                          </Typography>
                        </PremiumTooltip>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Typography variant="body-sm" weight="black" className={isActive ? 'text-accent' : 'text-primary'}>
                          {perc.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="muted" className="min-w-[50px] text-right">
                          {fmt(p.receita)}
                        </Typography>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Linha 3: Saúde + Clientes + Alertas */}
      <section className="rf-dashboard-row rf-dashboard-row--3">
        {visao !== 'operacional' && (
          <Card>
            <div className="mb-6">
              <Typography variant="h3" weight="bold">Saúde da operação</Typography>
              <Typography variant="body-sm" color="muted">Sinais de maturidade da base</Typography>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Contato da base', sub: 'WhatsApp ou e-mail', val: healthMetrics.contato, th: [80, 50] },
                { label: 'Estoque saudável', sub: 'Produtos com saldo > 0', val: healthMetrics.estoque, th: [90, 70] },
                { label: 'Mix ativo', sub: 'Saída no período', val: healthMetrics.mix, th: [30, 10] },
                { label: 'Taxa de entrega', sub: 'Pedidos concluídos', val: healthMetrics.entrega, th: [70, 40] }
              ].map(m => (
                <div key={m.label} className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-white">{m.label}</p>
                    <p className="text-[10px] text-slate-500">{m.sub}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Typography variant="body-sm" weight="bold" color="primary">{m.val.toFixed(1)}%</Typography>
                    <StatusBadge tone={getHealthTone(m.val, m.th as [number, number])}>
                      {m.val >= m.th[0] ? 'Saudável' : m.val >= m.th[1] ? 'Atenção' : 'Crítico'}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {visao === 'analitico' && (
          <article className="rf-dash-card">
            <div className="rf-dash-card__header">
              <div>
                <h2 className="rf-dash-card__title">Base de clientes</h2>
                <p className="rf-dash-card__subtitle">{customerMetrics.total} clientes ativos</p>
              </div>
              <StatusBadge tone="success">{customerMetrics.coberturaWhats.toFixed(0)}% alcançável</StatusBadge>
            </div>
            
            <div className="flex flex-col gap-5 mt-2">
              {[
                { label: 'Com WhatsApp', val: customerMetrics.comWhats, color: '#1D9E75' },
                { label: 'Com e-mail', val: customerMetrics.comEmail, color: '#378ADD' },
                { label: 'Opt-in campanhas', val: customerMetrics.optIn, color: '#7F77DD' },
                { label: 'Compraram no período', val: customerMetrics.compraram, color: '#C47B0A' }
              ].map(m => (
                <div key={m.label} className="rf-dash-progress-row">
                  <div className="rf-dash-progress-info">
                    <span className="rf-dash-progress-label">{m.label}</span>
                    <span className="rf-dash-progress-value">{m.val} / {customerMetrics.total}</span>
                  </div>
                  <div className="rf-dash-progress-bar">
                    <div 
                      className="rf-dash-progress-fill" 
                      style={{ width: `${(m.val / customerMetrics.total) * 100}%`, background: m.color }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rf-dash-footer">
              <a href="/app/clientes" className="rf-dash-link">Ver clientes <ChevronRight size={14} /></a>
            </div>
          </article>
        )}

        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Typography variant="h3" weight="bold">Alertas e pendências</Typography>
              <Typography variant="body-sm" color="muted">Ações que precisam de atenção</Typography>
            </div>
            <Badge variant="yellow" className="px-2 py-0.5">
              {alerts.length}
            </Badge>
          </div>

          <div className="rf-dash-list mt-2">
            {alerts.length > 0 ? alerts.map(a => (
              <div key={a.id} className="rf-dash-list-item group">
                <div className={`rf-dash-list-item__icon ${a.tone === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'} ${a.isPredictive ? 'ring-2 ring-[#C5A059]/20' : ''}`}>
                  {a.isPredictive ? <ArrowUpRight size={18} className="text-[#C5A059]" /> : a.tone === 'danger' ? <AlertCircle size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="rf-dash-list-item__content">
                  <div className="flex items-center gap-2">
                    <p className="rf-dash-list-item__title">{a.title}</p>
                    {a.isPredictive && (
                      <span className="rf-badge-ai">NEXUS AI</span>
                    )}
                  </div>
                  <p className="rf-dash-list-item__desc">{a.desc}</p>
                </div>
                <a href={a.link} className="rf-dash-list-item__action hover:bg-surface-hover px-3 py-1 rounded-md transition-colors text-tertiary hover:text-primary">Ver</a>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <Typography variant="body-sm" weight="bold">Nenhuma pendência no momento</Typography>
                <Typography variant="caption" color="muted">Operação estável e saudável.</Typography>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-border-subtle">
            <Typography variant="label" color="muted">Última atualização: {new Date().toLocaleTimeString()}</Typography>
          </div>
        </Card>
      </section>
    </div>
  );
}
