import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCurrentUserRole } from '../../../app/hooks/useCurrentUserRole';
import { useFilialStore } from '../../../app/useFilialStore';
import type { Cliente, Filial, Pedido, Produto } from '../../../../types/domain';
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
import { AlertCircle, AlertTriangle, Gift, UserMinus, Clock, LayoutDashboard, Building2, Shield, ShoppingBag, Package, Users } from 'lucide-react';
import { listUserFiliais } from '../../auth/services/authApi';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';


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

function plural(count: number, singular: string, pluralStr: string) {
  return count === 1 ? singular : pluralStr;
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
  const tk = pedidos.length ? fat / pedidos.length : 0;
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

  const sessentaDiasAtras = new Date(hoje);
  sessentaDiasAtras.setDate(hoje.getDate() - 60);

  const ultimosPedidos: Record<string, Date> = {};
  pedidos.forEach((p) => {
    if (p.status === 'entregue' && p.cliente_id && p.data) {
      const d = new Date(`${p.data}T00:00:00`);
      if (!ultimosPedidos[p.cliente_id] || d > ultimosPedidos[p.cliente_id]) {
        ultimosPedidos[p.cliente_id] = d;
      }
    }
  });

  const churnRisk = clientes.filter((c) => {
    const lastDate = ultimosPedidos[c.id];
    return lastDate && lastDate < sessentaDiasAtras;
  });

  const seteDiasAtras = new Date(hoje);
  seteDiasAtras.setDate(hoje.getDate() - 7);
  
  const orcamentosTravados = pedidos.filter((p) => {
    if (p.status !== 'orcamento' || !p.data) return false;
    const d = new Date(`${p.data}T00:00:00`);
    return d < seteDiasAtras;
  });

  const META_MENSAL_BASE = 5000;
  const metaPacing = (fat / META_MENSAL_BASE) * 100;

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
    mixAtivoPct,
    churnRisk,
    orcamentosTravados,
    metaPacing,
    META_MENSAL_BASE
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
    <section className="flex flex-col gap-6 mb-12">
      <div className="flex flex-col gap-1 border-l-[3px] border-slate-900 pl-4 py-0.5">
        <h3 className="text-xl font-bold tracking-tight text-slate-800 leading-none">{title}</h3>
        <p className="text-[12px] font-medium text-slate-400">{description}</p>
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
    <section className={`bg-white border border-slate-200/80 rounded-xl !p-8 shadow-sm flex flex-col gap-6 overflow-hidden ${className}`.trim()}>
      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
          <div className="w-1 h-3 bg-slate-900 rounded-full" />
          {title}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {children}
      </div>
    </section>
  );
}

function DashboardContextStats({
  pedidosCount,
  produtosCount,
  clientesCount,
  entreguesHoje,
  onNavigatePage
}: {
  pedidosCount: number;
  produtosCount: number;
  clientesCount: number;
  entreguesHoje: number;
  onNavigatePage?: (page: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        label="Pedidos"
        value={pedidosCount}
        tone="blue"
        onClick={() => goToPage('pedidos', onNavigatePage)}
      />
      <StatCard
        label="Catálogo"
        value={produtosCount}
        tone="emerald"
        onClick={() => goToPage('produtos', onNavigatePage)}
      />
      <StatCard
        label="Clientes"
        value={clientesCount}
        tone="amber"
        onClick={() => goToPage('clientes', onNavigatePage)}
      />
      <StatCard
        label="Hoje"
        value={entreguesHoje}
        tone={entreguesHoje > 0 ? 'success' : 'default'}
        onClick={() => goToPage('pedidos', onNavigatePage)}
      />
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
    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 w-fit shadow-inner overflow-hidden" data-testid="dash-period-selector">
      {periods.map((p) => {
        const isActive = periodo === p.value;
        return (
          <button
            key={p.value}
            className={`px-8 py-2.5 text-[11px] font-bold tracking-tight rounded-lg transition-all ${
              isActive
                ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
            onClick={() => onChange(p.value)}
            type="button"
          >
            {p.label}
          </button>
        );
      })}
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
    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 shadow-inner overflow-hidden" aria-label="Mudar objetivo do painel">
      {(Object.entries(DASHBOARD_VIEW_LABELS) as Array<[DashboardView, string]>).map(
        ([value, label]) => {
          const isActive = view === value;
          return (
            <button
              key={value}
              className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              onClick={() => onChange(value)}
              type="button"
            >
              {label}
            </button>
          );
        }
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
  allPedsCount,
  metaPacing,
  META_MENSAL_BASE
}: {
  fat: number;
  lucro: number;
  mg: number;
  tk: number;
  abertos: number;
  entreguesCount: number;
  allPedsCount: number;
  metaPacing: number;
  META_MENSAL_BASE: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-testid="dash-kpis">
      <StatCard
        label="Faturamento"
        value={fmt(fat)}
        description={`${entreguesCount} ${plural(entreguesCount, 'pedido entregue', 'pedidos entregues')}`}
        tone="amber"
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
        description={`Média de ${allPedsCount} ${plural(allPedsCount, 'pedido', 'pedidos')} no período`}
      />
      <StatCard
        label="Em aberto"
        value={abertos}
        description="Orçamentos e pedidos confirmados"
        tone={abertos > 0 ? 'warning' : 'default'}
      />
      <div className="flex flex-col gap-2 p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-1">Pacing Mensal</div>
        <div className="text-3xl font-bold text-slate-800 tracking-tight leading-none">{metaPacing.toFixed(1)}%</div>
        <div className="text-[11px] font-medium text-slate-400 mt-1">Meta: {fmt(META_MENSAL_BASE)}</div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${metaPacing >= 100 ? 'bg-[#4B5320]' : 'bg-[#C5A059]'}`} 
            style={{ width: `${Math.min(metaPacing, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DashAlerts({
  crit,
  baixo,
  anivProximos,
  churnRisk,
  orcamentosTravados,
  hoje,
  onNavigatePage
}: {
  crit: Produto[];
  baixo: Produto[];
  anivProximos: Array<Cliente & { _anivData: Date }>;
  churnRisk: Cliente[];
  orcamentosTravados: Pedido[];
  hoje: Date;
  onNavigatePage?: (page: string) => void;
}) {
  if (!crit.length && !baixo.length && !anivProximos.length && !churnRisk.length && !orcamentosTravados.length) {
    return (
      <EmptyState
        compact
        title="Sem alertas no momento."
        description="A operação da filial está estável na leitura atual."
      />
    );
  }

  const fmtCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="flex flex-col gap-3" data-testid="dash-alerts">
      {crit.length > 0 && (
        <div className="flex flex-col gap-2 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-red-800 font-bold">
            <AlertCircle size={18} strokeWidth={2.5} /> Estoque crítico
          </div>
          <div className="text-sm text-red-900/80 leading-relaxed">
            {crit.length} {plural(crit.length, 'produto zerado', 'produtos zerados')}.{' '}
            {crit.slice(0, 3).map((p) => p.nome).join(', ')}{crit.length > 3 ? '...' : ''}
          </div>
          <div className="mt-2">
            <button
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg transition-colors"
              type="button"
              onClick={() => goToPage('estoque', onNavigatePage)}
            >
              Ver estoque
            </button>
          </div>
        </div>
      )}
      {baixo.length > 0 && (
        <div className="flex flex-col gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-amber-800 font-bold">
            <AlertTriangle size={18} strokeWidth={2.5} /> Estoque em atenção
          </div>
          <div className="text-sm text-amber-900/80 leading-relaxed">
            {baixo.length} {plural(baixo.length, 'item', 'itens')} abaixo do mínimo.{' '}
            {baixo.slice(0, 3).map((p) => p.nome).join(', ')}{baixo.length > 3 ? '...' : ''}
          </div>
          <div className="mt-2">
            <button
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold rounded-lg transition-colors"
              type="button"
              onClick={() => goToPage('estoque', onNavigatePage)}
            >
              Revisar estoque
            </button>
          </div>
        </div>
      )}
      {anivProximos.length > 0 && (
        <div className="flex flex-col gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <Gift size={18} strokeWidth={2.5} /> Aniversários próximos
          </div>
          <div className="text-sm text-emerald-900/80 leading-relaxed">
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
          <div className="mt-2">
            <button
              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg transition-colors"
              type="button"
              onClick={() => goToPage('clientes', onNavigatePage)}
            >
              Abrir clientes
            </button>
          </div>
        </div>
      )}
      {churnRisk.length > 0 && (
        <div className="flex flex-col gap-2 p-4 bg-rose-50 border border-rose-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-rose-800 font-bold">
            <UserMinus size={18} strokeWidth={2.5} /> Risco de Churn
          </div>
          <div className="text-sm text-rose-900/80 leading-relaxed">
            {churnRisk.length} {plural(churnRisk.length, 'cliente', 'clientes')} sem comprar há mais de 60 dias.{' '}
            {churnRisk.slice(0, 3).map((c) => c.nome.split(' ')[0]).join(', ')}{churnRisk.length > 3 ? '...' : ''}
          </div>
          <div className="mt-2">
            <button
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold rounded-lg transition-colors"
              type="button"
              onClick={() => goToPage('clientes', onNavigatePage)}
            >
              Recuperar clientes
            </button>
          </div>
        </div>
      )}
      {orcamentosTravados.length > 0 && (
        <div className="flex flex-col gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-orange-800 font-bold">
            <Clock size={18} strokeWidth={2.5} /> Orçamentos Travados
          </div>
          <div className="text-sm text-orange-900/80 leading-relaxed">
            {orcamentosTravados.length} {plural(orcamentosTravados.length, 'orçamento parado', 'orçamentos parados')} há mais de 7 dias.{' '}
            Total travado: {fmtCurrency.format(orcamentosTravados.reduce((a, b) => a + (b.total || 0), 0))}
          </div>
          <div className="mt-2">
            <button
              className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-semibold rounded-lg transition-colors"
              type="button"
              onClick={() => goToPage('pedidos', onNavigatePage)}
            >
              Revisar pipeline
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
          { key: 'fat', label: 'Faturamento', color: '#3b82f6' },
          { key: 'lucro', label: 'Lucro', color: '#10b981' }
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
    <div className="flex flex-col gap-3" data-testid="dash-status-pedidos">
      {Object.entries(labels).map(([key, label]) => {
        const count = stMap[key] ?? 0;
        const pctVal = total > 0 ? (count / total) * 100 : 0;
        
        let colorClass = 'bg-blue-500';
        if (key === 'entregue') colorClass = 'bg-emerald-500';
        else if (key === 'cancelado') colorClass = 'bg-slate-300';
        else if (key === 'em_separacao') colorClass = 'bg-amber-400';

        return (
          <div key={key} className="flex items-center gap-3 text-sm group">
            <span className="w-28 text-slate-600 font-medium truncate group-hover:text-slate-900 transition-colors">{label}</span>
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                style={{ width: `${pctVal}%` }}
              />
            </div>
            <span className="w-10 text-right font-semibold text-slate-700 tabular-nums">{count}</span>
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
    <div className="flex flex-col gap-3" data-testid="dash-top-produtos">
      {topProdutos.map(([nome, fat]) => (
        <div key={nome} className="flex items-center gap-3 text-sm group">
          <span className="w-36 text-slate-600 font-medium truncate group-hover:text-slate-900 transition-colors" title={nome}>
            {nome}
          </span>
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, (fat / maxFat) * 100)}%` }}
            />
          </div>
          <span className="w-20 text-right font-semibold text-slate-700 tabular-nums">{fmt(fat)}</span>
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
          hint: `${pedidosCount} ${plural(pedidosCount, 'pedido alimentando', 'pedidos alimentando')} a leitura atual.`,
          cta: 'Ajustar acessos',
          page: 'acessos'
        }
      ]
    }
  };

  const focus = focusByRole[role];

  return (
    <section className="relative overflow-hidden bg-slate-900 rounded-xl !p-12 md:!p-16 shadow-2xl shadow-slate-900/40 text-white mb-12 group">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-all group-hover:bg-blue-600/10" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/5 rounded-full blur-[60px] -ml-24 -mb-24 transition-all group-hover:bg-indigo-600/10" />
      
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8 pb-6 border-b border-white/10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#C5A059]">
            <Shield size={12} strokeWidth={3} />
            {ROLE_LABELS[role]} · {DASHBOARD_VIEW_LABELS[view]}
          </div>
          <h3 className="text-3xl font-bold tracking-tight text-white">{focus.title}</h3>
          <p className="text-slate-400 max-w-lg text-sm leading-relaxed">{focus.copy}</p>
        </div>
        <div className="shrink-0">
          <div className="px-5 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-black tracking-[0.2em] uppercase text-white shadow-inner">
            {ROLE_LABELS[role]}
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {focus.items.map((item) => (
          <div key={item.label} className="flex flex-col gap-3 group/item">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover/item:text-[#C5A059] transition-colors">{item.label}</div>
            <div className="text-4xl font-bold text-white tracking-tighter transition-transform group-hover/item:translate-x-1">{item.value}</div>
            <div className="text-xs text-slate-400 leading-relaxed mb-4">{item.hint}</div>
            <button
              className="mt-auto self-start px-5 py-2.5 bg-white/5 hover:bg-white text-slate-300 hover:text-slate-900 text-xs font-bold rounded-lg transition-all border border-white/10 hover:border-white shadow-sm active:scale-95"
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.title} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4 overflow-hidden">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
            <div className="w-1 h-3 bg-slate-900 rounded-full" />
            {card.title}
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</div>
          <div className="text-xs text-slate-500 leading-relaxed">{card.hint}</div>
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
  const session = useAuthStore((s) => s.session);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const userRole = useCurrentUserRole();

  useEffect(() => {
    async function loadFiliais() {
      if (!session?.access_token) return;
      const userId = String((session.user as Record<string, unknown>)?.id ?? '');
      const cfg = getSupabaseConfig();
      if (!cfg.ready || !userId) return;
      try {
        const data = await listUserFiliais({ url: cfg.url, key: cfg.key }, session.access_token, userId);
        setFiliais(data);
      } catch (e) {
        console.error('Erro ao carregar filiais no dashboard:', e);
      }
    }
    void loadFiliais();
  }, [session]);

  const currentFilialName = filiais.find((f) => f.id === filialId)?.nome ?? filialId ?? 'Nenhuma Selecionada';
  
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
    <div className="flex flex-col min-h-[calc(100vh-64px)] w-full px-12 py-24 md:px-20 md:py-32 max-w-7xl mx-auto gap-20" data-testid="dashboard-pilot-page">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 border-b border-slate-200 pb-12 pt-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <LayoutDashboard size={12} strokeWidth={3} />
              Gestão Executiva
            </div>
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-5 px-8 py-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <Building2 size={18} className="text-[#C5A059]" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-slate-400 leading-none mb-1.5">Filial Ativa</span>
                <span className="text-sm font-bold text-slate-800 tracking-tight">{currentFilialName}</span>
              </div>
            </div>
            <PeriodSelector periodo={periodo} onChange={setPeriodo} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-6">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2 mr-2">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm ring-4 ring-slate-50" title="Pedidos"><ShoppingBag size={16} /></div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm ring-4 ring-slate-50" title="Produtos"><Package size={16} /></div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm ring-4 ring-slate-50" title="Clientes"><Users size={16} /></div>
            </div>
            <button
              className="flex items-center gap-3 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 text-[11px] uppercase tracking-[0.2em] disabled:opacity-50 group"
              type="button"
              onClick={onReload}
              disabled={status === 'loading'}
            >
              <Clock size={14} className={status === 'loading' ? 'animate-spin' : ''} />
              {status === 'loading' ? 'Sincronizando' : 'Atualizar Dados'}
            </button>
          </div>
          <DashboardViewSelector view={view} onChange={setView} />
        </div>
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
            <div className="flex flex-col gap-6">
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
                tk={pedidos.length > 0 ? derived.fat / pedidos.length : 0}
                abertos={derived.abertos}
                entreguesCount={derived.entregues.length}
                allPedsCount={pedidos.length}
                metaPacing={derived.metaPacing}
                META_MENSAL_BASE={derived.META_MENSAL_BASE}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard title="Alertas e atenção">
                  <DashAlerts
                    crit={derived.crit}
                    baixo={derived.baixo}
                    anivProximos={derived.anivProximos}
                    churnRisk={derived.churnRisk}
                    orcamentosTravados={derived.orcamentosTravados}
                    hoje={derived.hoje}
                    onNavigatePage={onNavigatePage}
                  />
                </DashboardCard>
                <div className="flex flex-col gap-6">
                  <DashboardCard title="Status dos pedidos">
                    <DashStatusPedidos stMap={derived.stMap} />
                  </DashboardCard>
                  <DashboardCard title="Top produtos">
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashboardCard title="Faturamento e lucro" className="lg:col-span-2">
                  <DashChart
                    chartKeys={derived.chartKeys}
                    grupos={derived.grupos}
                  />
                </DashboardCard>
                <div className="flex flex-col gap-6">
                  <DashboardCard title="Status dos pedidos">
                    <DashStatusPedidos stMap={derived.stMap} />
                  </DashboardCard>
                  <DashboardCard title="Top produtos">
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
                  churnRisk={derived.churnRisk}
                  orcamentosTravados={derived.orcamentosTravados}
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
