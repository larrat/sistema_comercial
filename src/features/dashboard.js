// @ts-check

import { SB } from '../app/api.js';
import { D, State } from '../app/store.js';
import { createScreenDom } from '../shared/dom.js';
import {
  abrirModal,
  fecharModal,
  fmt,
  fmtK,
  pct,
  uid,
  notify,
  focusField
} from '../shared/utils.js';
import { measureRender } from '../shared/render-metrics.js';
import { MSG, SEVERITY } from '../shared/messages.js';
import {
  getOportunidadesJogosDaFilial,
  syncHistoricoOportunidadesJogos
} from './oportunidades-jogos.js';
import { buildSkeletonLines } from './runtime-loading.js';

/** @typedef {import('../types/domain').ScreenDom} ScreenDom */
/** @typedef {import('../types/domain').DashboardModuleCallbacks} DashboardModuleCallbacks */
/** @typedef {import('../types/domain').JogoAgenda} JogoAgenda */
/** @typedef {import('../types/domain').OportunidadeJogo} OportunidadeJogo */

/** @type {NonNullable<DashboardModuleCallbacks['calcSaldosMulti']>} */
let calcSaldosMultiSafe = () => ({});
let dashDerivedCache = null;
/** @type {ScreenDom} */
const dashDom = createScreenDom('dashboard', [
  'dash-fil',
  'dash-opp-camp',
  'dash-desc',
  'dash-met',
  'dash-alerts',
  'dash-chart',
  'dash-chart-empty',
  'dash-status',
  'dash-tp',
  'dash-ea',
  'dash-forn',
  'dash-margem',
  'dash-oportunidades',
  'dash-jogos',
  'jogo-titulo',
  'jogo-campeonato',
  'jogo-data',
  'jogo-mandante',
  'jogo-visitante',
  'jogo-local',
  'jogo-api-url',
  'jogo-api-time'
]);

/**
 * @param {import('../types/domain').Pedido['itens']} itens
 * @returns {import('../types/domain').PedidoItem[]}
 */
function asPedidoItens(itens) {
  return Array.isArray(itens) ? itens : [];
}

const MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const JOGOS_API_URL_KEY = 'jogos_api_url';
const JOGOS_API_FILTRO_KEY = 'jogos_api_filtro';
const JOGOS_AUTO_SYNC_AT_KEY = 'jogos_auto_sync_at';
const JOGOS_AUTO_SYNC_TTL_MS = 30 * 60 * 1000;
const JOGOS_EXPIRY_GRACE_MS = 3 * 60 * 60 * 1000;

/** @type {Map<string, Promise<unknown>>} */
const jogosSyncPromises = new Map();

function isRuntimeBootstrapping() {
  return document.body.dataset.runtimeBootstrap === 'starting';
}

function renderDashboardSkeleton() {
  dashDom.text('header', 'dash-desc', 'Carregando painel...', 'dashboard:skeleton-desc');
  dashDom.html(
    'metrics',
    'dash-met',
    `
    <div class="sk-grid sk-grid-4">
      <div class="sk-card">${buildSkeletonLines(2)}</div>
      <div class="sk-card">${buildSkeletonLines(2)}</div>
      <div class="sk-card">${buildSkeletonLines(2)}</div>
      <div class="sk-card">${buildSkeletonLines(2)}</div>
    </div>
  `,
    'dashboard:skeleton-metrics'
  );
  dashDom.html(
    'alerts',
    'dash-alerts',
    `<div class="sk-card">${buildSkeletonLines(3)}</div>`,
    'dashboard:skeleton-alerts'
  );
  dashDom.html(
    'chart',
    'dash-chart',
    `<div class="sk-card">${buildSkeletonLines(5)}</div>`,
    'dashboard:skeleton-chart'
  );
  dashDom.html(
    'status',
    'dash-status',
    `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'dashboard:skeleton-status'
  );
  dashDom.html(
    'ranking',
    'dash-tp',
    `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'dashboard:skeleton-top'
  );
  dashDom.html(
    'alerts',
    'dash-ea',
    `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'dashboard:skeleton-alert-list'
  );
  dashDom.html(
    'ranking',
    'dash-forn',
    `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'dashboard:skeleton-forn'
  );
  dashDom.html(
    'chart',
    'dash-margem',
    `<div class="sk-card">${buildSkeletonLines(5)}</div>`,
    'dashboard:skeleton-margin'
  );
  dashDom.html(
    'opps',
    'dash-oportunidades',
    `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'dashboard:skeleton-opps'
  );
  dashDom.html(
    'games',
    'dash-jogos',
    `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'dashboard:skeleton-games'
  );
}

function getFilialCalendarioId() {
  const filiais = D.filiais || [];
  const byNome = filiais.find((f) =>
    String(f.nome || '')
      .toLowerCase()
      .includes('filial 1')
  );
  return byNome?.id || filiais[0]?.id || null;
}

function getJogosCache(fid) {
  if (!D.jogos) D.jogos = {};
  if (!D.jogos[fid]) D.jogos[fid] = [];
  return D.jogos[fid];
}

function getJogoDateMs(jogo) {
  const ts = new Date(jogo?.data_hora || 0).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function isJogoExpirado(jogo, nowMs = Date.now()) {
  const ts = getJogoDateMs(jogo);
  if (ts == null) return false;
  const status = String(jogo?.status || '').toLowerCase();
  if (status === 'cancelado' || status === 'realizado') return true;
  return ts + JOGOS_EXPIRY_GRACE_MS < nowMs;
}

function sortJogosAgenda(lista = []) {
  return [...lista].sort(
    (a, b) => new Date(a.data_hora || 0).getTime() - new Date(b.data_hora || 0).getTime()
  );
}

async function purgeExpiredJogos(fid, { persist = true, silent = true } = {}) {
  const cache = getJogosCache(fid);
  const expirados = cache.filter((j) => isJogoExpirado(j));
  if (!expirados.length) return 0;

  D.jogos[fid] = cache.filter((j) => !isJogoExpirado(j));

  if (persist) {
    await Promise.all(
      expirados.map(async (jogo) => {
        const deleteResult = await SB.toResult(() => SB.deleteJogoAgenda(jogo.id));
        if (!deleteResult.ok) {
          console.error('Erro ao limpar jogo expirado', jogo, deleteResult.error);
        }
      })
    );
  }

  if (!silent) {
    notify(`Agenda atualizada: ${expirados.length} jogo(s) passado(s) removido(s).`, SEVERITY.INFO);
  }

  return expirados.length;
}

function getJogosAutoSyncAtMap() {
  try {
    return JSON.parse(localStorage.getItem(JOGOS_AUTO_SYNC_AT_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function setJogosAutoSyncAt(fid, timestamp = Date.now()) {
  const map = getJogosAutoSyncAtMap();
  map[fid] = timestamp;
  localStorage.setItem(JOGOS_AUTO_SYNC_AT_KEY, JSON.stringify(map));
}

function shouldAutoSyncJogos(fid) {
  const apiUrl = localStorage.getItem(JOGOS_API_URL_KEY) || '';
  if (!apiUrl) return false;
  const map = getJogosAutoSyncAtMap();
  const lastAt = Number(map[fid] || 0);
  return !lastAt || Date.now() - lastAt >= JOGOS_AUTO_SYNC_TTL_MS;
}

function _buildDashboardContextualPanel({
  crit = [],
  baixo = [],
  anivProximos = [],
  clientesSemAniversario = 0,
  oportunidades = [],
  oportunidadesHoje = [],
  abertos = 0,
  mg = 0
} = {}) {
  /** @type {string[]} */
  const cards = [];

  if (crit.length) {
    const n = crit.length;
    cards.push(`
      <article class="context-card context-card--danger">
        <div class="context-card__head">
          <span class="bdg br">Prioridade</span>
          <span class="context-card__kicker">Estoque</span>
        </div>
        <div class="context-card__title">Reposição imediata</div>
        <div class="context-card__copy">${n} produto${n !== 1 ? 's' : ''} zerado${n !== 1 ? 's' : ''} — reposição necessária agora.</div>
        <div class="context-card__meta">${crit
          .slice(0, 3)
          .map((p) => p.nome)
          .join(', ')}${n > 3 ? '...' : ''}</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('estoque')">Abrir estoque</button>
        </div>
      </article>
    `);
  } else if (baixo.length) {
    const n = baixo.length;
    cards.push(`
      <article class="context-card context-card--warning">
        <div class="context-card__head">
          <span class="bdg ba">Atenção</span>
          <span class="context-card__kicker">Estoque</span>
        </div>
        <div class="context-card__title">Itens próximos do mínimo</div>
        <div class="context-card__copy">${n} item${n !== 1 ? 'ns' : ''} abaixo do nível ideal — revisão recomendada.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('estoque')">Revisar estoque</button>
        </div>
      </article>
    `);
  }

  if (oportunidades.length) {
    const n = oportunidades.length;
    const nh = oportunidadesHoje.length;
    cards.push(`
      <article class="context-card context-card--success">
        <div class="context-card__head">
          <span class="bdg bg">Ação sugerida</span>
          <span class="context-card__kicker">Campanhas</span>
        </div>
        <div class="context-card__title">Clientes prontos para ativação</div>
        <div class="context-card__copy">${n} oportunidade${n !== 1 ? 's' : ''} por jogos na semana, sendo ${nh} para hoje.</div>
        <div class="context-card__meta">${oportunidades
          .slice(0, 2)
          .map((o) => `${o.cliente} (${o.time})`)
          .join(', ')}</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('campanhas')">Abrir campanhas</button>
          <button class="btn btn-p btn-sm" data-click="abrirNovaCampanha()">Nova campanha</button>
        </div>
      </article>
    `);
  }

  if (anivProximos.length || clientesSemAniversario > 0) {
    const na = anivProximos.length;
    const ns = clientesSemAniversario;
    cards.push(`
      <article class="context-card context-card--info">
        <div class="context-card__head">
          <span class="bdg bb">Relacionamento</span>
          <span class="context-card__kicker">Clientes</span>
        </div>
        <div class="context-card__title">Base pronta para calendário comercial</div>
        <div class="context-card__copy">${na} aniversário${na !== 1 ? 's' : ''} nos próximos 7 dias e ${ns} cadastro${ns !== 1 ? 's' : ''} sem data.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('clientes')">Revisar clientes</button>
        </div>
      </article>
    `);
  }

  if (abertos > 0 && mg < 10) {
    cards.push(`
      <article class="context-card context-card--warning">
        <div class="context-card__head">
          <span class="bdg ba">Pipeline</span>
          <span class="context-card__kicker">Pedidos</span>
        </div>
        <div class="context-card__title">Converter pedidos antes de perder margem</div>
        <div class="context-card__copy">${abertos} pedido${abertos !== 1 ? 's' : ''} em aberto com margem de ${pct(mg)} no período.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('pedidos')">Abrir pedidos</button>
        </div>
      </article>
    `);
  }

  if (!cards.length) return '';

  return `
    <div class="context-panel context-panel--dashboard">
      <div class="context-panel__head">
        <div class="context-panel__title">Contexto sugerido</div>
        <div class="context-panel__sub">Prioridades e próximas ações com base no momento atual da filial</div>
      </div>
      <div class="context-panel__grid">
        ${cards.slice(0, 3).join('')}
      </div>
    </div>
  `;
}

function fmtDataHora(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function buildDashboardContextualPanelV2({
  crit = [],
  baixo = [],
  anivProximos = [],
  clientesSemAniversario = 0,
  oportunidades = [],
  oportunidadesHoje = [],
  abertos = 0,
  mg = 0
} = {}) {
  /** @type {string[]} */
  const operacaoLocal = [];
  /** @type {string[]} */
  const sinaisCruzados = [];

  const renderSection = (title, sub, cards) => {
    if (!cards.length) return '';
    return `
      <section class="context-panel__section">
        <div class="context-panel__section-head">
          <div class="context-panel__section-title">${title}</div>
          <div class="context-panel__section-sub">${sub}</div>
        </div>
        <div class="context-panel__grid">
          ${cards.join('')}
        </div>
      </section>
    `;
  };

  if (crit.length) {
    const n = crit.length;
    operacaoLocal.push(`
      <article class="context-card context-card--danger">
        <div class="context-card__head">
          <span class="bdg br">Prioridade</span>
          <span class="context-card__kicker">Estoque</span>
        </div>
        <div class="context-card__title">Reposicao imediata</div>
        <div class="context-card__copy">${n} produto${n !== 1 ? 's' : ''} zerado${n !== 1 ? 's' : ''} e reposicao necessaria agora.</div>
        <div class="context-card__meta">${crit
          .slice(0, 3)
          .map((p) => p.nome)
          .join(', ')}${n > 3 ? '...' : ''}</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('estoque')">Abrir estoque</button>
        </div>
      </article>
    `);
  } else if (baixo.length) {
    const n = baixo.length;
    operacaoLocal.push(`
      <article class="context-card context-card--warning">
        <div class="context-card__head">
          <span class="bdg ba">Atencao</span>
          <span class="context-card__kicker">Estoque</span>
        </div>
        <div class="context-card__title">Itens proximos do minimo</div>
        <div class="context-card__copy">${n} item${n !== 1 ? 'ns' : ''} abaixo do nivel ideal e pedindo revisao.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('estoque')">Revisar estoque</button>
        </div>
      </article>
    `);
  }

  if (abertos > 0 && mg < 10) {
    operacaoLocal.push(`
      <article class="context-card context-card--warning">
        <div class="context-card__head">
          <span class="bdg ba">Pipeline</span>
          <span class="context-card__kicker">Pedidos</span>
        </div>
        <div class="context-card__title">Converter pedidos antes de perder margem</div>
        <div class="context-card__copy">${abertos} pedido${abertos !== 1 ? 's' : ''} em aberto com margem de ${pct(mg)} no periodo.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('pedidos')">Abrir pedidos</button>
        </div>
      </article>
    `);
  }

  if (oportunidades.length) {
    const n = oportunidades.length;
    const nh = oportunidadesHoje.length;
    sinaisCruzados.push(`
      <article class="context-card context-card--success">
        <div class="context-card__head">
          <span class="bdg bg">Acao sugerida</span>
          <span class="context-card__kicker">Campanhas</span>
        </div>
        <div class="context-card__title">Clientes prontos para ativacao</div>
        <div class="context-card__copy">${n} oportunidade${n !== 1 ? 's' : ''} por jogos na semana, sendo ${nh} para hoje.</div>
        <div class="context-card__meta">${oportunidades
          .slice(0, 2)
          .map((o) => `${o.cliente} (${o.time})`)
          .join(', ')}</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('campanhas')">Abrir campanhas</button>
          <button class="btn btn-p btn-sm" data-click="abrirNovaCampanha()">Nova campanha</button>
        </div>
      </article>
    `);
  }

  if (anivProximos.length || clientesSemAniversario > 0) {
    const na = anivProximos.length;
    const ns = clientesSemAniversario;
    sinaisCruzados.push(`
      <article class="context-card context-card--info">
        <div class="context-card__head">
          <span class="bdg bb">Relacionamento</span>
          <span class="context-card__kicker">Clientes</span>
        </div>
        <div class="context-card__title">Base pronta para calendario comercial</div>
        <div class="context-card__copy">${na} aniversario${na !== 1 ? 's' : ''} nos proximos 7 dias e ${ns} cadastro${ns !== 1 ? 's' : ''} sem data.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="ir('clientes')">Revisar clientes</button>
        </div>
      </article>
    `);
  }

  const sections = [
    renderSection(
      'Operacao local',
      'Leituras do proprio dashboard que pedem acao direta na filial.',
      operacaoLocal.slice(0, 2)
    ),
    renderSection(
      'Sinais cruzados',
      'Dados de clientes e campanhas que ajudam a priorizar a proxima jogada comercial.',
      sinaisCruzados.slice(0, 2)
    )
  ].filter(Boolean);

  if (!sections.length) return '';

  return `
    <div class="context-panel context-panel--dashboard">
      <div class="context-panel__head">
        <div class="context-panel__title">Contexto sugerido</div>
        <div class="context-panel__sub">Prioridades separadas entre operacao desta tela e sinais cruzados do sistema</div>
      </div>
      <div class="context-panel__sections">
        ${sections.join('')}
      </div>
    </div>
  `;
}

function normTxt(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function _parseTimes(v) {
  const raw = Array.isArray(v) ? v : String(v || '').split(/[,;\n]+/);

  const seen = new Set();
  const out = [];

  raw.forEach((item) => {
    const nome = String(item || '').trim();
    if (!nome) return;
    const key = normTxt(nome);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(nome);
  });

  return out;
}

function _jogoTemTime(j, time) {
  const t = normTxt(time);
  if (!t) return false;
  return [j.mandante, j.visitante, j.titulo, j.campeonato].map(normTxt).some((x) => x.includes(t));
}

function _jogoEhDaSerie(j, serie = 'todas') {
  const s = String(serie || 'todas').toLowerCase();
  if (s === 'todas') return true;

  const camp = normTxt(j?.campeonato || '');
  if (!camp) return false;

  if (s === 'a') return /\bserie a\b|\bserie-a\b|\bseriea\b/.test(camp);
  if (s === 'b') return /\bserie b\b|\bserie-b\b|\bserieb\b/.test(camp);
  if (s === 'c') return /\bserie c\b|\bserie-c\b|\bseriec\b/.test(camp);
  return true;
}

function statusJogoExt(v) {
  const s = String(v || '').toLowerCase();
  if (['finished', 'ft', 'realizado', 'fulltime'].includes(s)) return 'realizado';
  if (['cancelled', 'canceled', 'postponed', 'cancelado'].includes(s)) return 'cancelado';
  return 'agendado';
}

function pickDataHora(obj) {
  if (obj?.strDate && obj?.strTime) return `${obj.strDate}T${obj.strTime}`;
  if (obj?.dateEvent && obj?.strTime) return `${obj.dateEvent}T${obj.strTime}`;
  if (obj?.dateEvent && obj?.time) return `${obj.dateEvent}T${obj.time}`;
  if (obj?.fixture?.date) return obj.fixture.date;
  if (obj?.fixture?.timestamp) {
    const ts = Number(obj.fixture.timestamp);
    if (!isNaN(ts)) return new Date(ts * 1000).toISOString();
  }
  return obj?.data_hora || obj?.date || obj?.utcDate || obj?.datetime || obj?.strTimestamp || null;
}

function normalizeJogoExterno(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const home =
    raw.homeTeam?.name ||
    raw.teams?.home?.name ||
    raw.fixture?.teams?.home?.name ||
    raw.strHomeTeam ||
    raw.home ||
    raw.mandante ||
    '';

  const away =
    raw.awayTeam?.name ||
    raw.teams?.away?.name ||
    raw.fixture?.teams?.away?.name ||
    raw.strAwayTeam ||
    raw.away ||
    raw.visitante ||
    '';

  const data_hora = pickDataHora(raw);
  if (!data_hora) return null;

  const titulo =
    raw.titulo ||
    raw.title ||
    raw.name ||
    raw.strEvent ||
    (home || away ? `${home || 'Mandante'} x ${away || 'Visitante'}` : '');

  if (!titulo) return null;

  const extId = raw.id || raw.idEvent || raw.fixture?.id || raw.match_id || raw.game_id || null;

  const campeonato =
    raw.competition?.name || raw.league?.name || raw.strLeague || raw.campeonato || null;

  const local = raw.venue?.name || raw.fixture?.venue?.name || raw.strVenue || raw.local || null;

  const status = statusJogoExt(
    raw.status?.short || raw.status?.type || raw.status || raw.strStatus
  );

  return {
    extId: extId ? String(extId) : null,
    titulo,
    campeonato,
    data_hora,
    mandante: home || null,
    visitante: away || null,
    local,
    status
  };
}

function stableJogoId(j) {
  const base = [
    String(j.data_hora || ''),
    String(j.mandante || ''),
    String(j.visitante || ''),
    String(j.titulo || '')
  ]
    .join('|')
    .toLowerCase()
    .trim();

  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }

  return `sync-${Math.abs(hash)}`;
}

function extrairListaJogos(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.response)) return payload.response;
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getProxAnivDate(dataAniversario, baseDate) {
  if (!dataAniversario) return null;
  const [, m, d] = String(dataAniversario).split('-').map(Number);
  if (!m || !d) return null;

  const y = baseDate.getFullYear();
  let aniv = new Date(y, m - 1, d);
  aniv.setHours(0, 0, 0, 0);

  if (aniv < baseDate) {
    aniv = new Date(y + 1, m - 1, d);
    aniv.setHours(0, 0, 0, 0);
  }

  return aniv;
}

function getDiasAteData(targetDate, baseDate) {
  if (!(targetDate instanceof Date) || isNaN(targetDate.getTime())) return null;
  const base = new Date(baseDate);
  base.setHours(0, 0, 0, 0);
  const alvo = new Date(targetDate);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - base.getTime()) / 86400000);
}

export function initDashboardModule(callbacks = {}) {
  calcSaldosMultiSafe = callbacks.calcSaldosMulti || (() => ({}));
}

function getRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (State.dashP === 'semana') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0, 0, 0, 0);
    return [d, now];
  }

  if (State.dashP === 'mes') return [new Date(y, m, 1), now];
  if (State.dashP === 'ano') return [new Date(y, 0, 1), now];

  return [new Date(2000, 0, 1), now];
}

function inR(ds, range) {
  if (!ds) return false;
  const [from, to] = range;
  const d = new Date(ds + 'T00:00:00');
  return d >= from && d <= to;
}

/**
 * @param {{ fsel: string, serieSel: string, range: Date[], filIds: string[], saldos: Record<string, { saldo: number, cm?: number }> }} params
 */
function getDashboardDerivedData({ fsel, serieSel, range, filIds, saldos }) {
  const pedidosRefs = filIds.map((fid) => D.pedidos?.[fid] || []);
  const produtosRefs = filIds.map((fid) => D.produtos?.[fid] || []);
  const clientesRefs = filIds.map((fid) => D.clientes?.[fid] || []);
  const cotRefs = filIds.map((fid) => D.cotConfig?.[fid]?.logs || []);
  const jogosRef = D.jogos?.[fsel] || [];

  if (
    dashDerivedCache &&
    dashDerivedCache.fsel === fsel &&
    dashDerivedCache.serieSel === serieSel &&
    dashDerivedCache.periodo === State.dashP &&
    dashDerivedCache.saldosRef === saldos &&
    pedidosRefs.length === dashDerivedCache.pedidosRefs.length &&
    pedidosRefs.every(
      (ref, idx) =>
        ref === dashDerivedCache.pedidosRefs[idx] &&
        ref.length === dashDerivedCache.pedidosLens[idx]
    ) &&
    produtosRefs.every(
      (ref, idx) =>
        ref === dashDerivedCache.produtosRefs[idx] &&
        ref.length === dashDerivedCache.produtosLens[idx]
    ) &&
    clientesRefs.every(
      (ref, idx) =>
        ref === dashDerivedCache.clientesRefs[idx] &&
        ref.length === dashDerivedCache.clientesLens[idx]
    ) &&
    cotRefs.every(
      (ref, idx) =>
        ref === dashDerivedCache.cotRefs[idx] && ref.length === dashDerivedCache.cotLens[idx]
    ) &&
    jogosRef === dashDerivedCache.jogosRef &&
    jogosRef.length === dashDerivedCache.jogosLen
  ) {
    return dashDerivedCache.result;
  }

  const allPeds = filIds.flatMap((fid) =>
    (D.pedidos?.[fid] || []).map((p) => ({ ...p, _fid: fid }))
  );
  const entregues = allPeds.filter((p) => p.status === 'entregue' && inR(p.data, range));
  const fat = entregues.reduce((a, p) => a + (p.total || 0), 0);
  const lucro = entregues.reduce(
    (a, p) => a + asPedidoItens(p.itens).reduce((b, i) => b + (i.preco - i.custo) * i.qty, 0),
    0
  );
  const mg = fat > 0 ? (lucro / fat) * 100 : 0;
  const tk = entregues.length ? fat / entregues.length : 0;
  const abertos = allPeds.filter((p) =>
    ['orcamento', 'confirmado', 'em_separacao'].includes(p.status)
  ).length;

  const allProds = filIds.flatMap((fid) =>
    (D.produtos?.[fid] || []).map((p) => ({ ...p, _fid: fid }))
  );
  const crit = allProds.filter((p) => {
    const s = saldos[p._fid + '_' + p.id];
    return s && s.saldo <= 0;
  });
  const baixo = allProds.filter((p) => {
    const s = saldos[p._fid + '_' + p.id];
    return s && p.emin > 0 && s.saldo > 0 && s.saldo < p.emin;
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 7);

  const clientesFilial = filIds.flatMap((fid) => D.clientes?.[fid] || []);
  const anivProximos = clientesFilial
    .map((c) => {
      const data = getProxAnivDate(c.data_aniversario, hoje);
      if (!data) return null;
      return { ...c, _anivData: data };
    })
    .filter(Boolean)
    .filter((c) => c._anivData <= limite)
    .sort((a, b) => a._anivData.getTime() - b._anivData.getTime());
  const clientesComAniversario = clientesFilial.filter(
    (c) => !!String(c.data_aniversario || '').trim()
  );
  const clientesSemAniversario = Math.max(0, clientesFilial.length - clientesComAniversario.length);

  /** @type {OportunidadeJogo[]} */
  const oportunidades = getOportunidadesJogosDaFilial(fsel, { serie: serieSel });
  const oportunidadesHoje = oportunidades.filter((o) => {
    const d = new Date(o.data);
    if (isNaN(d.getTime())) return false;
    const fimHoje = new Date(hoje);
    fimHoje.setDate(fimHoje.getDate() + 1);
    return d >= hoje && d < fimHoje;
  });

  const grupos = {};
  entregues.forEach((p) => {
    const d = new Date(p.data + 'T00:00:00');
    const k =
      State.dashP === 'ano' ? MES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2) : p.data;
    if (!grupos[k]) grupos[k] = { fat: 0, lucro: 0 };
    grupos[k].fat += p.total || 0;
    grupos[k].lucro += asPedidoItens(p.itens).reduce((a, i) => a + (i.preco - i.custo) * i.qty, 0);
  });
  const gkeys = Object.keys(grupos).sort().slice(-10);

  const stMap = { orcamento: 0, confirmado: 0, em_separacao: 0, entregue: 0, cancelado: 0 };
  allPeds.forEach((p) => {
    if (p.status in stMap) stMap[p.status]++;
  });

  const pq = {};
  entregues.forEach((p) => {
    asPedidoItens(p.itens).forEach((i) => {
      if (!pq[i.nome]) pq[i.nome] = { fat: 0 };
      pq[i.nome].fat += i.qty * i.preco;
    });
  });
  const tp = Object.entries(pq)
    .sort((a, b) => b[1].fat - a[1].fat)
    .slice(0, 5);
  const mxP = tp.length ? tp[0][1].fat : 1;

  const alertProds = allProds
    .filter((p) => {
      const s = saldos[p._fid + '_' + p.id];
      return s && p.emin > 0 && s.saldo < p.emin;
    })
    .slice(0, 5);

  const fu = {};
  filIds.forEach((fid) => {
    (D.cotConfig?.[fid]?.logs || []).forEach((l) => {
      const fornecedor = String(l.forn || '').trim();
      if (!fornecedor) return;
      if (!fu[fornecedor]) fu[fornecedor] = 0;
      fu[fornecedor]++;
    });
  });
  const tf = Object.entries(fu)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const mxF2 = tf.length ? tf[0][1] : 1;

  const mp = {};
  entregues.forEach((p) => {
    asPedidoItens(p.itens).forEach((i) => {
      if (!mp[i.nome]) mp[i.nome] = { fat: 0, lucro: 0, qty: 0 };
      mp[i.nome].fat += i.qty * i.preco;
      mp[i.nome].lucro += (i.preco - i.custo) * i.qty;
      mp[i.nome].qty += i.qty;
    });
  });
  const tmg = Object.entries(mp)
    .sort((a, b) => b[1].fat - a[1].fat)
    .slice(0, 8);

  const result = {
    allPeds,
    entregues,
    fat,
    lucro,
    mg,
    tk,
    abertos,
    allProds,
    crit,
    baixo,
    hoje,
    anivProximos,
    clientesFilial,
    clientesSemAniversario,
    oportunidades,
    oportunidadesHoje,
    grupos,
    gkeys,
    stMap,
    tp,
    mxP,
    alertProds,
    tf,
    mxF2,
    tmg
  };

  dashDerivedCache = {
    fsel,
    serieSel,
    periodo: State.dashP,
    saldosRef: saldos,
    pedidosRefs,
    pedidosLens: pedidosRefs.map((items) => items.length),
    produtosRefs,
    produtosLens: produtosRefs.map((items) => items.length),
    clientesRefs,
    clientesLens: clientesRefs.map((items) => items.length),
    cotRefs,
    cotLens: cotRefs.map((items) => items.length),
    jogosRef,
    jogosLen: jogosRef.length,
    result
  };

  return result;
}

export function setP(p, btn) {
  State.dashP = p;

  document.querySelectorAll('#dash-pseg button').forEach((b) => b.classList.remove('on'));
  if (btn) btn.classList.add('on');

  renderDash();
}

export function renderDashFilSel() {
  const s = dashDom.get('dash-fil');
  if (!s) return;
  const filialAtiva = (D.filiais || []).find((f) => f.id === State.FIL);
  const label = filialAtiva?.nome || 'Filial ativa';
  dashDom.select(
    'filters',
    'dash-fil',
    `<option value="${State.FIL || ''}">${label}</option>`,
    State.FIL || '',
    'dashboard:filiais'
  );
  s.disabled = true;
}

export function renderDash() {
  return measureRender('dashboard', () => {
    const fsel = State.FIL || dashDom.get('dash-fil')?.value || '';
    const serieSel = dashDom.get('dash-opp-camp')?.value || 'todas';
    const range = getRange();
    const pedidosFilial = D.pedidos?.[fsel] || [];
    const produtosFilial = D.produtos?.[fsel] || [];
    const clientesFilialBoot = D.clientes?.[fsel] || [];

    if (
      isRuntimeBootstrapping() &&
      !pedidosFilial.length &&
      !produtosFilial.length &&
      !clientesFilialBoot.length
    ) {
      renderDashboardSkeleton();
      return;
    }

    const pLabels = {
      semana: 'Esta semana',
      mes: 'Este mes',
      ano: 'Este ano',
      tudo: 'Todos os períodos'
    };

    const fLabel = (D.filiais || []).find((f) => f.id === fsel)?.nome || 'Filial ativa';

    dashDom.text(
      'header',
      'dash-desc',
      `${fLabel} - ${pLabels[State.dashP]}`,
      'dashboard:descricao'
    );

    renderDashJogos(fsel);

    const filIds = fsel ? [fsel] : [];
    /** @type {Record<string, { saldo: number; cm?: number }>} */
    const saldos = calcSaldosMultiSafe(filIds);
    const {
      allPeds,
      entregues,
      fat,
      lucro,
      mg,
      tk,
      abertos,
      allProds: _allProds,
      crit,
      baixo,
      hoje,
      anivProximos,
      clientesFilial,
      clientesSemAniversario,
      oportunidades,
      oportunidadesHoje,
      grupos,
      gkeys,
      stMap,
      tp,
      mxP,
      alertProds,
      tf,
      mxF2,
      tmg
    } = getDashboardDerivedData({ fsel, serieSel, range, filIds, saldos });

    dashDom.html(
      'metrics',
      'dash-met',
      `
    <div class="met metric-card">
      <div class="metric-card__eyebrow">Receita</div>
      <div class="ml">Faturamento</div>
      <div class="mv kpi-value-sm">${fmt(fat)}</div>
      <div class="ms metric-card__foot">${entregues.length} entregue(s)</div>
    </div>
    <div class="met metric-card">
      <div class="metric-card__eyebrow">Resultado</div>
      <div class="ml">Lucro bruto</div>
      <div class="mv kpi-value-sm ${lucro >= 0 ? 'tone-success' : 'tone-critical'}">${fmt(lucro)}</div>
      <div class="ms metric-card__foot">${lucro >= 0 ? 'Operação saudável' : 'Abaixo do esperado'}</div>
    </div>
    <div class="met metric-card">
      <div class="metric-card__eyebrow">Eficiência</div>
      <div class="ml">Margem</div>
      <div class="mv ${mg >= 15 ? 'tone-success' : mg >= 8 ? 'tone-warning' : 'tone-critical'}">${pct(mg)}</div>
      <div class="ms metric-card__foot">${mg >= 15 ? 'Boa zona de margem' : mg >= 8 ? 'Atenção' : 'Revisar mix e preço'}</div>
    </div>
    <div class="met metric-card">
      <div class="metric-card__eyebrow">Conversão</div>
      <div class="ml">Ticket médio</div>
      <div class="mv kpi-value-sm">${fmt(tk)}</div>
      <div class="ms metric-card__foot">Base ${allPeds.length} pedido(s)</div>
    </div>
    <div class="met metric-card">
      <div class="metric-card__eyebrow">Pipeline</div>
      <div class="ml">Em aberto</div>
      <div class="mv tone-warning">${abertos}</div>
      <div class="ms metric-card__foot">Orçamentos e confirmados</div>
    </div>
  `,
      'dashboard:metrics'
    );

    let _ah = '';
    if (crit.length) {
      _ah += `
      <div class="alert al-r dash-alert-card">
        <div class="dash-alert-card__title"><b>Estoque crítico</b></div>
        <div class="dash-alert-card__copy">${crit.length} produto${crit.length !== 1 ? 's' : ''} zerado${crit.length !== 1 ? 's' : ''}. ${crit
          .slice(0, 3)
          .map((p) => p.nome)
          .join(', ')}${crit.length > 3 ? '...' : ''}</div>
      </div>`;
    }
    if (baixo.length) {
      _ah += `
      <div class="alert al-a dash-alert-card">
        <div class="dash-alert-card__title"><b>Estoque em atenção</b></div>
        <div class="dash-alert-card__copy">${baixo.length} item${baixo.length !== 1 ? 'ns' : ''} abaixo do mínimo. ${baixo
          .slice(0, 3)
          .map((p) => p.nome)
          .join(', ')}${baixo.length > 3 ? '...' : ''}</div>
      </div>`;
    }

    let ah = _ah;
    if (clientesFilial.length && clientesSemAniversario > 0) {
      ah += `<div class="alert al-a"><b>Aniversário pendente:</b> ${clientesSemAniversario} cliente${clientesSemAniversario !== 1 ? 's' : ''} sem data de aniversário cadastrada.</div>`;
    }

    if (anivProximos.length) {
      const resumoAniversarios = anivProximos
        .slice(0, 3)
        .map((c) => {
          const dias = getDiasAteData(c._anivData, hoje);
          const nome = c.apelido || c.nome;
          if (dias === 0) return `${nome} hoje`;
          if (dias === 1) return `${nome} amanhã`;
          if (typeof dias === 'number' && dias > 1) return `${nome} em ${dias} dias`;
          return nome;
        })
        .join(', ');
      ah += `<div class="alert al-g"><b>Aniversários próximos:</b> ${resumoAniversarios}${anivProximos.length > 3 ? '...' : ''}</div>`;
    }

    syncHistoricoOportunidadesJogos(fsel, oportunidades);

    if (oportunidades.length) {
      const serieTxt = serieSel === 'todas' ? 'todas as séries' : `Série ${serieSel.toUpperCase()}`;
      ah += `<div class="alert al-g"><b>Oportunidades por jogos:</b> ${oportunidades.length} cliente${oportunidades.length !== 1 ? 's' : ''} elegível${oportunidades.length !== 1 ? 'is' : ''} na semana (${serieTxt}). ${oportunidades
        .slice(0, 3)
        .map((o) => `${o.cliente} (${o.time})`)
        .join(', ')}${oportunidades.length > 3 ? '...' : ''}</div>`;
    }

    void ah;
    const contextHtml = buildDashboardContextualPanelV2({
      crit,
      baixo,
      anivProximos,
      clientesSemAniversario,
      oportunidades,
      oportunidadesHoje,
      abertos,
      mg
    });

    dashDom.html('alerts', 'dash-alerts', contextHtml, 'dashboard:alerts');

    const chartEl = dashDom.get('dash-chart');
    const emEl = dashDom.get('dash-chart-empty');

    if (chartEl && emEl) {
      if (!gkeys.length) {
        chartEl.style.display = 'none';
        emEl.style.display = 'block';
      } else {
        chartEl.style.display = 'flex';
        emEl.style.display = 'none';

        const mxF = Math.max(...gkeys.map((k) => grupos[k].fat), 1);

        dashDom.html(
          'chart',
          'dash-chart',
          gkeys
            .map((k) => {
              const g = grupos[k];
              const hF = Math.round((g.fat / mxF) * 100);
              const hL = Math.round((Math.max(0, g.lucro) / mxF) * 100);
              const lbl = State.dashP === 'ano' ? k : k.split('-').slice(1).join('/');

              return `
          <div class="bc-col">
            <div class="bc-val">${fmtK(g.fat)}</div>
            <div class="dash-chart-bars">
              <div class="dash-chart-bar-col">
                <div class="bc-bar dash-chart-bar dash-chart-bar--fat" style="height:${hF}%"></div>
              </div>
              <div class="dash-chart-bar-col">
                <div class="bc-bar dash-chart-bar dash-chart-bar--lucro" style="height:${hL}%"></div>
              </div>
            </div>
            <div class="bc-lbl">${lbl}</div>
          </div>
        `;
            })
            .join(''),
          'dashboard:chart'
        );
      }
    }

    const stLbl = {
      orcamento: 'Orçamento',
      confirmado: 'Confirmado',
      em_separacao: 'Em separação',
      entregue: 'Entregue',
      cancelado: 'Cancelado'
    };

    const stCls = {
      orcamento: 'bk',
      confirmado: 'bb',
      em_separacao: 'ba',
      entregue: 'bg',
      cancelado: 'br'
    };

    const tot = allPeds.length || 1;

    dashDom.html(
      'status',
      'dash-status',
      Object.entries(stMap)
        .map(
          ([k, v]) => `
      <div class="rrow dash-status-row dash-status-row--${k}">
        <span class="bdg ${stCls[k]}">${stLbl[k]}</span>
        <div class="rbar"><div class="rbar-f dash-status-bar dash-status-bar--${k}" style="width:${Math.round((v / tot) * 100)}%"></div></div>
        <span class="dash-status-count">${v}</span>
        <span class="dash-status-share">${Math.round((v / tot) * 100)}%</span>
      </div>
    `
        )
        .join(''),
      'dashboard:status'
    );

    dashDom.html(
      'top-products',
      'dash-tp',
      tp.length
        ? tp
            .map(
              ([n, d], i) => `
          <div class="rrow dash-rank-row">
            <span class="rnum">${i + 1}</span>
            <div class="dash-rank-main">
              <span class="dash-top-label${i === 0 ? ' dash-top-label--lead' : ''}">${n}</span>
              <span class="dash-rank-meta">Faturamento no período</span>
            </div>
            <div class="rbar"><div class="rbar-f dash-top-bar dash-top-bar--fat" style="width:${Math.round((d.fat / mxP) * 100)}%"></div></div>
            <span class="rval">${fmtK(d.fat)}</span>
          </div>
        `
            )
            .join('')
        : `<div class="empty dash-empty-compact"><p>Sem vendas</p></div>`,
      'dashboard:top-produtos'
    );

    dashDom.html(
      'stock-alerts',
      'dash-ea',
      alertProds.length
        ? alertProds
            .map((p) => {
              const s = saldos[p._fid + '_' + p.id];
              return `
            <div class="rrow">
              <span class="dash-dot ${s.saldo <= 0 ? 'dash-dot--critical' : 'dash-dot--warning'}"></span>
              <span class="dash-top-label">${p.nome}</span>
              <span class="bdg ${s.saldo <= 0 ? 'br' : 'ba'} dash-badge-xs">${s.saldo <= 0 ? 'Zerado' : s.saldo}</span>
            </div>
          `;
            })
            .join('')
        : `<div class="empty dash-empty-compact"><p>Sem alertas</p></div>`,
      'dashboard:estoque-alerta'
    );

    dashDom.html(
      'suppliers',
      'dash-forn',
      tf.length
        ? tf
            .map(
              ([n, c], i) => `
          <div class="rrow dash-rank-row">
            <span class="rnum">${i + 1}</span>
            <div class="dash-rank-main">
              <span class="dash-top-label${i === 0 ? ' dash-top-label--lead' : ''}">${n}</span>
              <span class="dash-rank-meta">Importações recentes</span>
            </div>
            <div class="rbar"><div class="rbar-f dash-top-bar dash-top-bar--forn" style="width:${Math.round((c / mxF2) * 100)}%"></div></div>
            <span class="rval dash-rval-muted">${c}x</span>
          </div>
        `
            )
            .join('')
        : `<div class="empty dash-empty-compact"><p>Nenhuma importação</p></div>`,
      'dashboard:fornecedores'
    );

    dashDom.html(
      'margin',
      'dash-margem',
      tmg.length
        ? `
        <div class="tw">
          <table class="tbl">
            <thead>
              <tr>
                <th>Produto</th>
                <th class="table-align-right">Qtd</th>
                <th class="table-align-right">Faturamento</th>
                <th class="table-align-right">Lucro</th>
                <th class="table-align-right">Margem</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tmg
                .map(([n, d]) => {
                  const mgv = d.fat > 0 ? (d.lucro / d.fat) * 100 : 0;
                  return `
                  <tr>
                    <td class="table-cell-strong">${n}</td>
                    <td class="table-align-right table-cell-muted">${d.qty.toFixed(1)}</td>
                    <td class="table-align-right">${fmt(d.fat)}</td>
                    <td class="table-align-right table-cell-success">${fmt(d.lucro)}</td>
                    <td class="table-align-right table-cell-strong">${pct(mgv)}</td>
                    <td><span class="bdg ${mgv >= 20 ? 'bg' : mgv >= 10 ? 'ba' : 'br'}">${mgv >= 20 ? 'Boa' : mgv >= 10 ? 'Regular' : 'Baixa'}</span></td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      `
        : `<div class="empty dash-empty-compact"><p>Sem vendas no período</p></div>`,
      'dashboard:margem'
    );

    const serieLabel = serieSel === 'todas' ? 'Todas as séries' : `Série ${serieSel.toUpperCase()}`;
    dashDom.html(
      'opportunities',
      'dash-oportunidades',
      `
      <div class="rrow dash-row-gap dash-summary-strip">
        <span class="bdg bk">${serieLabel}</span>
        <span class="bdg ${oportunidadesHoje.length ? 'bg' : 'bk'}">Hoje: ${oportunidadesHoje.length}</span>
        <span class="bdg ${oportunidades.length ? 'ba' : 'bk'}">Semana: ${oportunidades.length}</span>
      </div>
      <div class="dash-op-actions">
        <button class="btn btn-sm" data-click="ir('campanhas')">Abrir campanhas</button>
        <button class="btn btn-p btn-sm" data-click="abrirNovaCampanha()">Nova campanha</button>
      </div>
      ${
        oportunidades.length
          ? oportunidades
              .slice(0, 5)
              .map(
                (o) => `
          <div class="rrow dash-op-item">
            <span class="dash-dot dash-dot--success"></span>
            <div class="dash-row-main">
              <div class="dash-row-title">${o.cliente} - ${o.time}</div>
              <div class="dash-row-sub">${o.jogo.titulo || `${o.jogo.mandante || ''} x ${o.jogo.visitante || ''}`} - ${fmtDataHora(o.jogo.data_hora)}</div>
            </div>
            <div class="fg2">
              <button class="btn btn-sm" data-click="ir('campanhas')">Acionar</button>
              <button class="btn btn-sm" data-click="abrirValidacaoOportunidade('${o.id}')">Validar</button>
            </div>
          </div>
        `
              )
              .join('')
          : `<div class="empty dash-empty-compact"><p>Sem oportunidades por jogos na semana</p></div>`
      }
    `,
      'dashboard:oportunidades'
    );
  });
}

export function limparFormJogo() {
  const dataPadrao = new Date();
  dataPadrao.setHours(dataPadrao.getHours() + 2);
  const dataLocal = new Date(dataPadrao.getTime() - dataPadrao.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const t = dashDom.get('jogo-titulo');
  const c = dashDom.get('jogo-campeonato');
  const d = dashDom.get('jogo-data');
  const m = dashDom.get('jogo-mandante');
  const v = dashDom.get('jogo-visitante');
  const l = dashDom.get('jogo-local');

  if (t) dashDom.value('jogo-titulo', '');
  if (c) dashDom.value('jogo-campeonato', '');
  if (d) dashDom.value('jogo-data', dataLocal);
  if (m) dashDom.value('jogo-mandante', '');
  if (v) dashDom.value('jogo-visitante', '');
  if (l) dashDom.value('jogo-local', '');
}

export function abrirNovoJogo() {
  limparFormJogo();
  abrirModal('modal-jogo');
}

export function abrirSyncJogos() {
  const urlInp = dashDom.get('jogo-api-url');
  const filtroInp = dashDom.get('jogo-api-time');
  if (urlInp) {
    urlInp.value = localStorage.getItem(JOGOS_API_URL_KEY) || '';
  }
  if (filtroInp) {
    filtroInp.value = localStorage.getItem(JOGOS_API_FILTRO_KEY) || '';
  }
  abrirModal('modal-jogo-sync');
}

export function usarExemploSyncJogos(apiUrl, filtro = '') {
  const urlInp = dashDom.get('jogo-api-url');
  const filtroInp = dashDom.get('jogo-api-time');
  if (urlInp) urlInp.value = apiUrl || '';
  if (filtroInp) filtroInp.value = filtro || '';
}

export async function sincronizarJogosDashboard(options = {}) {
  const {
    apiUrl: forcedApiUrl = '',
    filtroTime: forcedFiltroTime = '',
    silent = false,
    auto = false
  } = options;
  const filialId = getFilialCalendarioId();
  if (!filialId) {
    if (!silent) notify(MSG.jogos.missingFilial, SEVERITY.ERROR);
    return;
  }

  if (jogosSyncPromises.has(filialId)) {
    return jogosSyncPromises.get(filialId);
  }

  const apiUrl = String(
    forcedApiUrl ||
      dashDom.get('jogo-api-url')?.value.trim() ||
      localStorage.getItem(JOGOS_API_URL_KEY) ||
      ''
  ).trim();
  const filtroTime = String(
    forcedFiltroTime ||
      dashDom.get('jogo-api-time')?.value ||
      localStorage.getItem(JOGOS_API_FILTRO_KEY) ||
      ''
  )
    .trim()
    .toLowerCase();

  if (!apiUrl) {
    if (!silent) {
      notify(MSG.jogos.missingApiUrl, SEVERITY.WARNING);
      focusField('jogo-api-url', { markError: true });
    }
    return;
  }

  localStorage.setItem(JOGOS_API_URL_KEY, apiUrl);
  localStorage.setItem(JOGOS_API_FILTRO_KEY, filtroTime);

  const syncPromise = (async () => {
    let payload;
    const payloadResult = await SB.toResult(() => SB.fetchJsonWithRetry(apiUrl));
    if (!payloadResult.ok) {
      if (!silent) notify(MSG.jogos.fetchFailed(payloadResult.error?.message), SEVERITY.ERROR);
      return;
    }
    payload = payloadResult.data;

    const lista = extrairListaJogos(payload);
    if (!lista.length) {
      if (!silent) notify(MSG.jogos.emptyPayload, SEVERITY.WARNING);
      return;
    }

    const normalizados = lista
      .map(normalizeJogoExterno)
      .filter(Boolean)
      .filter((j) => {
        if (!filtroTime) return true;
        return [j.titulo, j.mandante, j.visitante, j.campeonato]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(filtroTime);
      });

    if (!normalizados.length) {
      if (!silent) notify(MSG.jogos.noEligible, SEVERITY.INFO);
      return;
    }

    let _criados = 0;
    let erros = 0;
    const cache = getJogosCache(filialId);
    const byId = {};
    cache.forEach((j) => {
      if (!isJogoExpirado(j)) byId[j.id] = j;
    });

    for (const j of normalizados) {
      const id = j.extId ? `ext-${j.extId}` : stableJogoId(j);
      const item = {
        id,
        filial_id: filialId,
        titulo: j.titulo,
        campeonato: j.campeonato,
        data_hora: j.data_hora,
        mandante: j.mandante,
        visitante: j.visitante,
        local: j.local,
        status: j.status
      };

      const saveResult = await SB.toResult(() => SB.upsertJogoAgenda(item));
      if (saveResult.ok) {
        byId[id] = item;
        _criados++;
      } else {
        erros++;
        byId[id] = item;
        console.error('Falha ao upsert jogo externo', item, saveResult.error);
      }
    }

    D.jogos[filialId] = sortJogosAgenda(Object.values(byId));
    await purgeExpiredJogos(filialId, { persist: true, silent: true });
    setJogosAutoSyncAt(filialId);

    if (!auto) fecharModal('modal-jogo-sync');
    renderDashJogos(dashDom.get('dash-fil')?.value || 'todas');
    if (!silent) {
      notify(
        MSG.jogos.syncResult({ processados: normalizados.length, falhas: erros }),
        erros > 0 ? SEVERITY.WARNING : SEVERITY.SUCCESS
      );
    }
  })();

  jogosSyncPromises.set(filialId, syncPromise);
  try {
    await syncPromise;
  } finally {
    jogosSyncPromises.delete(filialId);
  }
}

async function ensureJogosAutoSync(fid) {
  if (!fid || !shouldAutoSyncJogos(fid)) return;
  await sincronizarJogosDashboard({ silent: true, auto: true });
}

export async function salvarJogoDashboard() {
  const filialId = getFilialCalendarioId();
  if (!filialId) {
    notify(MSG.jogos.missingFilial, SEVERITY.ERROR);
    return;
  }

  const titulo = dashDom.get('jogo-titulo')?.value.trim() || '';
  const campeonato = dashDom.get('jogo-campeonato')?.value.trim() || '';
  const data_hora = dashDom.get('jogo-data')?.value || '';
  const mandante = dashDom.get('jogo-mandante')?.value.trim() || '';
  const visitante = dashDom.get('jogo-visitante')?.value.trim() || '';
  const local = dashDom.get('jogo-local')?.value.trim() || '';

  if (!titulo || !data_hora) {
    notify(MSG.jogos.invalidForm, SEVERITY.WARNING);
    if (!titulo) focusField('jogo-titulo', { markError: true });
    else focusField('jogo-data', { markError: true });
    return;
  }

  const item = {
    id: uid(),
    filial_id: filialId,
    titulo,
    campeonato: campeonato || null,
    data_hora,
    mandante: mandante || null,
    visitante: visitante || null,
    local: local || null,
    status: 'agendado'
  };

  const saveResult = await SB.toResult(() => SB.upsertJogoAgenda(item));
  if (!saveResult.ok) {
    console.error('Erro ao salvar jogo na API', saveResult.error);
    notify('Erro: jogo nao foi salvo no banco. Acao: tente novamente.', SEVERITY.ERROR);
    return;
  }

  const jogos = getJogosCache(filialId);
  jogos.unshift(item);
  D.jogos[filialId] = sortJogosAgenda(jogos);

  fecharModal('modal-jogo');
  renderDashJogos(dashDom.get('dash-fil')?.value || 'todas');

  notify('Sucesso: jogo adicionado na agenda.', SEVERITY.SUCCESS);
}

export async function removerJogoDashboard(id) {
  const filialId = getFilialCalendarioId();
  if (!filialId) return;
  if (!confirm('Remover este jogo da agenda?')) return;

  const deleteResult = await SB.toResult(() => SB.deleteJogoAgenda(id));
  if (!deleteResult.ok) {
    console.error('Erro ao remover jogo da API', deleteResult.error);
    notify('Erro: nao foi possivel remover no banco. Acao: tente novamente.', SEVERITY.ERROR);
    return;
  }

  D.jogos[filialId] = getJogosCache(filialId).filter((j) => j.id !== id);
  renderDashJogos(dashDom.get('dash-fil')?.value || 'todas');
  notify('Sucesso: jogo removido da agenda.', SEVERITY.SUCCESS);
}

export function renderDashJogos(fsel = 'todas') {
  const el = dashDom.get('dash-jogos');
  if (!el) return;

  const filialId = getFilialCalendarioId();
  if (!filialId) {
    dashDom.html(
      'games',
      'dash-jogos',
      `<div class="empty dash-empty-compact"><p>Sem filial para agenda.</p></div>`,
      'dashboard:jogos-sem-filial'
    );
    return;
  }

  if (fsel !== 'todas' && fsel !== filialId) {
    const nome = (D.filiais || []).find((f) => f.id === filialId)?.nome || 'Filial 1';
    dashDom.html(
      'games',
      'dash-jogos',
      `<div class="empty dash-empty-compact"><p>Agenda disponivel em ${nome}.</p></div>`,
      'dashboard:jogos-outra-filial'
    );
    return;
  }

  purgeExpiredJogos(filialId, { persist: true, silent: true }).catch((e) => {
    console.error('Erro ao limpar jogos expirados da agenda', e);
  });
  ensureJogosAutoSync(filialId).catch((e) => {
    console.error('Erro na sincronização automática de jogos', e);
  });

  const agoraMs = Date.now();

  const jogos = getJogosCache(filialId)
    .filter((j) => {
      const ts = getJogoDateMs(j);
      return ts != null && !isJogoExpirado(j, agoraMs);
    })
    .sort((a, b) => new Date(a.data_hora || 0).getTime() - new Date(b.data_hora || 0).getTime())
    .slice(0, 8);

  if (!jogos.length) {
    dashDom.html(
      'games',
      'dash-jogos',
      `<div class="empty dash-empty-compact"><p>Sem jogos cadastrados.</p></div>`,
      'dashboard:jogos-vazio'
    );
    return;
  }

  dashDom.html(
    'games',
    'dash-jogos',
    jogos
      .map(
        (j) => `
    <div class="rrow dash-game-row">
      <span class="dash-dot dash-dot--info"></span>
      <div class="dash-row-main">
        <div class="dash-row-title">${j.titulo}</div>
        <div class="dash-row-sub">${fmtDataHora(j.data_hora)}${j.campeonato ? ' - ' + j.campeonato : ''}</div>
      </div>
      <div class="dash-game-actions">
        <button class="btn btn-sm" title="Excluir jogo" data-click="removerJogoDashboard('${j.id}')">Excluir</button>
      </div>
    </div>
  `
      )
      .join(''),
    'dashboard:jogos-lista'
  );
}

// ── Personalizar Layout ──────────────────────────────────────────────────────

const DASH_LAYOUT_KEY = 'sc_dash_layout_v1';

/** @returns {Record<string, string[]>} */
function getDashSavedLayout() {
  try {
    return JSON.parse(localStorage.getItem(DASH_LAYOUT_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveDashCurrentLayout() {
  /** @type {Record<string, string[]>} */
  const layout = {};
  document.querySelectorAll('[data-dash-zone]').forEach((zone) => {
    if (!(zone instanceof HTMLElement)) return;
    const id = zone.dataset.dashZone || '';
    layout[id] = Array.from(zone.children)
      .filter((el) => el instanceof HTMLElement && el.dataset.dashSlot)
      .map((el) => /** @type {HTMLElement} */ (el).dataset.dashSlot || '');
  });
  localStorage.setItem(DASH_LAYOUT_KEY, JSON.stringify(layout));
}

export function applyDashSavedLayout() {
  const layout = getDashSavedLayout();
  Object.entries(layout).forEach(([zoneId, order]) => {
    const zone = document.querySelector(`[data-dash-zone="${zoneId}"]`);
    if (!zone) return;
    /** @type {Record<string, Element>} */
    const slotMap = {};
    // só filhos diretos para evitar capturar slots de sub-zonas
    Array.from(zone.children).forEach((el) => {
      if (el instanceof HTMLElement && el.dataset.dashSlot) slotMap[el.dataset.dashSlot] = el;
    });
    order.forEach((slotId) => {
      const el = slotMap[slotId];
      if (el) zone.appendChild(el);
    });
  });
}

/** @type {HTMLElement|null} */
let _dragSrc = null;
let _dashEditMode = false;

/** @param {DragEvent} e */
function onDragStart(e) {
  _dragSrc = /** @type {HTMLElement} */ (e.currentTarget);
  _dragSrc.classList.add('dash-dragging');
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _dragSrc.dataset.dashSlot || '');
  }
}

/** @param {DragEvent} _e */
function onDragEnd(_e) {
  _dragSrc?.classList.remove('dash-dragging');
  document
    .querySelectorAll('.dash-drag-over')
    .forEach((el) => el.classList.remove('dash-drag-over'));
  _dragSrc = null;
}

/** @param {DragEvent} e */
function onDragOver(e) {
  e.preventDefault();
  const target = /** @type {HTMLElement} */ (e.currentTarget);
  if (!_dragSrc || target === _dragSrc) return;
  if (_dragSrc.parentElement !== target.parentElement) return;
  target.classList.add('dash-drag-over');
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

/** @param {DragEvent} e */
function onDragLeave(e) {
  /** @type {HTMLElement} */ (e.currentTarget).classList.remove('dash-drag-over');
}

/** @param {DragEvent} e */
function onDrop(e) {
  e.preventDefault();
  const target = /** @type {HTMLElement} */ (e.currentTarget);
  target.classList.remove('dash-drag-over');
  if (!_dragSrc || target === _dragSrc) return;
  if (_dragSrc.parentElement !== target.parentElement) return;
  const parent = target.parentElement;
  if (!parent) return;
  const children = Array.from(parent.children);
  const srcIdx = children.indexOf(_dragSrc);
  const tgtIdx = children.indexOf(target);
  parent.insertBefore(_dragSrc, srcIdx < tgtIdx ? target.nextSibling : target);
}

function initDashDrag() {
  document.querySelectorAll('[data-dash-slot]').forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend', onDragEnd);
    card.addEventListener('dragover', onDragOver);
    card.addEventListener('dragleave', onDragLeave);
    card.addEventListener('drop', onDrop);
  });
}

function destroyDashDrag() {
  document.querySelectorAll('[data-dash-slot]').forEach((card) => {
    card.removeAttribute('draggable');
    card.removeEventListener('dragstart', onDragStart);
    card.removeEventListener('dragend', onDragEnd);
    card.removeEventListener('dragover', onDragOver);
    card.removeEventListener('dragleave', onDragLeave);
    card.removeEventListener('drop', onDrop);
  });
}

export function togglePersonalizarDash() {
  _dashEditMode = !_dashEditMode;
  const pg = document.getElementById('pg-dashboard');
  const btn = document.getElementById('dash-personalizar-btn');
  if (!pg || !btn) return;
  if (_dashEditMode) {
    pg.classList.add('dash-edit-mode');
    btn.textContent = '✓ Salvar layout';
    btn.classList.add('btn-p');
    initDashDrag();
  } else {
    pg.classList.remove('dash-edit-mode');
    btn.textContent = 'Personalizar';
    btn.classList.remove('btn-p');
    saveDashCurrentLayout();
    destroyDashDrag();
  }
}
