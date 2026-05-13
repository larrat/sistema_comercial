import { useEffect, useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

function PremiumChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-4 rounded-xl shadow-2xl z-[1000]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-700/50 pb-2">{label}</p>
      <div className="flex flex-col gap-2.5">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[11px] font-bold text-slate-300">{entry.name}</span>
            </div>
            <span className="text-[11px] font-black text-white whitespace-nowrap">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { MovimentoEstoque, Produto } from '../../../../types/domain';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { ChartCard, EmptyChartState } from '../../../app/components/charts';
import { EmptyState, ErrorState, StatCard, StatusBadge } from '../../../shared/ui';
import { markupToPrice } from '../hooks/useProdutoCalculations';
import {
  listMovimentacoesByProdutoIds,
  listPedidoItensByProdutoIds,
  listVariantesByPaiId,
  type VendaVarianteRow
} from '../services/produtosApi';
import ReactCountUp from 'react-countup';
const CountUp = (ReactCountUp as any).default || ReactCountUp;
import { Package, ShoppingCart, DollarSign, TrendingUp, Calendar, Info } from 'lucide-react';

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 25 }
  }
};

const PERIODOS = [30, 90, 365] as const;
type Periodo = (typeof PERIODOS)[number];

type PeriodConfig = {
  days: Periodo;
  label: string;
  bucket: 'week' | 'month';
};

type VariantMetric = {
  produto: Produto;
  color: string;
  saldo: number;
  vendido: number;
  receita: number;
  varejo: number;
  atacado: number;
  margem: number | null;
  giro: number | null;
};

type ChartRow = Record<string, string | number> & { label: string };

const PERIOD_CONFIG: Record<Periodo, PeriodConfig> = {
  30: { days: 30, label: '30 dias', bucket: 'week' },
  90: { days: 90, label: '90 dias', bucket: 'month' },
  365: { days: 365, label: '12 meses', bucket: 'month' }
};

const VARIANT_COLORS = ['#378ADD', '#1D9E75', '#D85A30', '#7F77DD'];
const PAI_COLOR = '#888780';

function getDateRange(days: number): { from: string; to: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

function getSaleDate(row: VendaVarianteRow): string {
  return row.pedido_data || row.criado_em || '';
}

function getBucketLabel(value: string, bucket: PeriodConfig['bucket']): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  if (bucket === 'week') {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(2)}`;
}

function getVariantColor(index: number): string {
  return VARIANT_COLORS[index % VARIANT_COLORS.length];
}

function calcSaldos(variantes: Produto[], movs: MovimentoEstoque[], from: string): Record<string, number> {
  const map: Record<string, number> = {};
  variantes.forEach((p) => {
    map[p.id] = Number(p.esal ?? 0);
  });

  // Limitação atual: não há estoque_posicao histórica; usamos posição atual ajustada por movimentos do período.
  [...movs]
    .filter((m) => !m.data || m.data >= from)
    .sort((a, b) => Number(a.ts ?? 0) - Number(b.ts ?? 0))
    .forEach((m) => {
      const id = m.prodId ?? m.prod_id;
      if (!id || !(id in map)) return;
      if (m.tipo === 'entrada') map[id] += Number(m.qty ?? 0);
      else if (m.tipo === 'saida' || m.tipo === 'transf') map[id] -= Number(m.qty ?? 0);
      else if (m.tipo === 'ajuste') map[id] = Number(m.saldo_real ?? m.saldoReal ?? 0);
    });
  return map;
}

function aggregateVendas(
  variantes: Produto[],
  vendas: VendaVarianteRow[]
): Record<string, { qty: number; receita: number }> {
  const map: Record<string, { qty: number; receita: number }> = {};
  variantes.forEach((p) => {
    map[p.id] = { qty: 0, receita: 0 };
  });
  vendas.forEach((v) => {
    if (v.produto_id in map) {
      const qty = Number(v.qty ?? 0);
      map[v.produto_id].qty += qty;
      map[v.produto_id].receita += qty * Number(v.preco ?? 0);
    }
  });
  return map;
}

function buildSeriesRows(
  variantes: Produto[],
  vendas: VendaVarianteRow[],
  period: PeriodConfig,
  value: 'qty' | 'receita'
): ChartRow[] {
  const rows = new Map<string, ChartRow>();
  vendas.forEach((sale) => {
    const label = getBucketLabel(getSaleDate(sale), period.bucket);
    const row = rows.get(label) ?? { label };
    const qty = Number(sale.qty ?? 0);
    row[sale.produto_id] = Number(row[sale.produto_id] ?? 0) + (value === 'qty' ? qty : qty * Number(sale.preco ?? 0));
    rows.set(label, row);
  });

  return [...rows.values()].map((row) => {
    variantes.forEach((variant) => {
      row[variant.id] = Number(row[variant.id] ?? 0);
    });
    return row;
  });
}

function shortName(nome: string): string {
  const clean = nome.trim();
  const parts = clean.split(/\s+/);
  return parts.length > 2 ? parts.slice(-2).join(' ') : clean;
}

function fmtQ(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(3);
}

function fmtCurrency(v: number): string {
  return Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

function fmtDays(value: number | null): string {
  if (value === null) return '—';
  if (value === 0) return '0 dias';
  return `${value.toFixed(1)} dias`;
}

function stockTone(saldo: number, emin: number): 'danger' | 'warning' | 'success' {
  if (saldo <= 0) return 'danger';
  if (emin > 0 && saldo < emin) return 'warning';
  return 'success';
}

function stockLabel(saldo: number, emin: number): string {
  if (saldo <= 0) return 'Zerado';
  if (emin > 0 && saldo < emin) return 'Baixo';
  return 'OK';
}

function getVarejo(produto: Produto): number {
  const custo = Number(produto.custo ?? 0);
  const pvv = Number(produto.pvv ?? 0);
  const mkv = Number(produto.mkv ?? 0);
  return pvv > 0 ? pvv : mkv > 0 ? markupToPrice(custo, mkv) : 0;
}

function getAtacado(produto: Produto): number {
  const custo = Number(produto.custo ?? 0);
  const pfa = Number(produto.pfa ?? 0);
  const mka = Number(produto.mka ?? 0);
  return pfa > 0 ? pfa : mka > 0 ? markupToPrice(custo, mka) : 0;
}

function getMargem(produto: Produto, varejo: number): number | null {
  if (varejo <= 0) return null;
  return ((varejo - Number(produto.custo ?? 0)) / varejo) * 100;
}

function getWeightedMargin(rows: VariantMetric[]): number | null {
  const receita = rows.reduce((acc, row) => acc + row.receita, 0);
  if (receita <= 0) return null;
  return rows.reduce((acc, row) => acc + (row.margem ?? 0) * row.receita, 0) / receita;
}

function getAverageGiro(rows: VariantMetric[]): number | null {
  const valid = rows.map((row) => row.giro).filter((value): value is number => value !== null);
  if (!valid.length) return null;
  return valid.reduce((acc, value) => acc + value, 0) / valid.length;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner" aria-hidden="true">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.05)]"
        style={{ backgroundColor: color }} 
      />
    </div>
  );
}

function StackedVariantChart({
  title,
  data,
  variantes,
  valueFormatter,
  emptyTitle,
  ySuffix
}: {
  title: string;
  data: ChartRow[];
  variantes: VariantMetric[];
  valueFormatter: (value: number) => string;
  emptyTitle: string;
  ySuffix?: string;
}) {
  const hasData = data.some((row) => variantes.some((variant) => Number(row[variant.produto.id] ?? 0) > 0));
  return (
    <ChartCard title={title}>
      {!hasData ? (
        <EmptyChartState title={emptyTitle} />
      ) : (
        <div className="rf-ui-chart produto-variant-chart" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {variantes.map((v, i) => (
                  <linearGradient key={`grad-${v.produto.id}`} id={`color-${v.produto.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={v.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={v.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.03)" strokeDasharray="3 3" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                tickFormatter={(value) => `${valueFormatter(Number(value))}${ySuffix ?? ''}`}
              />
              <Tooltip 
                content={<PremiumChartTooltip formatter={valueFormatter} />} 
                cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 1 }}
                wrapperStyle={{ outline: 'none' }}
              />
              {variantes.map((variant) => (
                <Area
                  key={variant.produto.id}
                  type="monotone"
                  dataKey={variant.produto.id}
                  name={variant.produto.nome}
                  stackId="variantes"
                  stroke={variant.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#color-${variant.produto.id})`}
                  animationDuration={1500}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function SimpleVariantChart({
  title,
  data,
  dataKey,
  colorKey,
  formatter,
  suffix,
  showSemVenda
}: {
  title: string;
  data: Array<{ label: string; value: number; color: string; semVenda?: boolean }>;
  dataKey: 'value';
  colorKey: 'color';
  formatter: (value: number) => string;
  suffix?: string;
  showSemVenda?: boolean;
}) {
  return (
    <ChartCard title={title}>
      <div className="rf-ui-chart produto-variant-chart" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {data.map((row, i) => (
                <linearGradient key={`bar-grad-${i}`} id={`bar-color-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={row.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={row.color} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.03)" strokeDasharray="3 3" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
              tickFormatter={(value) => `${formatter(Number(value))}${suffix ?? ''}`}
            />
            <Tooltip 
              content={<PremiumChartTooltip formatter={(v: any) => `${formatter(v)}${suffix ?? ''}`} />} 
              cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              wrapperStyle={{ outline: 'none' }}
            />
            <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} animationDuration={1200}>
              {data.map((row, i) => (
                <Cell key={`cell-${i}`} fill={`url(#bar-color-${i})`} />
              ))}
              {showSemVenda ? (
                <LabelList
                  dataKey="semVenda"
                  position="top"
                  formatter={(value: any) => (value ? '⚠ sem venda' : '')}
                  style={{ fill: '#f43f5e', fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
              ) : null}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

type Props = {
  produto: Produto;
};

export function ProdutoVariantesTab({ produto }: Props) {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

  const [variantes, setVariantes] = useState<Produto[]>([]);
  const [movs, setMovs] = useState<MovimentoEstoque[]>([]);
  const [vendas, setVendas] = useState<VendaVarianteRow[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>(90);
  const [loading, setLoading] = useState(true);
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [vendasDisponiveis, setVendasDisponiveis] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => getDateRange(periodo), [periodo]);
  const periodConfig = PERIOD_CONFIG[periodo];

  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.ready || !session?.access_token || !filialId) return;
    const ctx = { url: config.url, key: config.key, token: session.access_token, filialId };
    let cancelled = false;
    setLoading(true);
    setError(null);

    void listVariantesByPaiId(ctx, produto.id)
      .then(async (rows) => {
        if (cancelled) return;
        setVariantes(rows);
        if (rows.length) {
          const ids = rows.map((v) => v.id);
          const movimentacoes = await listMovimentacoesByProdutoIds(ctx, ids);
          if (!cancelled) setMovs(movimentacoes);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar variantes.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [produto.id, session?.access_token, filialId]);

  useEffect(() => {
    if (!variantes.length) return;
    const config = getSupabaseConfig();
    if (!config.ready || !session?.access_token || !filialId) return;
    const ctx = { url: config.url, key: config.key, token: session.access_token, filialId };
    let cancelled = false;
    setLoadingVendas(true);
    setVendasDisponiveis(true);

    void listPedidoItensByProdutoIds(
      ctx,
      variantes.map((v) => v.id),
      range.from,
      range.to
    )
      .then((rows) => {
        if (cancelled) return;
        setVendas(rows);
        setLoadingVendas(false);
      })
      .catch(() => {
        if (cancelled) return;
        setVendas([]);
        setVendasDisponiveis(false);
        setLoadingVendas(false);
      });

    return () => {
      cancelled = true;
    };
  }, [variantes, range.from, range.to, session?.access_token, filialId]);

  const saldos = useMemo(() => calcSaldos(variantes, movs, range.from), [variantes, movs, range.from]);
  const vendaAgg = useMemo(() => aggregateVendas(variantes, vendas), [variantes, vendas]);

  const metrics = useMemo<VariantMetric[]>(
    () =>
      variantes.map((variant, index) => {
        const saldo = Math.max(0, saldos[variant.id] ?? 0);
        const vendido = vendaAgg[variant.id]?.qty ?? 0;
        const receita = vendaAgg[variant.id]?.receita ?? 0;
        const varejo = getVarejo(variant);
        const atacado = getAtacado(variant);
        const margem = getMargem(variant, varejo);
        const giro = vendido > 0 ? saldo / (vendido / periodo) : null;
        return {
          produto: variant,
          color: getVariantColor(index),
          saldo,
          vendido,
          receita,
          varejo,
          atacado,
          margem,
          giro
        };
      }),
    [periodo, saldos, vendaAgg, variantes]
  );

  const totalSaldo = metrics.reduce((acc, row) => acc + row.saldo, 0);
  const totalVendido = metrics.reduce((acc, row) => acc + row.vendido, 0);
  const totalReceita = metrics.reduce((acc, row) => acc + row.receita, 0);
  const margemPai = getWeightedMargin(metrics);
  const giroMedio = getAverageGiro(metrics);
  const maxSaldo = Math.max(...metrics.map((row) => row.saldo), 0);

  const qtySeriesData = useMemo(
    () => buildSeriesRows(variantes, vendas, periodConfig, 'qty'),
    [periodConfig, vendas, variantes]
  );
  const receitaSeriesData = useMemo(
    () => buildSeriesRows(variantes, vendas, periodConfig, 'receita'),
    [periodConfig, vendas, variantes]
  );
  const margemChartData = useMemo(
    () => [
      ...metrics.map((row) => ({
        label: shortName(row.produto.nome),
        value: row.margem ?? 0,
        color: row.color
      })),
      { label: 'Produto pai', value: margemPai ?? 0, color: PAI_COLOR }
    ],
    [margemPai, metrics]
  );
  const giroChartData = useMemo(
    () =>
      metrics.map((row) => ({
        label: shortName(row.produto.nome),
        value: row.giro ?? 0,
        color: row.color,
        semVenda: row.vendido <= 0
      })),
    [metrics]
  );

  const periodSelector = (
    <div className="produto-variant-periods">
      {PERIODOS.map((p) => (
        <button
          key={p}
          type="button"
          className={`btn btn-sm${periodo === p ? ' btn-p' : ''}`}
          onClick={() => setPeriodo(p)}
          disabled={loadingVendas}
        >
          {PERIOD_CONFIG[p].label}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <section className="rf-cliente-profile__card">
        <p className="table-cell-muted">Carregando variantes...</p>
      </section>
    );
  }

  if (error) return <ErrorState title={error} compact />;

  if (!variantes.length) {
    return (
      <EmptyState
        title="Nenhuma variante cadastrada."
        description="Cadastre produtos com este como produto-pai para criar variantes."
        compact
      />
    );
  }

  return (
    <motion.div 
      className="rf-ui-stack produto-variant-tab"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <motion.section variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Variantes ({variantes.length})</h3>
            {!vendasDisponiveis && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                <Info size={10} />
                <span className="text-[9px] font-black uppercase">Homologando vendas</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Dados consolidados do produto pai no período selecionado.
          </p>
        </div>
        
        <div className="rf-pill-group">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              className={`rf-pill ${periodo === p ? 'is-active' : ''}`}
              onClick={() => setPeriodo(p)}
              disabled={loadingVendas}
            >
              {PERIOD_CONFIG[p].label}
            </button>
          ))}
        </div>
      </motion.section>

      <motion.section variants={item} className="rf-kpi-grid">
        <article className="rf-dash-card">
          <div className="flex items-center justify-between mb-4">
            <span className="rf-stat-label !mb-0">Saldo Total (Pai)</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <Package size={14} strokeWidth={2.5} />
            </div>
          </div>
          <div className="rf-stat-value">
            <CountUp end={totalSaldo} duration={2} separator="." />
            <span className="text-sm font-bold text-slate-400 ml-1.5">{produto.un || 'un'}</span>
          </div>
          <span className="rf-stat-sub muted font-bold">Soma de todas as variantes</span>
        </article>

        <article className="rf-dash-card">
          <div className="flex items-center justify-between mb-4">
            <span className="rf-stat-label !mb-0">Qtde Vendida</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
              <ShoppingCart size={14} strokeWidth={2.5} />
            </div>
          </div>
          <div className="rf-stat-value">
            <CountUp end={totalVendido} duration={2} separator="." />
          </div>
          <span className="rf-stat-sub muted font-bold">{PERIOD_CONFIG[periodo].label}</span>
        </article>

        <article className="rf-dash-card">
          <div className="flex items-center justify-between mb-4">
            <span className="rf-stat-label !mb-0">Receita Total</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
              <DollarSign size={14} strokeWidth={2.5} />
            </div>
          </div>
          <div className="rf-stat-value">
            <CountUp 
              end={totalReceita} 
              decimals={2} 
              decimal="," 
              prefix="R$ " 
              duration={2} 
              separator="."
            />
          </div>
          <span className="rf-stat-sub success font-bold">
            <TrendingUp size={12} strokeWidth={3} /> {PERIOD_CONFIG[periodo].label}
          </span>
        </article>

        <article className={`rf-dash-card ${giroMedio === null ? 'is-warning' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="rf-stat-label !mb-0">Giro Médio</span>
            <div className={`p-2 rounded-lg ${giroMedio === null ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'} shadow-sm`}>
              <Calendar size={14} strokeWidth={2.5} />
            </div>
          </div>
          <div className="rf-stat-value">
            <CountUp 
              end={giroMedio || 0} 
              decimals={giroMedio === null ? 0 : 1}
              decimal=","
              duration={2} 
            />
            <span className="text-sm font-bold text-slate-400 ml-1.5">dias</span>
          </div>
          <span className={`rf-stat-sub ${giroMedio === null ? 'warning' : 'muted'} font-bold`}>
            Cobertura de estoque
          </span>
        </article>
      </motion.section>

      <motion.section variants={item} className="rf-dash-card !p-0 overflow-hidden">
        <div className="rf-dash-card__header !p-6 border-b border-slate-50">
          <div className="flex-1">
            <span className="rf-stat-label !mb-1 text-slate-500">Relatório Detalhado</span>
            <h2 className="rf-dash-card__title text-base">Tabela de Variantes</h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Variante</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Varejo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendido</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {metrics.map((row) => {
                const emin = Number(row.produto.emin ?? 0);
                return (
                  <tr key={row.produto.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{row.produto.nome}</span>
                        <ProgressBar value={row.saldo} max={maxSaldo} color={row.color} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{row.produto.sku || '—'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{fmtQ(row.saldo)} <span className="text-[10px] text-slate-400">{row.produto.un}</span></td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.varejo > 0 ? fmtCurrency(row.varejo) : '—'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge tone={stockTone(row.saldo, emin)}>{stockLabel(row.saldo, emin)}</StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{fmtQ(row.vendido)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{fmtCurrency(row.receita)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-black ${row.margem && row.margem > 30 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {fmtPercent(row.margem)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50/80 font-black">
                <td className="px-6 py-5 text-sm text-slate-900 uppercase tracking-tight">Total Consolidado</td>
                <td className="px-6 py-5 text-slate-400">—</td>
                <td className="px-6 py-5 text-sm text-slate-900">{fmtQ(totalSaldo)} <span className="text-[10px] text-slate-400">{produto.un || 'un'}</span></td>
                <td className="px-6 py-5">—</td>
                <td className="px-6 py-5"><StatusBadge tone="neutral">Pai</StatusBadge></td>
                <td className="px-6 py-5 text-sm text-slate-900">{fmtQ(totalVendido)}</td>
                <td className="px-6 py-5 text-sm text-slate-900">{fmtCurrency(totalReceita)}</td>
                <td className="px-6 py-5 text-sm text-slate-900">{fmtPercent(margemPai)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        <StackedVariantChart
          title="Distribuição de Vendas (Qty)"
          data={qtySeriesData}
          variantes={metrics}
          valueFormatter={(value) => fmtQ(value)}
          emptyTitle="Sem vendas no período."
        />
        <StackedVariantChart
          title="Composição de Receita (R$)"
          data={receitaSeriesData}
          variantes={metrics}
          valueFormatter={(value) => fmtCurrency(value)}
          emptyTitle="Sem receita no período."
        />
        <SimpleVariantChart
          title="Margem por Variante (%)"
          data={margemChartData}
          dataKey="value"
          colorKey="color"
          formatter={(value) => value.toFixed(1)}
          suffix="%"
        />
        <SimpleVariantChart
          title="Cobertura de Estoque (Giro)"
          data={giroChartData}
          dataKey="value"
          colorKey="color"
          formatter={(value) => value.toFixed(1)}
          suffix=" dias"
          showSemVenda
        />
      </motion.div>

      <div className="flex flex-wrap items-center justify-center gap-6 py-8 border-t border-slate-50 mt-8">
        {metrics.map((row) => (
          <div key={row.produto.id} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{row.produto.nome}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: PAI_COLOR }} />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider italic">Produto Pai</span>
        </div>
      </div>
    </motion.div>
  );
}
