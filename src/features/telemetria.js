// @ts-check

/** @typedef {import('../types/domain').TelemetriaModuleDeps} TelemetriaModuleDeps */

import { D, State } from '../app/store.js';
import { uid, norm, toast } from '../shared/utils.js';
// Bridges removidos — Fase 4
const isClientesReactFeatureEnabled = () => true;

const GOAL_METRICS_KEY = 'sc_goal_metrics_v1';
const UX_EVENTS_KEY = 'sc_ux_events_v1';
const GOAL_METRICS_VERSION = 2;
const KPI_PAGES = [
  'dashboard',
  'gerencial',
  'produtos',
  'clientes',
  'pedidos',
  'cotacao',
  'estoque',
  'campanhas',
  'filiais',
  'acessos',
  'notificacoes'
];
const JOURNEY_MODAL_MAP = {
  'modal-produto': 'produto',
  'modal-cliente': 'cliente',
  'modal-pedido': 'pedido',
  'modal-campanha': 'campanha'
};
const primaryActionTracker = { page: 'dashboard', clicks: 0, active: false };

/** @type {TelemetriaModuleDeps} */
let deps = {
  pageAtual: () => 'dashboard',
  getNotificacoesResumo: () => ({ critico: 0, oportunidade: 0 }),
  ir: () => {},
  abrirNovaCampanhaTracked: () => {},
  limparFormPedTracked: () => {},
  abrirModal: () => {},
  fmt: (v) => String(v ?? ''),
  onMetricsReset: () => {}
};

export function initTelemetriaModule(nextDeps = {}) {
  deps = { ...deps, ...nextDeps };
}

function buildDefaultGoalMetrics() {
  const journeyBase = { started: 0, completed: 0, abandoned: 0, rework: 0, total_ms: 0 };
  return {
    version: GOAL_METRICS_VERSION,
    started_at: new Date().toISOString(),
    task_start: {},
    critical: {
      produto: { total_ms: 0, count: 0, baseline_ms: 0 },
      cliente: { total_ms: 0, count: 0, baseline_ms: 0 },
      pedido: { total_ms: 0, count: 0, baseline_ms: 0 },
      campanha: { total_ms: 0, count: 0, baseline_ms: 0 }
    },
    errors: { validation: 0, operation: 0 },
    strategic: { campanhas: 0, notificacoes: 0, oportunidades: 0 },
    consistency: { dashboard: false, clientes: false, campanhas: false, pedidos: false },
    kpi: {
      completion: { total: 0, mobile: 0 },
      abandonment: { total: 0 },
      rework: { total: 0 },
      primary_clicks: KPI_PAGES.reduce((acc, p) => {
        acc[p] = { total: 0, count: 0 };
        return acc;
      }, {}),
      journeys: {
        produto: { ...journeyBase },
        cliente: { ...journeyBase },
        pedido: { ...journeyBase },
        campanha: { ...journeyBase }
      },
      notifications: { executadas: 0, resolvidas: 0, reabertas: 0 }
    }
  };
}

function resolveJourneyKey(modalId) {
  if (modalId === 'modal-cliente' && isClientesReactFeatureEnabled()) {
    return 'cliente';
  }
  return JOURNEY_MODAL_MAP[modalId] || null;
}

function getDefaultJourneyShape() {
  return { started: 0, completed: 0, abandoned: 0, rework: 0, total_ms: 0 };
}

function ensureGoalMetricsShape(raw) {
  const base = buildDefaultGoalMetrics();
  const out = { ...base, ...(raw || {}) };
  out.version = GOAL_METRICS_VERSION;
  out.started_at = out.started_at || base.started_at;
  out.task_start = { ...base.task_start, ...(out.task_start || {}) };
  out.critical = { ...base.critical, ...(out.critical || {}) };
  Object.keys(base.critical).forEach((k) => {
    out.critical[k] = { ...base.critical[k], ...(out.critical[k] || {}) };
  });
  out.errors = { ...base.errors, ...(out.errors || {}) };
  out.strategic = { ...base.strategic, ...(out.strategic || {}) };
  out.consistency = { ...base.consistency, ...(out.consistency || {}) };
  out.kpi = { ...base.kpi, ...(out.kpi || {}) };
  out.kpi.completion = { ...base.kpi.completion, ...(out.kpi.completion || {}) };
  out.kpi.abandonment = { ...base.kpi.abandonment, ...(out.kpi.abandonment || {}) };
  out.kpi.rework = { ...base.kpi.rework, ...(out.kpi.rework || {}) };
  out.kpi.journeys = { ...base.kpi.journeys, ...(out.kpi.journeys || {}) };
  ['produto', 'cliente', 'pedido', 'campanha'].forEach((j) => {
    out.kpi.journeys[j] = { ...getDefaultJourneyShape(), ...(out.kpi.journeys[j] || {}) };
  });
  out.kpi.notifications = { ...base.kpi.notifications, ...(out.kpi.notifications || {}) };
  out.kpi.primary_clicks = { ...base.kpi.primary_clicks, ...(out.kpi.primary_clicks || {}) };
  KPI_PAGES.forEach((p) => {
    out.kpi.primary_clicks[p] = {
      ...base.kpi.primary_clicks[p],
      ...(out.kpi.primary_clicks[p] || {})
    };
  });
  return out;
}

function getUxEvents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(UX_EVENTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUxEvents(events) {
  localStorage.setItem(UX_EVENTS_KEY, JSON.stringify(events));
}

export function pushUxEvent(type, payload = {}) {
  const evs = getUxEvents();
  evs.unshift({
    id: uid(),
    ts: new Date().toISOString(),
    page: deps.pageAtual(),
    type,
    ...payload
  });
  saveUxEvents(evs.slice(0, 300));
}

export function getGoalMetrics() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GOAL_METRICS_KEY) || '{}');
    return ensureGoalMetricsShape(parsed);
  } catch {
    return buildDefaultGoalMetrics();
  }
}

function saveGoalMetrics(m) {
  localStorage.setItem(GOAL_METRICS_KEY, JSON.stringify(m));
}

export function startCriticalTask(tipo) {
  const m = getGoalMetrics();
  m.task_start[tipo] = Date.now();
  if (m.kpi.journeys[tipo]) {
    m.kpi.journeys[tipo].started += 1;
  }
  saveGoalMetrics(m);
  pushUxEvent('journey_started', { journey: tipo });
}

export function completeCriticalTask(tipo) {
  const m = getGoalMetrics();
  const st = Number(m.task_start?.[tipo] || 0);
  if (!st) return;
  const elapsed = Math.max(0, Date.now() - st);
  const cur = m.critical[tipo];
  cur.total_ms += elapsed;
  cur.count += 1;
  if (!cur.baseline_ms) cur.baseline_ms = elapsed;
  const j = m.kpi.journeys?.[tipo];
  if (j) {
    j.completed += 1;
    j.total_ms += elapsed;
  }
  m.kpi.completion.total += 1;
  if (window.matchMedia('(max-width: 760px)').matches) {
    m.kpi.completion.mobile += 1;
  }
  delete m.task_start[tipo];
  saveGoalMetrics(m);
  pushUxEvent('journey_completed', { journey: tipo, elapsed_ms: elapsed });
}

export function abandonCriticalTask(tipo, reason = 'unknown') {
  const m = getGoalMetrics();
  const st = Number(m.task_start?.[tipo] || 0);
  if (!st) return;
  const elapsed = Math.max(0, Date.now() - st);
  delete m.task_start[tipo];
  if (m.kpi.journeys[tipo]) {
    m.kpi.journeys[tipo].abandoned += 1;
  }
  m.kpi.abandonment.total += 1;
  saveGoalMetrics(m);
  pushUxEvent('journey_abandoned', { journey: tipo, reason, elapsed_ms: elapsed });
}

export function registerJourneyRework(tipo) {
  const m = getGoalMetrics();
  if (!m.kpi.journeys[tipo]) return;
  m.kpi.journeys[tipo].rework += 1;
  m.kpi.rework.total += 1;
  saveGoalMetrics(m);
  pushUxEvent('journey_rework', { journey: tipo });
}

export function startPrimaryActionTracking(page) {
  primaryActionTracker.page = String(page || 'dashboard');
  primaryActionTracker.clicks = 0;
  primaryActionTracker.active = true;
}

function trackPrimaryActionClick(e) {
  if (!primaryActionTracker.active) return;
  const target = e.target?.closest?.('button,[role="button"],a,.tb,.qk,.ni,.ib');
  if (!target) return;
  if (target.id === 'app-act-primary' || target.closest('#app-act-primary')) return;
  primaryActionTracker.clicks += 1;
}

export function completePrimaryActionTracking(page) {
  const p = String(page || primaryActionTracker.page || 'dashboard');
  if (!primaryActionTracker.active) return;
  const m = getGoalMetrics();
  const key = KPI_PAGES.includes(p) ? p : 'dashboard';
  const k = m.kpi.primary_clicks[key];
  const clicksToPrimary = Math.max(1, primaryActionTracker.clicks + 1);
  k.total += clicksToPrimary;
  k.count += 1;
  saveGoalMetrics(m);
  pushUxEvent('primary_action_completed', { page: key, clicks_to_primary: clicksToPrimary });
  primaryActionTracker.active = false;
  primaryActionTracker.clicks = 0;
}

export function registerNotificationKpi(type, amount = 1) {
  const m = getGoalMetrics();
  if (!(type in m.kpi.notifications)) return;
  m.kpi.notifications[type] += Math.max(0, Number(amount || 0));
  saveGoalMetrics(m);
}

export function logStrategicAction(tipo) {
  const m = getGoalMetrics();
  if (!(tipo in m.strategic)) return;
  m.strategic[tipo] += 1;
  saveGoalMetrics(m);
}

export function markConsistencyPage(page) {
  const m = getGoalMetrics();
  if (page in m.consistency) {
    m.consistency[page] = true;
    saveGoalMetrics(m);
  }
}

function classifyToastError(msg, severity = '') {
  const t = norm(msg || '');
  const sev = norm(severity || '');
  if (!t) return;
  const m = getGoalMetrics();
  if (sev === 'error') {
    m.errors.operation += 1;
    saveGoalMetrics(m);
    pushUxEvent('ux_error', { severity: sev, message: String(msg || '').slice(0, 180) });
    return;
  }
  if (sev === 'warning') {
    if (
      t.includes('obrigat') ||
      t.includes('preencha') ||
      t.includes('informe') ||
      t.includes('selecione')
    ) {
      m.errors.validation += 1;
      saveGoalMetrics(m);
      pushUxEvent('ux_validation_warning', {
        severity: sev,
        message: String(msg || '').slice(0, 180)
      });
    }
    return;
  }
  if (
    t.startsWith('informe') ||
    t.startsWith('selecione') ||
    t.startsWith('adicione') ||
    t.includes('obrigat')
  ) {
    m.errors.validation += 1;
    saveGoalMetrics(m);
    pushUxEvent('ux_validation_warning', {
      severity: sev || 'warning',
      message: String(msg || '').slice(0, 180)
    });
    return;
  }
  if (t.startsWith('erro') || t.includes('falha')) {
    m.errors.operation += 1;
    saveGoalMetrics(m);
    pushUxEvent('ux_error', { severity: sev || 'error', message: String(msg || '').slice(0, 180) });
  }
}

function formatMs(ms) {
  const s = Math.round(Number(ms || 0) / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function calcGoalSummary() {
  const m = getGoalMetrics();
  const crit = Object.values(m.critical);
  const withData = crit.filter((c) => c.count > 0);
  const currentAvg = withData.length
    ? withData.reduce((a, c) => a + c.total_ms / c.count, 0) / withData.length
    : 0;
  const baselineAvg = withData.length
    ? withData.reduce((a, c) => a + (c.baseline_ms || 0), 0) / withData.length
    : 0;
  const ganhoTempo = baselineAvg > 0 ? ((baselineAvg - currentAvg) / baselineAvg) * 100 : 0;
  const criticalDone = withData.reduce((a, c) => a + c.count, 0);
  const erros = Number(m.errors.validation || 0) + Number(m.errors.operation || 0);
  const erroRate = criticalDone > 0 ? (erros / criticalDone) * 100 : 0;
  const reducaoRetrabalho = Math.max(0, 30 - erroRate);
  const strategicTotal =
    Number(m.strategic.campanhas || 0) +
    Number(m.strategic.notificacoes || 0) +
    Number(m.strategic.oportunidades || 0);
  const strategicProgress = Math.min(100, (strategicTotal / 25) * 100);
  const consistencyDone = Object.values(m.consistency).filter(Boolean).length;
  const consistencyProgress = (consistencyDone / 4) * 100;
  const completionTotal = Number(m.kpi.completion.total || 0);
  const completionMobile = Number(m.kpi.completion.mobile || 0);
  const mobileCompletionRate = completionTotal > 0 ? (completionMobile / completionTotal) * 100 : 0;
  const clicksByModule = Object.entries(m.kpi.primary_clicks || {}).reduce((acc, [page, data]) => {
    const count = Number(data?.count || 0);
    const total = Number(data?.total || 0);
    acc[page] = { count, avg: count > 0 ? total / count : 0 };
    return acc;
  }, {});
  const clickBuckets = Object.values(clicksByModule).filter((x) => x.count > 0);
  const avgClicksPrimary = clickBuckets.length
    ? clickBuckets.reduce((a, c) => a + c.avg, 0) / clickBuckets.length
    : 0;
  const notiExec = Number(m.kpi.notifications.executadas || 0);
  const notiResolved = Number(m.kpi.notifications.resolvidas || 0);
  const notiReopened = Number(m.kpi.notifications.reabertas || 0);
  const notiResolutionRate = notiExec > 0 ? (notiResolved / notiExec) * 100 : 0;
  const journeys = Object.entries(m.kpi.journeys || {}).reduce((acc, [key, val]) => {
    const started = Number(val?.started || 0);
    const completed = Number(val?.completed || 0);
    const abandoned = Number(val?.abandoned || 0);
    const rework = Number(val?.rework || 0);
    const totalMs = Number(val?.total_ms || 0);
    const avgMs = completed > 0 ? totalMs / completed : 0;
    const abandonmentRate = started > 0 ? (abandoned / started) * 100 : 0;
    const reworkRate = completed > 0 ? (rework / completed) * 100 : 0;
    const clicks = m.kpi.primary_clicks?.[key];
    const clicksAvg = clicks?.count > 0 ? Number(clicks.total || 0) / Number(clicks.count || 1) : 0;
    acc[key] = {
      started,
      completed,
      abandoned,
      rework,
      avgMs,
      abandonmentRate,
      reworkRate,
      clicksAvg
    };
    return acc;
  }, {});
  const journeyBuckets = Object.values(journeys);
  const avgAbandonmentRate = journeyBuckets.length
    ? journeyBuckets.reduce((a, c) => a + c.abandonmentRate, 0) / journeyBuckets.length
    : 0;
  const avgReworkRate = journeyBuckets.length
    ? journeyBuckets.reduce((a, c) => a + c.reworkRate, 0) / journeyBuckets.length
    : 0;
  return {
    m,
    currentAvg,
    baselineAvg,
    ganhoTempo,
    erroRate,
    reducaoRetrabalho,
    strategicTotal,
    strategicProgress,
    consistencyDone,
    consistencyProgress,
    completionTotal,
    completionMobile,
    mobileCompletionRate,
    avgClicksPrimary,
    clicksByModule,
    journeys,
    avgAbandonmentRate,
    avgReworkRate,
    notiExec,
    notiResolved,
    notiReopened,
    notiResolutionRate
  };
}

function renderUxJourneyKpis(summary) {
  const el = document.getElementById('dash-kpi-jornadas');
  if (!el) return;
  const rows = ['cliente', 'pedido', 'campanha', 'produto'];
  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr><th>Jornada</th><th class="table-align-right">Tempo medio</th><th class="table-align-right">Inicios</th><th class="table-align-right">Conclusoes</th><th class="table-align-right">Abandono</th><th class="table-align-right">Retrabalho</th><th class="table-align-right">Cliques</th></tr>
        </thead>
        <tbody>
          ${rows
            .map((j) => {
              const d = summary.journeys?.[j] || {};
              return `<tr><td class="table-cell-strong telemetry-capitalize">${j}</td><td class="table-align-right">${formatMs(d.avgMs || 0)}</td><td class="table-align-right">${d.started || 0}</td><td class="table-align-right">${d.completed || 0}</td><td class="table-align-right">${(d.abandonmentRate || 0).toFixed(1)}%</td><td class="table-align-right">${(d.reworkRate || 0).toFixed(1)}%</td><td class="table-align-right">${(d.clicksAvg || 0).toFixed(1)}</td></tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="dash-goals-foot form-gap-top-xs">
      <span class="bdg ${summary.avgAbandonmentRate <= 20 ? 'bg' : 'ba'}">Abandono medio ${summary.avgAbandonmentRate.toFixed(1)}%</span>
      <span class="bdg ${summary.avgReworkRate <= 20 ? 'bg' : 'ba'}">Retrabalho medio ${summary.avgReworkRate.toFixed(1)}%</span>
    </div>
  `;
}

function renderUxEventsPanel() {
  const el = document.getElementById('dash-kpi-eventos');
  if (!el) return;
  const events = getUxEvents();
  if (!events.length) {
    el.innerHTML = `<div class="empty dash-empty-compact"><p>Sem eventos registrados ainda.</p></div>`;
    return;
  }
  const byType = events.reduce((acc, ev) => {
    const t = String(ev.type || 'unknown');
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const topTypes = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const recent = events.slice(0, 12);
  el.innerHTML = `
    <div class="dash-goals-foot">${topTypes.map(([k, n]) => `<span class="bdg bk">${k}: ${n}</span>`).join('')}</div>
    <div class="tw form-gap-top-xs">
      <table class="tbl">
        <thead><tr><th>Quando</th><th>Tipo</th><th>Pagina</th><th>Detalhe</th></tr></thead>
        <tbody>
          ${recent.map((ev) => `<tr><td>${new Date(ev.ts).toLocaleString('pt-BR')}</td><td><span class="bdg bb">${ev.type}</span></td><td>${ev.page || '—'}</td><td>${ev.journey || ev.message || (ev.clicks_to_primary != null ? `cliques=${ev.clicks_to_primary}` : '—')}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function mapInsightToBadgeClass(kind) {
  if (kind === 'risco') return 'br';
  if (kind === 'atencao') return 'ba';
  return 'bb';
}

function buildRecommendationText(item, summary) {
  if (item.kind === 'risco') {
    return `Impacto alto na operacao. Corrigir agora reduz retrabalho e melhora tempo medio (${formatMs(summary.currentAvg)}).`;
  }
  if (item.kind === 'atencao') {
    return 'Monitorar no curto prazo evita que o problema vire bloqueio operacional.';
  }
  return 'Acao com potencial de ganho comercial direto. Execute para aumentar conversao.';
}

function buildGerencialModel(summary) {
  const insights = [];
  const noti = deps.getNotificacoesResumo();
  const pendenciasCampanha = (D.campanhaEnvios?.[State.FIL] || []).filter(
    (e) => e.status === 'pendente' || e.status === 'manual'
  ).length;
  if (summary.avgAbandonmentRate > 20)
    insights.push({
      kind: 'risco',
      title: 'Abandono elevado nas jornadas criticas',
      metric: `${summary.avgAbandonmentRate.toFixed(1)}%`,
      description:
        'A taxa de abandono esta acima do esperado. Revise friccoes em cliente, pedido e campanha.',
      action: { id: 'ir-clientes', label: 'Revisar jornada de clientes' },
      priority: 1
    });
  if (summary.erroRate > 12)
    insights.push({
      kind: 'risco',
      title: 'Erro operacional acima da meta',
      metric: `${summary.erroRate.toFixed(1)}%`,
      description:
        'Ha mais erros em formularios e operacoes do que o aceitavel para produtividade.',
      action: { id: 'ir-notificacoes', label: 'Abrir notificacoes' },
      priority: 2
    });
  if (noti.critico > 0)
    insights.push({
      kind: 'risco',
      title: 'Itens criticos pendentes',
      metric: `${noti.critico}`,
      description: 'Existem alertas criticos ativos que podem impactar venda e operacao diaria.',
      action: { id: 'ir-notificacoes', label: 'Tratar criticos' },
      priority: 3
    });
  if (pendenciasCampanha > 0)
    insights.push({
      kind: 'atencao',
      title: 'Fila de campanha pendente',
      metric: `${pendenciasCampanha}`,
      description: 'Ha envios manuais/pendentes aguardando execucao da equipe.',
      action: { id: 'ir-campanhas', label: 'Abrir fila de campanhas' },
      priority: 4
    });
  if (noti.oportunidade > 0)
    insights.push({
      kind: 'oportunidade',
      title: 'Oportunidades comerciais detectadas',
      metric: `${noti.oportunidade}`,
      description: 'Clientes elegiveis e eventos proximos podem virar receita com acao rapida.',
      action: { id: 'ir-campanhas', label: 'Criar acao comercial' },
      priority: 5
    });
  if (summary.mobileCompletionRate < 70)
    insights.push({
      kind: 'atencao',
      title: 'Conclusao no mobile abaixo do ideal',
      metric: `${summary.mobileCompletionRate.toFixed(1)}%`,
      description: 'Usuarios mobile concluem menos tarefas. Priorize fluxos com menos passos.',
      action: { id: 'ir-pedidos-novo', label: 'Testar fluxo rapido de pedido' },
      priority: 6
    });
  if (summary.strategicTotal >= 6 && noti.critico === 0 && summary.erroRate <= 12)
    insights.push({
      kind: 'oportunidade',
      title: 'Momento favoravel para acelerar campanhas',
      metric: `${summary.strategicTotal} acoes`,
      description:
        'Base esta estavel. Ha espaco para aumentar cadencia de acoes de relacionamento.',
      action: { id: 'nova-campanha', label: 'Nova campanha' },
      priority: 7
    });
  const orderedInsights = insights.sort((a, b) => a.priority - b.priority).slice(0, 6);
  const recommendations = orderedInsights.map((item, idx) => ({
    id: `rec-${idx + 1}`,
    severity: item.kind,
    title: item.title,
    recommendation: buildRecommendationText(item, summary),
    action: item.action
  }));
  if (!recommendations.length) {
    recommendations.push({
      id: 'rec-baseline',
      severity: 'oportunidade',
      title: 'Painel esta estavel',
      recommendation:
        'Sem riscos imediatos. Atualize os KPIs e avance com acoes comerciais da semana.',
      action: { id: 'atualizar-kpis', label: 'Atualizar KPIs' }
    });
  }
  return { insights: orderedInsights, recommendations };
}

export function executarAcaoGerencial(actionId) {
  const actions = {
    'ir-clientes': () => deps.ir('clientes'),
    'ir-notificacoes': () => deps.ir('notificacoes'),
    'ir-campanhas': () => deps.ir('campanhas'),
    'nova-campanha': () => deps.abrirNovaCampanhaTracked(),
    'ir-pedidos-novo': () => {
      deps.ir('pedidos');
      deps.limparFormPedTracked();
      deps.abrirModal('modal-pedido');
    },
    'atualizar-kpis': () => renderMetasNegocio()
  };
  pushUxEvent('gerencial_action', { action_id: actionId, page: 'gerencial' });
  if (actions[actionId]) actions[actionId]();
}

function renderGerencialLayer(summary) {
  const insightEl = document.getElementById('ger-insights');
  const recEl = document.getElementById('ger-recomendacoes');
  if (!insightEl || !recEl) return;
  const model = buildGerencialModel(summary);
  if (!model.insights.length) {
    insightEl.innerHTML = `<div class="empty dash-empty-compact"><p>Sem insights disponiveis com os dados atuais.</p></div>`;
  } else {
    insightEl.innerHTML = `<div class="ger-insights-grid">${model.insights.map((item) => `<article class="ger-insight-card ger-insight-${item.kind}"><div class="ger-insight-head"><span class="bdg ${mapInsightToBadgeClass(item.kind)}">${item.kind}</span><span class="bdg bk">${item.metric}</span></div><h4>${item.title}</h4><p>${item.description}</p><button class="btn btn-sm" data-click="executarAcaoGerencial('${item.action.id}')">${item.action.label}</button></article>`).join('')}</div>`;
  }
  recEl.innerHTML = `<div class="ger-reco-list">${model.recommendations.map((item, i) => `<article class="ger-reco-item"><div class="ger-reco-meta"><span class="bdg bk">#${i + 1}</span><span class="bdg ${mapInsightToBadgeClass(item.severity)}">${item.severity}</span></div><h4>${item.title}</h4><p>${item.recommendation}</p><button class="btn btn-sm" data-click="executarAcaoGerencial('${item.action.id}')">${item.action.label}</button></article>`).join('')}</div>`;
}

export function renderMetasNegocio() {
  const el = document.getElementById('dash-metas-negocio');
  if (!el) return;
  const s = calcGoalSummary();
  const tempoMeta = Math.min(100, Math.max(0, (s.ganhoTempo / 20) * 100));
  const retrabalhoMeta = Math.min(100, Math.max(0, (s.reducaoRetrabalho / 30) * 100));
  const mobileMeta = Math.min(100, s.mobileCompletionRate);
  const clickMeta = Math.min(100, Math.max(0, (4 / Math.max(1, s.avgClicksPrimary || 1)) * 100));
  const notiMeta = Math.min(100, s.notiResolutionRate);
  const clickResumo = ['clientes', 'campanhas', 'pedidos']
    .map((p) => {
      const d = s.clicksByModule[p] || { avg: 0, count: 0 };
      return `${p.slice(0, 3)} ${d.count ? d.avg.toFixed(1) : '—'}`;
    })
    .join(' · ');
  el.innerHTML = `
    <div class="dash-goals-grid">
      <div class="dash-goal-item"><div class="fb"><div class="telemetry-goal-label">Tempo de acoes criticas</div><span class="bdg ${tempoMeta >= 100 ? 'bg' : 'bb'}">${s.ganhoTempo.toFixed(1)}%</span></div><div class="sbar"><div class="sbar-f" style="width:${tempoMeta}%;background:var(--b)"></div></div><div style="font-size:11px;color:var(--tx3)">Atual ${formatMs(s.currentAvg)} · Meta 20%</div></div>
      <div class="dash-goal-item"><div class="fb"><div class="telemetry-goal-label">Retrabalho por erro visual</div><span class="bdg ${retrabalhoMeta >= 100 ? 'bg' : 'ba'}">${s.erroRate.toFixed(1)}%</span></div><div class="sbar"><div class="sbar-f" style="width:${retrabalhoMeta}%;background:var(--a)"></div></div><div style="font-size:11px;color:var(--tx3)">Validação ${s.m.errors.validation} · Operação ${s.m.errors.operation}</div></div>
      <div class="dash-goal-item"><div class="fb"><div class="telemetry-goal-label">Uso de acoes estrategicas</div><span class="bdg ${s.strategicProgress >= 100 ? 'bg' : 'bb'}">${s.strategicTotal}</span></div><div class="sbar"><div class="sbar-f" style="width:${s.strategicProgress}%;background:var(--g)"></div></div><div style="font-size:11px;color:var(--tx3)">Camp ${s.m.strategic.campanhas} · Noti ${s.m.strategic.notificacoes} · Opp ${s.m.strategic.oportunidades}</div></div>
      <div class="dash-goal-item"><div class="fb"><div class="telemetry-goal-label">Consistencia entre modulos</div><span class="bdg ${s.consistencyProgress >= 100 ? 'bg' : 'ba'}">${s.consistencyDone}/4</span></div><div class="sbar"><div class="sbar-f" style="width:${s.consistencyProgress}%;background:var(--acc)"></div></div><div style="font-size:11px;color:var(--tx3)">Dashboard · Clientes · Campanhas · Pedidos</div></div>
    </div>
    <div class="dash-goals-foot">
      <span class="bdg ${mobileMeta >= 70 ? 'bg' : 'ba'}">Mobile ${s.mobileCompletionRate.toFixed(1)}%</span>
      <span class="bdg ${clickMeta >= 80 ? 'bg' : 'ba'}">Cliques ${s.avgClicksPrimary.toFixed(1)}</span>
      <span class="bdg ${notiMeta >= 70 ? 'bg' : 'ba'}">Notificações ${s.notiResolutionRate.toFixed(1)}%</span>
      <span class="bdg bk">${clickResumo}</span>
      <span class="bdg bk">Exec ${s.notiExec} · Res ${s.notiResolved} · Reab ${s.notiReopened}</span>
    </div>
  `;
  renderUxJourneyKpis(s);
  renderUxEventsPanel();
  renderGerencialLayer(s);
}

export function initGoalTracking() {
  getGoalMetrics();
  document.addEventListener('click', trackPrimaryActionClick, true);
  window.addEventListener('sc:toast', (e) => {
    const detail =
      /** @type {CustomEvent<{ message?: string; severity?: string }>} */ (e).detail || {};
    classifyToastError(detail.message || '', detail.severity || '');
    renderMetasNegocio();
  });
  window.addEventListener('sc:modal-open', (e) => {
    const id = /** @type {CustomEvent<{ id?: string }>} */ (e).detail?.id;
    const journey = resolveJourneyKey(id);
    if (journey) pushUxEvent('modal_open', { modal_id: id, journey });
  });
  window.addEventListener('sc:modal-close', (e) => {
    const id = /** @type {CustomEvent<{ id?: string }>} */ (e).detail?.id;
    const journey = resolveJourneyKey(id);
    if (!journey) return;
    pushUxEvent('modal_close', { modal_id: id, journey });
    const m = getGoalMetrics();
    const started = Number(m.task_start?.[journey] || 0);
    if (started > 0) {
      abandonCriticalTask(journey, 'modal_close');
      renderMetasNegocio();
    }
  });
}

export function resetUxKpis() {
  if (!confirm('Resetar KPIs de UX e telemetria local desta filial/navegador?')) return;
  localStorage.removeItem(GOAL_METRICS_KEY);
  localStorage.removeItem(UX_EVENTS_KEY);
  pushUxEvent('metrics_reset', { reason: 'manual' });
  renderMetasNegocio();
  deps.onMetricsReset();
  toast('KPIs de UX resetados com sucesso.');
}
