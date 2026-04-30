import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCurrentUserRole } from '../../../app/hooks/useCurrentUserRole';
import { useFilialStore } from '../../../app/useFilialStore';
import type { Cliente, Pedido, Produto } from '../../../../types/domain';
import { useDashboardStore, type Periodo } from '../store/useDashboardStore';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge
} from '../../../shared/ui';
import { SystemBarChart } from '../../../app/components/charts';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MES_LABEL = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
];

type DashboardView = 'operacional' | 'gerencial' | 'analitico';
type DashboardRole = 'operador' | 'gerente' | 'admin';

const DASHBOARD_VIEW_LABELS: Record<DashboardView, string> = {
  operacional: 'Operacional',
  gerencial: 'Gerencial',
  analitico: 'Analítico'
};

const ROLE_LABELS: Record<DashboardRole, string> = {
  operador: 'Operação',
  gerente: 'Gestão',
  admin: 'Administração'
};

function fmt(v: number) {
  return BRL.format(Number(v || 0));
}

function pct(v: number) {
  return `${v.toFixed(1)}%`;
}

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
  const d = new Date(`${ds}T00:00:00`);
  return d >= range[0] && d <= range[1];
}

function getProxAnivDate(dataAniversario: string | undefined, baseDate: Date): Date | null {
  if (!dataAniversario) return null;
  const parts = dataAniversario.split('-');
  if (parts.length < 3) return null;
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;
  let aniv = new Date(baseDate.getFullYear(), month, day);
  if (aniv < baseDate) aniv = new Date(baseDate.getFullYear() + 1, month, day);
  return aniv;
}

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

  const crit = produtos.filter((p) => (p.emin ?? 0) > 0 && (p.esal ?? 0) <= 0);
  const baixo = produtos.filter(
    (p) => (p.emin ?? 0) > 0 && (p.esal ?? 0) > 0 && (p.esal ?? 0) < (p.emin ?? 0)
  );

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

  const todayIso = new Date().toISOString().slice(0, 10);
  const entreguesHoje = entregues.filter((p) => p.data === todayIso).length;
  const pipelineValue = pedidos
    .filter((p) => ['orcamento', 'confirmado', 'em_separacao'].includes(p.status))
    .reduce((sum, pedido) => sum + (pedido.total || 0), 0);
  const clientesComContato = clientes.filter((c) => c.tel || c.whatsapp || c.email).length;
  const produtosComSaldo = produtos.filter((p) => (p.esal ?? 0) > 0).length;
  const estoqueSaudavel = Math.max(produtos.length - crit.length - baixo.length, 0);
  const estoqueSaudavelPct = produtos.length > 0 ? (estoqueSaudavel / produtos.length) * 100 : 100;
  const taxaEntrega =
    pedidos.length > 0 ? ((stMap.entregue ?? 0) / Math.max(pedidos.length, 1)) * 100 : 0;
  const coberturaContatoPct =
    clientes.length > 0 ? (clientesComContato / Math.max(clientes.length, 1)) * 100 : 0;
  const mixAtivoPct =
    produtos.length > 0 ? (produtosComSaldo / Math.max(produtos.length, 1)) * 100 : 0;

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

  const grupos: Record<string, { fat: number; lucro: number }> = {};
  entregues.forEach((p) => {
    const d = new Date(`${p.data ?? ''}T00:00:00`);
    const k =
      periodo === 'ano'
        ? `${MES_LABEL[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
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
    hoje,
    entreguesHoje,
    pipelineValue,
    clientesComContato,
    estoqueSaudavelPct,
    taxaEntrega,
    coberturaContatoPct,
    mixAtivoPct
  };
}

function getPreferredDashboardView(role: DashboardRole): DashboardView {
  if (role === 'admin') return 'analitico';
  if (role === 'gerente') return 'gerencial';
  return 'operacional';
}

function getDashboardViewStorageKey(role: DashboardRole, filialId: string | null): string {
  return `sc_dashboard_view_v1:${role}:${filialId || 'sem-filial'}`;
}

function readStoredDashboardView(key: string, fallback: DashboardView): DashboardView {
  try {
    const raw = localStorage.getItem(key);
    if (raw === 'operacional' || raw === 'gerencial' || raw === 'analitico') return raw;
  } catch {
    // ignore invalid storage
  }
  return fallback;
}

function goToPage(page: string, onNavigatePage?: (page: string) => void) {
  if (onNavigatePage) {
    onNavigatePage(page);
  }
}

function DashboardSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="dash-section">
      <div className="dash-section-head">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function DashboardCard({
  title,
  children,
  className = '',
  action
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card card-shell dash-bento-card ${className}`.trim()}>
      <div className="dash-bento-card__head">
        <div className="ct">{title}</div>
        {action ? <div className="dash-bento-card__action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function DashboardContextStats({
  pedidosCount,
  produtosCount,
  clientesCount,
  entreguesHoje,
  sourceSummary,
  onNavigatePage
}: {
  pedidosCount: number;
  produtosCount: number;
  clientesCount: number;
  entreguesHoje: number;
  sourceSummary: string;
  onNavigatePage?: (page: string) => void;
}) {
  return (
    <div className="rf-dash-context-panel">
      <p className="rf-dash-context-panel__source">{sourceSummary}</p>
      <div className="rf-ui-stat-grid">
        <StatCard
          label="Pedidos na base"
          value={pedidosCount}
          description="Total de pedidos registrados na filial"
          foot={
            <button
              className="btn btn-ghost btn-xs"
              type="button"
              onClick={() => goToPage('pedidos', onNavigatePage)}
            >
              Abrir pedidos
            </button>
          }
        />
        <StatCard
          label="Produtos monitorados"
          value={produtosCount}
          description="Catálogo ativo com controle de estoque"
          foot={
            <button
              className="btn btn-ghost btn-xs"
              type="button"
              onClick={() => goToPage('produtos', onNavigatePage)}
            >
              Abrir produtos
            </button>
          }
        />
        <StatCard
          label="Clientes monitorados"
          value={clientesCount}
          description="Base de clientes cadastrada na filial"
          foot={
            <button
              className="btn btn-ghost btn-xs"
              type="button"
              onClick={() => goToPage('clientes', onNavigatePage)}
            >
              Abrir clientes
            </button>
          }
        />
        <StatCard
          label="Entregues hoje"
          value={entreguesHoje}
          tone={entreguesHoje > 0 ? 'success' : 'default'}
          description="Pedidos entregues na data de hoje"
          foot={
            <button
              className="btn btn-ghost btn-xs"
              type="button"
              onClick={() => goToPage('pedidos', onNavigatePage)}
            >
              Ver pedidos
            </button>
          }
        />
      </div>
    </div>
  );
}

function PeriodSelector({
  periodo,
  onChange
}: {
  periodo: Periodo;
  onChange: (p: Periodo) => void;
}) {
  const periods: { value: Periodo; label: string }[] = [
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Mês' },
    { value: 'ano', label: 'Ano' },
    { value: 'tudo', label: 'Tudo' }
  ];
  return (
    <div className="pseg" data-testid="dash-period-selector">
      {periods.map((p) => (
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

function DashboardViewSelector({
  view,
  onChange
}: {
  view: DashboardView;
  onChange: (view: DashboardView) => void;
}) {
  return (
    <div className="dash-view-selector" aria-label="Mudar objetivo do painel">
      {(Object.entries(DASHBOARD_VIEW_LABELS) as Array<[DashboardView, string]>).map(
        ([value, label]) => (
          <button
            key={value}
            className={view === value ? 'on' : ''}
            onClick={() => onChange(value)}
            type="button"
          >
            {label}
          </button>
        )
      )}
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
    <div className="rf-ui-stat-grid rf-ui-stat-grid--5" data-testid="dash-kpis">
      <StatCard
        label="Faturamento"
        value={fmt(fat)}
        description={`${entreguesCount} pedido(s) entregue(s) no período`}
      />
      <StatCard
        label="Lucro bruto"
        value={fmt(lucro)}
        description={lucro >= 0 ? 'Operação saudável' : 'Abaixo do esperado'}
        tone={lucro >= 0 ? 'success' : 'danger'}
      />
      <StatCard
        label="Margem"
        value={pct(mg)}
        description={mg >= 15 ? 'Boa zona de margem' : mg >= 8 ? 'Atenção' : 'Revisar mix e preço'}
        tone={mg >= 15 ? 'success' : mg >= 8 ? 'warning' : 'danger'}
      />
      <StatCard
        label="Ticket médio"
        value={fmt(tk)}
        description={`Base de ${allPedsCount} pedido(s)`}
      />
      <StatCard
        label="Em aberto"
        value={abertos}
        description="Orçamentos e pedidos confirmados"
        tone={abertos > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}

function DashAlerts({
  crit,
  baixo,
  anivProximos,
  hoje,
  onNavigatePage
}: {
  crit: Produto[];
  baixo: Produto[];
  anivProximos: Array<Cliente & { _anivData: Date }>;
  hoje: Date;
  onNavigatePage?: (page: string) => void;
}) {
  if (!crit.length && !baixo.length && !anivProximos.length) {
    return (
      <EmptyState
        compact
        title="Sem alertas no momento."
        description="A operação da filial está estável na leitura atual."
      />
    );
  }

  return (
    <div data-testid="dash-alerts">
      {crit.length > 0 && (
        <div className="alert al-r dash-alert-card">
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
          <div style={{ marginTop: 10 }}>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => goToPage('estoque', onNavigatePage)}
            >
              Ver estoque
            </button>
          </div>
        </div>
      )}
      {baixo.length > 0 && (
        <div className="alert al-a dash-alert-card">
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
          <div style={{ marginTop: 10 }}>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => goToPage('estoque', onNavigatePage)}
            >
              Revisar estoque
            </button>
          </div>
        </div>
      )}
      {anivProximos.length > 0 && (
        <div className="alert al-g">
          <b>Aniversários próximos:</b>{' '}
          {anivProximos
            .slice(0, 3)
            .map((c) => {
              const dias = Math.round((c._anivData.getTime() - hoje.getTime()) / 86400000);
              const nome = c.apelido || c.nome;
              if (dias === 0) return `${nome} hoje`;
              if (dias === 1) return `${nome} amanhã`;
              return `${nome} em ${dias} dias`;
            })
            .join(', ')}
          {anivProximos.length > 3 ? '...' : ''}
          <div style={{ marginTop: 10 }}>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => goToPage('clientes', onNavigatePage)}
            >
              Abrir clientes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DashChart({
  chartKeys,
  grupos
}: {
  chartKeys: string[];
  grupos: Record<string, { fat: number; lucro: number }>;
}) {
  if (!chartKeys.length) {
    return (
      <EmptyState
        compact
        title="Sem pedidos entregues no período."
        description="Assim que houver entregas, a curva de faturamento e lucro aparece aqui."
      />
    );
  }

  const data = chartKeys.map((k) => ({
    periodo: k,
    fat: grupos[k].fat,
    lucro: grupos[k].lucro
  }));

  return (
    <div data-testid="dash-chart">
      <SystemBarChart
        data={data}
        xKey="periodo"
        height={180}
        valueFormatter={(value) => fmt(Number(value || 0))}
        ariaLabel="Faturamento e lucro por período"
        series={[
          { key: 'fat', label: 'Faturamento', color: 'var(--color-accent)' },
          { key: 'lucro', label: 'Lucro', color: 'var(--color-success)' }
        ]}
      />
    </div>
  );
}

function DashStatusPedidos({ stMap }: { stMap: Record<string, number> }) {
  const labels: Record<string, string> = {
    orcamento: 'Orçamento',
    confirmado: 'Confirmado',
    em_separacao: 'Em separação',
    entregue: 'Entregue',
    cancelado: 'Cancelado'
  };
  const total = Object.values(stMap).reduce((a, v) => a + v, 0);
  return (
    <div data-testid="dash-status-pedidos">
      {Object.entries(labels).map(([key, label]) => {
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
      <EmptyState
        compact
        title="Sem dados no período."
        description="Os produtos com maior faturamento aparecem aqui quando houver vendas entregues."
      />
    );
  }
  return (
    <div data-testid="dash-top-produtos">
      {topProdutos.map(([nome, fat]) => (
        <div key={nome} className="dash-top-row">
          <span className="dash-top-label" title={nome}>
            {nome.length > 28 ? `${nome.slice(0, 28)}…` : nome}
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

function DashboardRoleSummary({
  role,
  view,
  derived,
  pedidosCount,
  produtosCount,
  clientesCount,
  onNavigatePage
}: {
  role: DashboardRole;
  view: DashboardView;
  derived: ReturnType<typeof computeDerivedData>;
  pedidosCount: number;
  produtosCount: number;
  clientesCount: number;
  onNavigatePage?: (page: string) => void;
}) {
  const focusByRole: Record<
    DashboardRole,
    {
      title: string;
      copy: string;
      items: Array<{ label: string; value: string; hint: string; cta: string; page: string }>;
    }
  > = {
    operador: {
      title: 'Seu foco hoje',
      copy: 'Leitura direta para agir mais rápido na operação do dia.',
      items: [
        {
          label: 'Fila em aberto',
          value: String(derived.abertos),
          hint:
            derived.abertos > 0
              ? `${fmt(derived.pipelineValue)} aguardando avanço.`
              : 'Sem fila pendente agora.',
          cta: 'Abrir pedidos',
          page: 'pedidos'
        },
        {
          label: 'Estoque crítico',
          value: String(derived.crit.length),
          hint:
            derived.crit.length > 0
              ? 'Há itens zerados pedindo reposição.'
              : 'Sem ruptura crítica neste momento.',
          cta: 'Ver estoque',
          page: 'estoque'
        },
        {
          label: 'Base ativa',
          value: `${produtosCount} / ${clientesCount}`,
          hint: 'Produtos e clientes já prontos para vender.',
          cta: 'Ver clientes',
          page: 'clientes'
        }
      ]
    },
    gerente: {
      title: 'Resumo para gestão',
      copy: 'O que mais influencia ritmo, resultado e acompanhamento da filial.',
      items: [
        {
          label: 'Faturamento',
          value: fmt(derived.fat),
          hint: `${derived.entreguesHoje} entrega(s) concluída(s) hoje.`,
          cta: 'Ver relatórios',
          page: 'relatorios'
        },
        {
          label: 'Margem',
          value: pct(derived.mg),
          hint:
            derived.mg >= 15 ? 'Margem em zona confortável.' : 'Vale revisar mix, preço e custo.',
          cta: 'Ver análises',
          page: 'gerencial'
        },
        {
          label: 'Pipeline',
          value: fmt(derived.pipelineValue),
          hint: `${derived.abertos} pedido(s) ainda em aberto.`,
          cta: 'Acompanhar pedidos',
          page: 'pedidos'
        }
      ]
    },
    admin: {
      title: 'Visão de escala e controle',
      copy: 'Sinais de maturidade da base e pontos que pedem padronização.',
      items: [
        {
          label: 'Contato da base',
          value: pct(derived.coberturaContatoPct),
          hint: `${derived.clientesComContato} de ${clientesCount} clientes com canal preenchido.`,
          cta: 'Revisar clientes',
          page: 'clientes'
        },
        {
          label: 'Estoque saudável',
          value: pct(derived.estoqueSaudavelPct),
          hint: 'Percentual do catálogo fora da zona de risco.',
          cta: 'Revisar estoque',
          page: 'estoque'
        },
        {
          label: 'Mix ativo',
          value: pct(derived.mixAtivoPct),
          hint: `${pedidosCount} pedido(s) alimentando a leitura atual.`,
          cta: 'Ajustar acessos',
          page: 'acessos'
        }
      ]
    }
  };

  const focus = focusByRole[role];

  return (
    <section className="dash-role-summary card card-shell dash-bento-card">
      <div className="dash-role-summary__head">
        <div>
          <div className="dash-role-summary__eyebrow">
            {ROLE_LABELS[role]} · modo {DASHBOARD_VIEW_LABELS[view]}
          </div>
          <h3>{focus.title}</h3>
          <p>{focus.copy}</p>
        </div>
        <StatusBadge
          tone={role === 'admin' ? 'danger' : role === 'gerente' ? 'warning' : 'success'}
        >
          {ROLE_LABELS[role]}
        </StatusBadge>
      </div>
      <div className="dash-role-summary__grid">
        {focus.items.map((item) => (
          <div key={item.label} className="dash-role-summary__item">
            <div className="dash-role-summary__label">{item.label}</div>
            <div className="dash-role-summary__value">{item.value}</div>
            <div className="dash-role-summary__hint">{item.hint}</div>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => goToPage(item.page, onNavigatePage)}
            >
              {item.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardInsightGrid({
  derived,
  clientesCount,
  produtosCount
}: {
  derived: ReturnType<typeof computeDerivedData>;
  clientesCount: number;
  produtosCount: number;
}) {
  const cards = [
    {
      title: 'Cobertura de contato',
      value: pct(derived.coberturaContatoPct),
      hint: `${derived.clientesComContato} de ${clientesCount} clientes com telefone, WhatsApp ou e-mail.`
    },
    {
      title: 'Taxa de entrega',
      value: pct(derived.taxaEntrega),
      hint: 'Participação de pedidos entregues dentro da base observada.'
    },
    {
      title: 'Catálogo ativo',
      value: pct(derived.mixAtivoPct),
      hint: `${produtosCount} produtos no catálogo e ${derived.crit.length + derived.baixo.length} em atenção.`
    }
  ];

  return (
    <div className="dash-insight-grid">
      {cards.map((card) => (
        <div key={card.title} className="card card-shell dash-bento-card dash-insight-card">
          <div className="ct">{card.title}</div>
          <div className="dash-insight-card__value">{card.value}</div>
          <div className="dash-insight-card__hint">{card.hint}</div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPilotPage({
  onNavigatePage,
  onReload
}: {
  onNavigatePage?: (page: string) => void;
  onReload?: () => void;
}) {
  const periodo = useDashboardStore((s) => s.periodo);
  const pedidos = useDashboardStore((s) => s.pedidos);
  const produtos = useDashboardStore((s) => s.produtos);
  const clientes = useDashboardStore((s) => s.clientes);
  const status = useDashboardStore((s) => s.status);
  const error = useDashboardStore((s) => s.error);
  const setPeriodo = useDashboardStore((s) => s.setPeriodo);
  const filialId = useFilialStore((s) => s.filialId);
  const userRole = useCurrentUserRole();
  const viewStorageKey = getDashboardViewStorageKey(userRole, filialId);
  const [view, setView] = useState<DashboardView>(() =>
    readStoredDashboardView(viewStorageKey, getPreferredDashboardView(userRole))
  );

  useEffect(() => {
    setView(readStoredDashboardView(viewStorageKey, getPreferredDashboardView(userRole)));
  }, [userRole, viewStorageKey]);

  useEffect(() => {
    localStorage.setItem(viewStorageKey, view);
  }, [view, viewStorageKey]);

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

  const showOperational = view === 'operacional';
  const showManagerial = view === 'gerencial';
  const showAnalytical = view === 'analitico';
  const hasAnyBaseData = pedidos.length > 0 || produtos.length > 0 || clientes.length > 0;
  const sourceSummary = `Fonte: pedidos (${pedidos.length}), produtos (${produtos.length}) e clientes (${clientes.length}) da filial ativa.`;

  return (
    <div className="dash-bento-page" data-testid="dashboard-pilot-page">
      <PageHeader
        kicker="Dashboard"
        title="Painel executivo"
        description="Leitura da filial ativa com base em pedidos, produtos e clientes já carregados no sistema. Sem métricas estimadas ou mockadas."
        actions={
          <button
            className="btn btn-sm"
            type="button"
            onClick={onReload}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Atualizando...' : 'Atualizar dados'}
          </button>
        }
        meta={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <StatusBadge tone="info">{periodoLabels[periodo]}</StatusBadge>
            <StatusBadge tone="neutral">{DASHBOARD_VIEW_LABELS[view]}</StatusBadge>
            <StatusBadge tone="success">Dados reais</StatusBadge>
          </div>
        }
      />

      <div className="page-controls-bar toolbar toolbar-shell toolbar-shell--page">
        <div className="fg2 dash-page-toolbar">
          <span className="table-cell-muted dash-page-toolbar__meta">
            {filialId ?? '—'} · {periodoLabels[periodo]}
          </span>
          <PeriodSelector periodo={periodo} onChange={setPeriodo} />
        </div>
        <DashboardViewSelector view={view} onChange={setView} />
      </div>

      {status === 'loading' && (
        <LoadingState
          title="Carregando indicadores do dashboard..."
          description="Estamos reunindo pedidos, produtos e clientes da filial ativa para montar a leitura executiva."
          data-testid="dash-pilot-loading"
        />
      )}

      {status === 'error' && (
        <ErrorState
          title="Não foi possível carregar o dashboard."
          description="A leitura executiva depende das bases de pedidos, produtos e clientes da filial ativa."
          technicalMessage={error ?? undefined}
          onRetry={onReload}
          data-testid="dash-pilot-error"
        />
      )}

      {status === 'ready' && !hasAnyBaseData && (
        <EmptyState
          title="Ainda não há base suficiente para montar o dashboard."
          description="Assim que a filial tiver pedidos, produtos ou clientes cadastrados, os indicadores executivos passam a aparecer aqui."
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => goToPage('clientes', onNavigatePage)}
              >
                Abrir clientes
              </button>
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => goToPage('produtos', onNavigatePage)}
              >
                Abrir produtos
              </button>
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => goToPage('pedidos', onNavigatePage)}
              >
                Abrir pedidos
              </button>
            </div>
          }
          data-testid="dash-pilot-empty"
        />
      )}

      {status === 'ready' && (
        <>
          <DashboardSection
            title="Visão geral da filial"
            description="Panorama executivo do período selecionado, sem estimativas artificiais e sem trocar a origem dos dados."
          >
            <div className="dash-bento-panel dash-bento-panel--overview">
              <DashboardContextStats
                pedidosCount={pedidos.length}
                produtosCount={produtos.length}
                clientesCount={clientes.length}
                entreguesHoje={derived.entreguesHoje}
                sourceSummary={sourceSummary}
                onNavigatePage={onNavigatePage}
              />

              <DashKpis
                fat={derived.fat}
                lucro={derived.lucro}
                mg={derived.mg}
                tk={derived.tk}
                abertos={derived.abertos}
                entreguesCount={derived.entregues.length}
                allPedsCount={pedidos.length}
              />
            </div>
          </DashboardSection>

          <DashboardRoleSummary
            role={userRole}
            view={view}
            derived={derived}
            pedidosCount={pedidos.length}
            produtosCount={produtos.length}
            clientesCount={clientes.length}
            onNavigatePage={onNavigatePage}
          />

          {showOperational && (
            <DashboardSection
              title="Decisões de hoje"
              description="Fila comercial, ruptura de estoque e relacionamento que pedem ação imediata."
            >
              <div className="dash-bento-grid dash-bento-grid--ops">
                <DashboardCard title="Alertas e atenção" className="dash-bento-card--alerts-panel">
                  <DashAlerts
                    crit={derived.crit}
                    baixo={derived.baixo}
                    anivProximos={derived.anivProximos}
                    hoje={derived.hoje}
                    onNavigatePage={onNavigatePage}
                  />
                </DashboardCard>
                <div className="dash-bento-stack">
                  <DashboardCard title="Status dos pedidos" className="dash-bento-card--status">
                    <DashStatusPedidos stMap={derived.stMap} />
                  </DashboardCard>
                  <DashboardCard title="Top produtos" className="dash-bento-card--top">
                    <DashTopProdutos topProdutos={derived.topProdutos} maxFat={derived.maxTopFat} />
                  </DashboardCard>
                </div>
              </div>
            </DashboardSection>
          )}

          {(showManagerial || showAnalytical) && (
            <DashboardSection
              title={showAnalytical ? 'Leitura analítica' : 'Leitura gerencial'}
              description={
                showAnalytical
                  ? 'Profundidade para identificar padrão, cobertura e consistência operacional com base nos dados atuais.'
                  : 'Resultado, tendência e distribuição do desempenho comercial no período selecionado.'
              }
            >
              {showAnalytical && (
                <DashboardInsightGrid
                  derived={derived}
                  clientesCount={clientes.length}
                  produtosCount={produtos.length}
                />
              )}

              <div className="dash-bento-grid dash-bento-grid--analysis">
                <DashboardCard title="Faturamento e lucro" className="dash-bento-card--chart">
                  <DashChart
                    chartKeys={derived.chartKeys}
                    grupos={derived.grupos}
                  />
                </DashboardCard>
                <div className="dash-bento-stack">
                  <DashboardCard title="Status dos pedidos" className="dash-bento-card--status">
                    <DashStatusPedidos stMap={derived.stMap} />
                  </DashboardCard>
                  <DashboardCard title="Top produtos" className="dash-bento-card--top">
                    <DashTopProdutos topProdutos={derived.topProdutos} maxFat={derived.maxTopFat} />
                  </DashboardCard>
                </div>
              </div>
            </DashboardSection>
          )}

          {showAnalytical && (
            <DashboardSection
              title="Sinais operacionais de apoio"
              description="Contexto que ajuda a explicar resultado e orientar ajuste fino."
            >
              <DashboardCard
                title="Alertas complementares"
                className="dash-bento-card--alerts-panel"
              >
                <DashAlerts
                  crit={derived.crit}
                  baixo={derived.baixo}
                  anivProximos={derived.anivProximos}
                  hoje={derived.hoje}
                  onNavigatePage={onNavigatePage}
                />
              </DashboardCard>
            </DashboardSection>
          )}
        </>
      )}
    </div>
  );
}
