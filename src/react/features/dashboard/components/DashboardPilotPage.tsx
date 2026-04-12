import { useMemo } from 'react';
import { useFilialStore } from '../../../app/useFilialStore';
import type { Cliente, Pedido, Produto } from '../../../../types/domain';
import { useDashboardStore, type Periodo } from '../store/useDashboardStore';

// ── Formatters ────────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmt(v: number) {
  return BRL.format(Number(v || 0));
}
function pct(v: number) {
  return v.toFixed(1) + '%';
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function getRange(periodo: Periodo): [Date, Date] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (periodo === 'semana') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0, 0, 0, 0);
    return [d, now];
  }
  if (periodo === 'mes') return [new Date(y, m, 1), now];
  if (periodo === 'ano') return [new Date(y, 0, 1), now];
  return [new Date(2000, 0, 1), now];
}

function inRange(ds: string | undefined, range: [Date, Date]): boolean {
  if (!ds) return false;
  const d = new Date(ds + 'T00:00:00');
  return d >= range[0] && d <= range[1];
}

function getProxAnivDate(dataAniversario: string | undefined, baseDate: Date): Date | null {
  if (!dataAniversario) return null;
  const parts = dataAniversario.split('-');
  if (parts.length < 3) return null;
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day)) return null;
  let aniv = new Date(baseDate.getFullYear(), month, day);
  if (aniv < baseDate) aniv = new Date(baseDate.getFullYear() + 1, month, day);
  return aniv;
}

// ── Derived data computation ──────────────────────────────────────────────────

function computeDerivedData(
  pedidos: Pedido[],
  produtos: Produto[],
  clientes: Cliente[],
  periodo: Periodo
) {
  const range = getRange(periodo);
  const entregues = pedidos.filter((p) => p.status === 'entregue' && inRange(p.data, range));

  const fat = entregues.reduce((a, p) => a + (p.total || 0), 0);
  const lucro = entregues.reduce((a, p) => {
    const itens = Array.isArray(p.itens) ? p.itens : [];
    return a + itens.reduce((b, i) => b + (i.preco - i.custo) * i.qty, 0);
  }, 0);
  const mg = fat > 0 ? (lucro / fat) * 100 : 0;
  const tk = entregues.length ? fat / entregues.length : 0;
  const abertos = pedidos.filter((p) =>
    ['orcamento', 'confirmado', 'em_separacao'].includes(p.status)
  ).length;

  // Stock alerts — use esal (stored on-hand qty) + emin
  const crit = produtos.filter((p) => (p.emin ?? 0) > 0 && (p.esal ?? 0) <= 0);
  const baixo = produtos.filter(
    (p) => (p.emin ?? 0) > 0 && (p.esal ?? 0) > 0 && (p.esal ?? 0) < (p.emin ?? 0)
  );

  // Birthday alerts (next 7 days)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 7);

  const anivProximos = clientes
    .map((c) => {
      const data = getProxAnivDate(c.data_aniversario, hoje);
      if (!data || data > limite) return null;
      return { ...c, _anivData: data };
    })
    .filter((c): c is Cliente & { _anivData: Date } => c !== null)
    .sort((a, b) => a._anivData.getTime() - b._anivData.getTime());

  // Status counts
  const stMap: Record<string, number> = {
    orcamento: 0,
    confirmado: 0,
    em_separacao: 0,
    entregue: 0,
    cancelado: 0
  };
  pedidos.forEach((p) => {
    if (p.status in stMap) stMap[p.status]++;
  });

  // Top 5 produtos by revenue
  const pq: Record<string, number> = {};
  entregues.forEach((p) => {
    (Array.isArray(p.itens) ? p.itens : []).forEach((i) => {
      pq[i.nome] = (pq[i.nome] ?? 0) + i.qty * i.preco;
    });
  });
  const topProdutos = Object.entries(pq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxTopFat = topProdutos[0]?.[1] || 1;

  // Chart groups (last 10 data points)
  const grupos: Record<string, { fat: number; lucro: number }> = {};
  entregues.forEach((p) => {
    const d = new Date((p.data ?? '') + 'T00:00:00');
    const k =
      periodo === 'ano'
        ? MES_LABEL[d.getMonth()] + '/' + String(d.getFullYear()).slice(2)
        : (p.data ?? '');
    if (!grupos[k]) grupos[k] = { fat: 0, lucro: 0 };
    grupos[k].fat += p.total || 0;
    const itens = Array.isArray(p.itens) ? p.itens : [];
    grupos[k].lucro += itens.reduce((a, i) => a + (i.preco - i.custo) * i.qty, 0);
  });
  const chartKeys = Object.keys(grupos).sort().slice(-10);
  const maxChartFat = Math.max(...chartKeys.map((k) => grupos[k].fat), 1);

  return {
    entregues,
    fat,
    lucro,
    mg,
    tk,
    abertos,
    crit,
    baixo,
    anivProximos,
    stMap,
    topProdutos,
    maxTopFat,
    grupos,
    chartKeys,
    maxChartFat,
    hoje
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PeriodSelector({ periodo, onChange }: { periodo: Periodo; onChange: (p: Periodo) => void }) {
  const PERIODS: { value: Periodo; label: string }[] = [
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Mês' },
    { value: 'ano', label: 'Ano' },
    { value: 'tudo', label: 'Tudo' }
  ];
  return (
    <div className="pseg" data-testid="dash-period-selector">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          className={periodo === p.value ? 'on' : ''}
          onClick={() => onChange(p.value)}
          type="button"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function DashKpis({
  fat,
  lucro,
  mg,
  tk,
  abertos,
  entreguesCount,
  allPedsCount
}: {
  fat: number;
  lucro: number;
  mg: number;
  tk: number;
  abertos: number;
  entreguesCount: number;
  allPedsCount: number;
}) {
  return (
    <div className="mg dash-bento-band dash-bento-band--metrics" data-testid="dash-kpis">
      <div className="met metric-card">
        <div className="metric-card__eyebrow">Receita</div>
        <div className="ml">Faturamento</div>
        <div className="mv kpi-value-sm" data-testid="kpi-fat">
          {fmt(fat)}
        </div>
        <div className="ms metric-card__foot">{entreguesCount} entregue(s)</div>
      </div>
      <div className="met metric-card">
        <div className="metric-card__eyebrow">Resultado</div>
        <div className="ml">Lucro bruto</div>
        <div
          className={`mv kpi-value-sm ${lucro >= 0 ? 'tone-success' : 'tone-critical'}`}
          data-testid="kpi-lucro"
        >
          {fmt(lucro)}
        </div>
        <div className="ms metric-card__foot">
          {lucro >= 0 ? 'Operação saudável' : 'Abaixo do esperado'}
        </div>
      </div>
      <div className="met metric-card">
        <div className="metric-card__eyebrow">Eficiência</div>
        <div className="ml">Margem</div>
        <div
          className={`mv ${mg >= 15 ? 'tone-success' : mg >= 8 ? 'tone-warning' : 'tone-critical'}`}
          data-testid="kpi-mg"
        >
          {pct(mg)}
        </div>
        <div className="ms metric-card__foot">
          {mg >= 15 ? 'Boa zona de margem' : mg >= 8 ? 'Atenção' : 'Revisar mix e preço'}
        </div>
      </div>
      <div className="met metric-card">
        <div className="metric-card__eyebrow">Conversão</div>
        <div className="ml">Ticket médio</div>
        <div className="mv kpi-value-sm" data-testid="kpi-tk">
          {fmt(tk)}
        </div>
        <div className="ms metric-card__foot">Base {allPedsCount} pedido(s)</div>
      </div>
      <div className="met metric-card">
        <div className="metric-card__eyebrow">Pipeline</div>
        <div className="ml">Em aberto</div>
        <div className="mv tone-warning" data-testid="kpi-abertos">
          {abertos}
        </div>
        <div className="ms metric-card__foot">Orçamentos e confirmados</div>
      </div>
    </div>
  );
}

function DashAlerts({
  crit,
  baixo,
  anivProximos,
  hoje
}: {
  crit: Produto[];
  baixo: Produto[];
  anivProximos: Array<Cliente & { _anivData: Date }>;
  hoje: Date;
}) {
  if (!crit.length && !baixo.length && !anivProximos.length) {
    return (
      <div className="empty-inline table-cell-muted" data-testid="dash-alerts-empty">
        Sem alertas no momento.
      </div>
    );
  }

  return (
    <div data-testid="dash-alerts">
      {crit.length > 0 && (
        <div className="alert al-r dash-alert-card" data-testid="dash-alert-crit">
          <div className="dash-alert-card__title">
            <b>Estoque crítico</b>
          </div>
          <div className="dash-alert-card__copy">
            {crit.length} produto{crit.length !== 1 ? 's' : ''} zerado
            {crit.length !== 1 ? 's' : ''}.{' '}
            {crit
              .slice(0, 3)
              .map((p) => p.nome)
              .join(', ')}
            {crit.length > 3 ? '...' : ''}
          </div>
        </div>
      )}
      {baixo.length > 0 && (
        <div className="alert al-a dash-alert-card" data-testid="dash-alert-baixo">
          <div className="dash-alert-card__title">
            <b>Estoque em atenção</b>
          </div>
          <div className="dash-alert-card__copy">
            {baixo.length} item{baixo.length !== 1 ? 'ns' : ''} abaixo do mínimo.{' '}
            {baixo
              .slice(0, 3)
              .map((p) => p.nome)
              .join(', ')}
            {baixo.length > 3 ? '...' : ''}
          </div>
        </div>
      )}
      {anivProximos.length > 0 && (
        <div className="alert al-g" data-testid="dash-alert-aniv">
          <b>Aniversários próximos:</b>{' '}
          {anivProximos
            .slice(0, 3)
            .map((c) => {
              const dias = Math.round(
                (c._anivData.getTime() - hoje.getTime()) / 86400000
              );
              const nome = c.apelido || c.nome;
              if (dias === 0) return `${nome} hoje`;
              if (dias === 1) return `${nome} amanhã`;
              return `${nome} em ${dias} dias`;
            })
            .join(', ')}
          {anivProximos.length > 3 ? '...' : ''}
        </div>
      )}
    </div>
  );
}

function DashChart({
  chartKeys,
  grupos,
  maxFat
}: {
  chartKeys: string[];
  grupos: Record<string, { fat: number; lucro: number }>;
  maxFat: number;
}) {
  if (!chartKeys.length) {
    return (
      <div className="empty dash-empty-compact" data-testid="dash-chart-empty">
        <p>Sem pedidos entregues no período</p>
      </div>
    );
  }
  return (
    <div data-testid="dash-chart">
      <div className="barchart">
        {chartKeys.map((k) => {
          const g = grupos[k];
          const fatPct = Math.max(2, (g.fat / maxFat) * 100);
          const lucroPct = Math.max(0, (g.lucro / maxFat) * 100);
          return (
            <div key={k} className="barchart__group" title={`${k}: ${fmt(g.fat)}`}>
              <div className="barchart__bars">
                <span
                  className="barchart__bar barchart__bar--fat"
                  style={{ height: `${fatPct}%` }}
                />
                <span
                  className="barchart__bar barchart__bar--lucro"
                  style={{ height: `${lucroPct}%` }}
                />
              </div>
              <div className="barchart__label">{k}</div>
            </div>
          );
        })}
      </div>
      <div className="dash-chart-legend">
        <span>
          <span className="dash-legend-swatch dash-legend-swatch--fat" />
          Faturamento
        </span>
        <span>
          <span className="dash-legend-swatch dash-legend-swatch--lucro" />
          Lucro
        </span>
      </div>
    </div>
  );
}

function DashStatusPedidos({ stMap }: { stMap: Record<string, number> }) {
  const STATUS_LABELS: Record<string, string> = {
    orcamento: 'Orçamento',
    confirmado: 'Confirmado',
    em_separacao: 'Em separação',
    entregue: 'Entregue',
    cancelado: 'Cancelado'
  };
  const total = Object.values(stMap).reduce((a, v) => a + v, 0);
  return (
    <div data-testid="dash-status-pedidos">
      {Object.entries(STATUS_LABELS).map(([key, label]) => {
        const count = stMap[key] ?? 0;
        const pctVal = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={key} className="dash-status-row">
            <span className="dash-status-label">{label}</span>
            <span className="dash-status-bar">
              <span
                className={`dash-status-fill dash-status-fill--${key}`}
                style={{ width: `${pctVal}%` }}
              />
            </span>
            <span className="dash-status-count">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function DashTopProdutos({
  topProdutos,
  maxFat
}: {
  topProdutos: Array<[string, number]>;
  maxFat: number;
}) {
  if (!topProdutos.length) {
    return (
      <div className="empty-inline table-cell-muted" data-testid="dash-top-empty">
        Sem dados no período.
      </div>
    );
  }
  return (
    <div data-testid="dash-top-produtos">
      {topProdutos.map(([nome, fat]) => (
        <div key={nome} className="dash-top-row">
          <span className="dash-top-label" title={nome}>
            {nome.length > 28 ? nome.slice(0, 28) + '…' : nome}
          </span>
          <span className="dash-top-bar">
            <span
              className="dash-top-fill"
              style={{ width: `${Math.max(4, (fat / maxFat) * 100)}%` }}
            />
          </span>
          <span className="dash-top-value">{fmt(fat)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export function DashboardPilotPage() {
  const periodo = useDashboardStore((s) => s.periodo);
  const pedidos = useDashboardStore((s) => s.pedidos);
  const produtos = useDashboardStore((s) => s.produtos);
  const clientes = useDashboardStore((s) => s.clientes);
  const status = useDashboardStore((s) => s.status);
  const error = useDashboardStore((s) => s.error);
  const setPeriodo = useDashboardStore((s) => s.setPeriodo);
  const filialId = useFilialStore((s) => s.filialId);

  const derived = useMemo(
    () => computeDerivedData(pedidos, produtos, clientes, periodo),
    [pedidos, produtos, clientes, periodo]
  );

  const periodoLabels: Record<Periodo, string> = {
    semana: 'Esta semana',
    mes: 'Este mês',
    ano: 'Este ano',
    tudo: 'Todos os períodos'
  };

  return (
    <div className="dash-bento-page" data-testid="dashboard-pilot-page">
      {/* Toolbar */}
      <div className="page-controls-bar toolbar toolbar-shell toolbar-shell--page">
        <div className="fg2">
          <span className="table-cell-muted" style={{ fontSize: '0.85em' }}>
            {filialId ?? '—'} — {periodoLabels[periodo]}
          </span>
          <PeriodSelector periodo={periodo} onChange={setPeriodo} />
        </div>
      </div>

      {error && (
        <div className="alert al-r" data-testid="dash-pilot-error">
          {error}
        </div>
      )}

      {status === 'loading' && (
        <div className="sk-card" data-testid="dash-pilot-loading">
          <div className="sk-line" />
          <div className="sk-line" />
          <div className="sk-line" />
        </div>
      )}

      {status === 'ready' && (
        <>
          {/* KPI band */}
          <DashKpis
            fat={derived.fat}
            lucro={derived.lucro}
            mg={derived.mg}
            tk={derived.tk}
            abertos={derived.abertos}
            entreguesCount={derived.entregues.length}
            allPedsCount={pedidos.length}
          />

          {/* Operação rápida */}
          <section className="dash-section dash-section--operacao dash-bento-panel dash-bento-panel--ops">
            <div className="dash-section-head">
              <h3>Operação rápida</h3>
              <p>Ações que precisam de decisão agora</p>
            </div>
            <DashAlerts
              crit={derived.crit}
              baixo={derived.baixo}
              anivProximos={derived.anivProximos}
              hoje={derived.hoje}
            />
          </section>

          {/* Análise */}
          <section className="dash-section dash-section--analise dash-bento-panel dash-bento-panel--analysis">
            <div className="dash-section-head">
              <h3>Análise do negócio</h3>
              <p>Leitura de desempenho e tendência comercial</p>
            </div>

            {/* Chart + Status */}
            <div className="dash-grid-main dash-bento-grid dash-bento-grid--primary">
              <div className="card card-shell dash-card dash-card--hero dash-bento-card dash-bento-card--chart">
                <div className="ct">Faturamento e lucro</div>
                <DashChart
                  chartKeys={derived.chartKeys}
                  grupos={derived.grupos}
                  maxFat={derived.maxChartFat}
                />
              </div>
              <div className="card card-shell dash-card dash-bento-card dash-bento-card--status">
                <div className="ct">Status dos pedidos</div>
                <DashStatusPedidos stMap={derived.stMap} />
              </div>
            </div>

            {/* Top produtos */}
            <div className="dash-grid-cards dash-grid-cards--analise">
              <div className="card card-shell dash-card dash-card--top dash-bento-card">
                <div className="ct">Top produtos</div>
                <DashTopProdutos
                  topProdutos={derived.topProdutos}
                  maxFat={derived.maxTopFat}
                />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
