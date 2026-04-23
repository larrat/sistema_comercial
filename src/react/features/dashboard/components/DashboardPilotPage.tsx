import { useEffect, useMemo, useState } from 'react';
import { useFilialStore } from '../../../app/useFilialStore';
import type { Cliente, Pedido, Produto } from '../../../../types/domain';
import { useDashboardStore, type Periodo } from '../store/useDashboardStore';

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

function readUserRole(): DashboardRole {
  const raw = String(window.__SC_USER_ROLE__ || 'operador').toLowerCase();
  if (raw === 'admin') return 'admin';
  if (raw === 'gerente') return 'gerente';
  return 'operador';
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

function goToPage(page: string) {
  const button = document.querySelector(`.ni[data-p="${page}"]`);
  if (button instanceof HTMLButtonElement) button.click();
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
    <div className="mg dash-bento-band dash-bento-band--metrics" data-testid="dash-kpis">
      <div className="met metric-card">
        <div className="metric-card__eyebrow">Receita</div>
        <div className="ml">Faturamento</div>
        <div className="mv kpi-value-sm">{fmt(fat)}</div>
        <div className="ms metric-card__foot">{entreguesCount} entregue(s)</div>
      </div>
      <div className="met metric-card">
        <div className="metric-card__eyebrow">Resultado</div>
        <div className="ml">Lucro bruto</div>
        <div className={`mv kpi-value-sm ${lucro >= 0 ? 'tone-success' : 'tone-critical'}`}>
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
        <div className="mv kpi-value-sm">{fmt(tk)}</div>
        <div className="ms metric-card__foot">Base {allPedsCount} pedido(s)</div>
      </div>
      <div className="met metric-card">
        <div className="metric-card__eyebrow">Pipeline</div>
        <div className="ml">Em aberto</div>
        <div className="mv tone-warning">{abertos}</div>
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
    return <div className="empty-inline table-cell-muted">Sem alertas no momento.</div>;
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
      <div className="empty dash-empty-compact">
        <p>Sem pedidos entregues no período.</p>
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
    return <div className="empty-inline table-cell-muted">Sem dados no período.</div>;
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
  clientesCount
}: {
  role: DashboardRole;
  view: DashboardView;
  derived: ReturnType<typeof computeDerivedData>;
  pedidosCount: number;
  produtosCount: number;
  clientesCount: number;
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
        <span className={`bdg ${role === 'admin' ? 'br' : role === 'gerente' ? 'ba' : 'bg'}`}>
          {ROLE_LABELS[role]}
        </span>
      </div>
      <div className="dash-role-summary__grid">
        {focus.items.map((item) => (
          <div key={item.label} className="dash-role-summary__item">
            <div className="dash-role-summary__label">{item.label}</div>
            <div className="dash-role-summary__value">{item.value}</div>
            <div className="dash-role-summary__hint">{item.hint}</div>
            <button className="btn btn-sm" type="button" onClick={() => goToPage(item.page)}>
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

export function DashboardPilotPage() {
  const periodo = useDashboardStore((s) => s.periodo);
  const pedidos = useDashboardStore((s) => s.pedidos);
  const produtos = useDashboardStore((s) => s.produtos);
  const clientes = useDashboardStore((s) => s.clientes);
  const status = useDashboardStore((s) => s.status);
  const error = useDashboardStore((s) => s.error);
  const setPeriodo = useDashboardStore((s) => s.setPeriodo);
  const filialId = useFilialStore((s) => s.filialId);
  const userRole = readUserRole();
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

  return (
    <div className="dash-bento-page" data-testid="dashboard-pilot-page">
      <div className="page-controls-bar toolbar toolbar-shell toolbar-shell--page">
        <div className="fg2 dash-page-toolbar">
          <span className="table-cell-muted dash-page-toolbar__meta">
            {filialId ?? '—'} · {periodoLabels[periodo]}
          </span>
          <PeriodSelector periodo={periodo} onChange={setPeriodo} />
        </div>
        <DashboardViewSelector view={view} onChange={setView} />
      </div>

      {error && <div className="alert al-r">{error}</div>}

      {status === 'loading' && (
        <div className="sk-card" data-testid="dash-pilot-loading">
          <div className="sk-line" />
          <div className="sk-line" />
          <div className="sk-line" />
        </div>
      )}

      {status === 'ready' && (
        <>
          <DashboardRoleSummary
            role={userRole}
            view={view}
            derived={derived}
            pedidosCount={pedidos.length}
            produtosCount={produtos.length}
            clientesCount={clientes.length}
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

          {showOperational && (
            <>
              <section className="dash-section dash-section--operacao dash-bento-panel dash-bento-panel--ops">
                <div className="dash-section-head">
                  <h3>Decisões de hoje</h3>
                  <p>Fila, ruptura e sinais que pedem ação imediata.</p>
                </div>
                <DashAlerts
                  crit={derived.crit}
                  baixo={derived.baixo}
                  anivProximos={derived.anivProximos}
                  hoje={derived.hoje}
                />
              </section>

              <div className="dash-grid-main dash-bento-grid dash-bento-grid--primary">
                <div className="card card-shell dash-card dash-bento-card dash-bento-card--status">
                  <div className="ct">Status dos pedidos</div>
                  <DashStatusPedidos stMap={derived.stMap} />
                </div>
                <div className="card card-shell dash-card dash-card--top dash-bento-card">
                  <div className="ct">Top produtos</div>
                  <DashTopProdutos topProdutos={derived.topProdutos} maxFat={derived.maxTopFat} />
                </div>
              </div>
            </>
          )}

          {(showManagerial || showAnalytical) && (
            <section className="dash-section dash-section--analise dash-bento-panel dash-bento-panel--analysis">
              <div className="dash-section-head">
                <h3>{showAnalytical ? 'Leitura analítica' : 'Leitura gerencial'}</h3>
                <p>
                  {showAnalytical
                    ? 'Profundidade para identificar padrão, cobertura e consistência operacional.'
                    : 'Resultado, tendência e distribuição do desempenho comercial.'}
                </p>
              </div>

              {showAnalytical && (
                <DashboardInsightGrid
                  derived={derived}
                  clientesCount={clientes.length}
                  produtosCount={produtos.length}
                />
              )}

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

              <div className="dash-grid-cards dash-grid-cards--analise">
                <div className="card card-shell dash-card dash-card--top dash-bento-card">
                  <div className="ct">Top produtos</div>
                  <DashTopProdutos topProdutos={derived.topProdutos} maxFat={derived.maxTopFat} />
                </div>
              </div>
            </section>
          )}

          {showAnalytical && (
            <section className="dash-section dash-section--operacao dash-bento-panel dash-bento-panel--ops">
              <div className="dash-section-head">
                <h3>Sinais operacionais de apoio</h3>
                <p>Contexto que ajuda a explicar resultado e orientar ajuste fino.</p>
              </div>
              <DashAlerts
                crit={derived.crit}
                baixo={derived.baixo}
                anivProximos={derived.anivProximos}
                hoje={derived.hoje}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
