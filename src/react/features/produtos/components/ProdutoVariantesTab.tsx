import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

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

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 260, damping: 25 }
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
    <div className="produto-variant-progress" aria-hidden="true">
      <span style={{ width: `${pct}%`, background: color }} />
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
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--color-text-3)' }}
                tickFormatter={(value) => `${valueFormatter(Number(value))}${ySuffix ?? ''}`}
              />
              <Tooltip formatter={(value) => valueFormatter(Number(value))} />
              {variantes.map((variant) => (
                <Bar
                  key={variant.produto.id}
                  dataKey={variant.produto.id}
                  name={variant.produto.nome}
                  stackId="variantes"
                  fill={variant.color}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
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
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--color-text-3)' }}
              tickFormatter={(value) => `${formatter(Number(value))}${suffix ?? ''}`}
            />
            <Tooltip formatter={(value) => `${formatter(Number(value))}${suffix ?? ''}`} />
            <Bar dataKey={dataKey} fill="#378ADD" isAnimationActive={false} radius={[4, 4, 0, 0]}>
              {data.map((row) => (
                <Cell key={row.label} fill={row[colorKey]} />
              ))}
              {showSemVenda ? (
                <LabelList
                  dataKey="semVenda"
                  position="top"
                  formatter={(value) => (value ? 'sem venda' : '')}
                  style={{ fill: 'var(--color-text-3)', fontSize: 10 }}
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
      <motion.section variants={item} className="rf-cliente-profile__card produto-variant-head">
        <div>
          <h3 className="rf-cliente-profile__card-title">Variantes ({variantes.length})</h3>
          <p className="rf-cliente-profile__card-subtitle">
            Dados consolidados do produto pai no período selecionado.
            {!vendasDisponiveis ? ' Vendas aguardam pedido_itens em homologação.' : ''}
          </p>
        </div>
        {periodSelector}
      </motion.section>

      <motion.section variants={item} className="rf-ui-stats-grid">
        <StatCard label="Saldo total (pai)" value={`${fmtQ(totalSaldo)} ${produto.un || 'un'}`} foot="Soma das variantes" />
        <StatCard label="Qtde vendida" value={fmtQ(totalVendido)} foot={PERIOD_CONFIG[periodo].label} />
        <StatCard label="Receita" value={fmtCurrency(totalReceita)} foot={PERIOD_CONFIG[periodo].label} />
        <StatCard label="Giro médio" value={fmtDays(giroMedio)} foot="Dias de estoque" tone={giroMedio === null ? 'warning' : 'default'} />
      </motion.section>

      <motion.section variants={item} className="rf-cliente-profile__card">
        <div className="rf-cliente-profile__card-head">
          <h3 className="rf-cliente-profile__card-title">Tabela de variantes</h3>
        </div>
        <div className="rf-cliente-profile__table-wrap">
          <table className="rf-cliente-profile__table produto-variant-table">
            <thead>
              <tr>
                <th>Variante</th>
                <th>SKU</th>
                <th>Saldo</th>
                <th>Varejo</th>
                <th>Atacado</th>
                <th>Status</th>
                <th>Vendido</th>
                <th>Receita</th>
                <th>Margem</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row) => {
                const emin = Number(row.produto.emin ?? 0);
                return (
                  <tr key={row.produto.id}>
                    <td className="table-cell-strong">
                      {row.produto.nome}
                      <ProgressBar value={row.saldo} max={maxSaldo} color={row.color} />
                    </td>
                    <td className="table-cell-muted">{row.produto.sku || '—'}</td>
                    <td>{fmtQ(row.saldo)} {row.produto.un}</td>
                    <td>{row.varejo > 0 ? fmtCurrency(row.varejo) : '—'}</td>
                    <td>{row.atacado > 0 ? fmtCurrency(row.atacado) : '—'}</td>
                    <td><StatusBadge tone={stockTone(row.saldo, emin)}>{stockLabel(row.saldo, emin)}</StatusBadge></td>
                    <td>{fmtQ(row.vendido)}</td>
                    <td>{fmtCurrency(row.receita)}</td>
                    <td>{fmtPercent(row.margem)}</td>
                  </tr>
                );
              })}
              <tr className="produto-variant-total-row">
                <td className="table-cell-strong">Total (produto pai)</td>
                <td className="table-cell-muted">—</td>
                <td>{fmtQ(totalSaldo)} {produto.un || 'un'}</td>
                <td>—</td>
                <td>—</td>
                <td><StatusBadge tone="neutral">Consolidado</StatusBadge></td>
                <td>{fmtQ(totalVendido)}</td>
                <td>{fmtCurrency(totalReceita)}</td>
                <td>{fmtPercent(margemPai)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.div variants={item} className="produto-variant-charts-grid">
        <StackedVariantChart
          title="Qtde vendida por mês"
          data={qtySeriesData}
          variantes={metrics}
          valueFormatter={(value) => fmtQ(value)}
          emptyTitle="Sem vendas no período."
        />
        <StackedVariantChart
          title="Receita por mês (R$)"
          data={receitaSeriesData}
          variantes={metrics}
          valueFormatter={(value) => fmtCurrency(value)}
          emptyTitle="Sem receita no período."
        />
        <SimpleVariantChart
          title="Margem por variante (%)"
          data={margemChartData}
          dataKey="value"
          colorKey="color"
          formatter={(value) => value.toFixed(1)}
          suffix="%"
        />
        <SimpleVariantChart
          title="Giro de estoque (dias)"
          data={giroChartData}
          dataKey="value"
          colorKey="color"
          formatter={(value) => value.toFixed(1)}
          suffix=" dias"
          showSemVenda
        />
      </motion.div>

      <div className="produto-variant-legend" aria-label="Legenda das variantes">
        {metrics.map((row) => (
          <span key={row.produto.id}>
            <i style={{ background: row.color }} />
            {row.produto.nome}
          </span>
        ))}
        <span>
          <i style={{ background: PAI_COLOR }} />
          Produto pai
        </span>
      </div>
    </div>
  );
}
