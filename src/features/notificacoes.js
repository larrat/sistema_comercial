// @ts-check

import { D, State, P, C } from '../app/store.js';
import { fmtQ, toast } from '../shared/utils.js';
import { measureRender } from '../shared/render-metrics.js';
import { buildSkeletonLines } from './runtime-loading.js';

/** @typedef {import('../types/domain').NotificationItem} NotificationItem */
/** @typedef {import('../types/domain').NotificacoesModuleDeps} NotificacoesModuleDeps */

const NOTI_HISTORY_KEY = 'sc_noti_hist_v1';
const NOTI_PRIORITY_ORDER = { critico: 0, atencao: 1, oportunidade: 2 };
const NOTI_MAX_ITEMS_PER_ORIGEM = 2;
const NOTI_MAX_TOTAL_ITEMS = 12;
const NOTI_ORIGEM_ORDER = { campanhas: 0, estoque: 1, clientes: 2, agenda: 3, sistema: 4 };
const NOTI_ORIGEM_LABELS = {
  campanhas: 'Campanhas',
  estoque: 'Estoque',
  clientes: 'Clientes',
  agenda: 'Agenda e oportunidades',
  sistema: 'Sistema'
};

/** @type {NonNullable<NotificacoesModuleDeps['calcSaldos']>} */
let calcSaldosSafe = () => ({});
/** @type {NonNullable<NotificacoesModuleDeps['ir']>} */
let irSafe = () => {};
/** @type {NonNullable<NotificacoesModuleDeps['renderMetasNegocio']>} */
let renderMetasNegocioSafe = () => {};
/** @type {NonNullable<NotificacoesModuleDeps['registerNotificationKpi']>} */
let registerNotificationKpiSafe = () => {};
/** @type {NonNullable<NotificacoesModuleDeps['logStrategicAction']>} */
let logStrategicActionSafe = () => {};

let notiFiltroPrioridade = 'todas';
/** @type {NotificationItem[]} */
let notiCache = [];
let notiBuildCache = null;
let notiPendingResolve = new Set();

function isRuntimeBootstrapping(){
  return document.body.dataset.runtimeBootstrap === 'starting';
}

function getNotiBuildRefs(){
  const filialId = State.FIL || '';
  const produtos = P();
  const clientes = C();
  const envios = D.campanhaEnvios?.[filialId] || [];
  const jogos = D.jogos?.[filialId] || [];
  return {
    filialId,
    produtosRef: produtos,
    produtosLen: produtos.length,
    clientesRef: clientes,
    clientesLen: clientes.length,
    enviosRef: envios,
    enviosLen: envios.length,
    jogosRef: jogos,
    jogosLen: jogos.length
  };
}

/**
 * @param {NotificationItem[]} list
 */
function summarizeNotificacoes(list){
  return list.reduce((acc, n) => {
    const p = String(n.prioridade || '').toLowerCase();
    if(p === 'critico') acc.critico += 1;
    else if(p === 'atencao') acc.atencao += 1;
    else if(p === 'oportunidade') acc.oportunidade += 1;
    acc.total += 1;
    return acc;
  }, { critico: 0, atencao: 0, oportunidade: 0, total: 0 });
}

/**
 * @param {string | undefined | null} origem
 */
function getNotiOrigemLabel(origem){
  const key = String(origem || 'sistema').toLowerCase();
  return NOTI_ORIGEM_LABELS[key] || 'Sistema';
}

/**
 * @template T
 * @param {(T & { origem?: string | null })[]} list
 */
function groupNotificacoesByOrigem(list){
  /** @type {Map<string, (T & { origem?: string | null })[]>} */
  const groups = new Map();
  list.forEach(item => {
    const key = String(item.origem || 'sistema').toLowerCase();
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(item);
  });

  return Array.from(groups.entries())
    .sort((a, b) => {
      const pa = NOTI_ORIGEM_ORDER[a[0]] ?? 99;
      const pb = NOTI_ORIGEM_ORDER[b[0]] ?? 99;
      if(pa !== pb) return pa - pb;
      return getNotiOrigemLabel(a[0]).localeCompare(getNotiOrigemLabel(b[0]), 'pt-BR');
    })
    .map(([origem, items]) => ({ origem, label: getNotiOrigemLabel(origem), items }));
}

/**
 * @param {NotificacoesModuleDeps} [deps]
 */
export function initNotificacoesModule(deps = {}){
  calcSaldosSafe = typeof deps.calcSaldos === 'function' ? deps.calcSaldos : calcSaldosSafe;
  irSafe = typeof deps.ir === 'function' ? deps.ir : irSafe;
  renderMetasNegocioSafe = typeof deps.renderMetasNegocio === 'function' ? deps.renderMetasNegocio : renderMetasNegocioSafe;
  registerNotificationKpiSafe = typeof deps.registerNotificationKpi === 'function' ? deps.registerNotificationKpi : registerNotificationKpiSafe;
  logStrategicActionSafe = typeof deps.logStrategicAction === 'function' ? deps.logStrategicAction : logStrategicActionSafe;
}

function getNotiHistoryMap(){
  try{
    return JSON.parse(localStorage.getItem(NOTI_HISTORY_KEY) || '{}') || {};
  }catch{
    return {};
  }
}

function getNotiHistory(){
  const map = getNotiHistoryMap();
  return Array.isArray(map[State.FIL]) ? map[State.FIL] : [];
}

/**
 * @param {NotificationItem[]} list
 */
function setNotiHistory(list){
  const map = getNotiHistoryMap();
  map[State.FIL] = list;
  localStorage.setItem(NOTI_HISTORY_KEY, JSON.stringify(map));
}

/**
 * @param {string | undefined | null} iso
 */
function getProxAniversario(iso){
  if(!iso) return null;
  const parts = String(iso).split('-');
  if(parts.length !== 3) return null;
  const [, m, d] = parts.map(Number);
  if(!m || !d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const prox = new Date(now.getFullYear(), m - 1, d);
  prox.setHours(0, 0, 0, 0);
  if(prox < now) prox.setFullYear(now.getFullYear() + 1);
  return prox;
}

/**
 * @param {Date} base
 * @param {Date} target
 */
function daysDiff(base, target){
  const ms = target.getTime() - base.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * @param {NotificationItem} a
 * @param {NotificationItem} b
 */
function compareNotifications(a, b){
  const pa = NOTI_PRIORITY_ORDER[a.prioridade] ?? 99;
  const pb = NOTI_PRIORITY_ORDER[b.prioridade] ?? 99;
  if(pa !== pb) return pa - pb;
  return String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR');
}

/**
 * @param {Date} now
 * @param {Record<string, { saldo?: number; cm?: number }>} saldos
 * @returns {NotificationItem[]}
 */
function buildEstoqueNotifications(now, saldos){
  return P().flatMap(p => {
    const s = saldos[p.id] || { saldo: 0 };
    const saldo = Number(s.saldo || 0);
    const min = Number(p.emin || 0);
    if(saldo <= 0){
      return [{
        id: `estoque-zero-${p.id}-${saldo}`,
        prioridade: 'critico',
        origem: 'estoque',
        titulo: `Estoque zerado: ${p.nome}`,
        descricao: `Saldo atual: ${fmtQ(saldo)} ${p.un || ''}.`,
        meta: 'Estoque',
        acaoLabel: 'Abrir estoque',
        acao: () => irSafe('estoque')
      }];
    }
    if(min > 0 && saldo < min){
      return [{
        id: `estoque-baixo-${p.id}-${saldo}-${min}`,
        prioridade: 'atencao',
        origem: 'estoque',
        titulo: `Estoque baixo: ${p.nome}`,
        descricao: `Saldo ${fmtQ(saldo)} ${p.un || ''} abaixo do minimo (${fmtQ(min)}).`,
        meta: 'Estoque',
        acaoLabel: 'Abrir estoque',
        acao: () => irSafe('estoque')
      }];
    }
    return [];
  });
}

/**
 * @returns {NotificationItem[]}
 */
function buildCampanhaNotifications(){
  const envios = D.campanhaEnvios?.[State.FIL] || [];
  const pendentes = envios.filter(e => e.status === 'pendente' || e.status === 'manual');
  const falhas = envios.filter(e => e.status === 'falhou');
  const nowMs = Date.now();
  const oldestPending = pendentes
    .map(e => new Date(e.criado_em || e.data_ref || 0))
    .filter(d => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;
  const pendenteDias = oldestPending ? Math.floor((nowMs - oldestPending.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  /** @type {NotificationItem[]} */
  const cards = [];

  if(falhas.length){
    cards.push({
      id: `campanhas-falhas-${falhas.length}`,
      prioridade: falhas.length >= 5 ? 'critico' : 'atencao',
      origem: 'campanhas',
      titulo: `Falha em ${falhas.length} envio(s) de campanha`,
      descricao: 'Falhas exigem revisão manual para evitar perda de contato com clientes.',
      meta: 'Campanhas',
      acaoLabel: 'Revisar fila',
      acao: () => irSafe('campanhas')
    });
  }

  if(!pendentes.length) return cards;

  cards.push({
    id: `campanhas-pendentes-${pendentes.length}-${pendenteDias}`,
    prioridade: pendenteDias >= 2 || pendentes.length >= 10 ? 'atencao' : 'oportunidade',
    origem: 'campanhas',
    titulo: `Fila com ${pendentes.length} envio(s) aguardando ação`,
    descricao: pendenteDias >= 1
      ? `Há pendências paradas há ${pendenteDias} dia(s).`
      : 'Existe fila manual ou pendente aguardando envio.',
    meta: 'Campanhas',
    acaoLabel: 'Abrir campanhas',
    acao: () => irSafe('campanhas')
  });

  return cards;
}

/**
 * @param {Date} now
 * @returns {NotificationItem[]}
 */
function buildAniversarioNotifications(now){
  const mensagens = { 0: 'hoje', 1: 'amanhã', 7: 'em 1 semana' };
  return C().flatMap(c => {
    const prox = getProxAniversario(c.data_aniversario);
    if(!prox) return [];
    const diff = daysDiff(now, prox);
    if(diff < 0 || diff > 7) return [];
    const canais = [c.whatsapp, c.tel, c.email].filter(Boolean);
    if(!c.optin_marketing || !canais.length) return [];
    const quando = mensagens[diff] || `em ${diff} dia(s)`;
    return [{
      id: `aniversario-${c.id}-${prox.toISOString().slice(0,10)}`,
      prioridade: diff <= 2 ? 'atencao' : 'oportunidade',
      origem: 'clientes',
      titulo: `${c.nome} faz aniversário ${quando}`,
      descricao: `Cliente apto para campanha. Canais disponiveis: ${canais.length}.`,
      meta: 'Clientes / Campanhas',
      acaoLabel: 'Abrir campanhas',
      acao: () => irSafe('campanhas')
    }];
  });
}

/**
 * @param {Date} now
 * @returns {NotificationItem[]}
 */
function buildJogosNotifications(now){
  /** @type {Record<string, number>} */
  const torcidaPorTime = {};
  C().forEach(c => {
    if(!c.optin_marketing) return;
    String(c.time || '')
      .split(/[,;\n]+/)
      .map(x => String(x || '').trim().toLowerCase())
      .filter(Boolean)
      .forEach(time => {
        torcidaPorTime[time] = (torcidaPorTime[time] || 0) + 1;
      });
  });

  const jogos = (D.jogos?.[State.FIL] || [])
    .filter(j => !!j.data_hora)
    .map(j => ({ ...j, dt: new Date(j.data_hora) }))
    .filter(j => !Number.isNaN(j.dt.getTime()))
    .sort((a, b) => a.dt.getTime() - b.dt.getTime())
    .slice(0, 6);

  return jogos.flatMap(j => {
    const d = new Date(j.dt);
    d.setHours(0, 0, 0, 0);
    const diff = daysDiff(now, d);
    if(diff < 0 || diff > 7) return [];
    const mandante = String(j.mandante || '').trim().toLowerCase();
    const visitante = String(j.visitante || '').trim().toLowerCase();
    const publico = (torcidaPorTime[mandante] || 0) + (torcidaPorTime[visitante] || 0);
    if(publico < 2) return [];
    return [{
      id: `jogo-${j.id || j.titulo}-${j.dt.toISOString()}`,
      prioridade: diff <= 1 ? 'atencao' : 'oportunidade',
      origem: 'agenda',
      titulo: `Jogo proximo: ${j.titulo || `${j.mandante || ''} x ${j.visitante || ''}`}`,
      descricao: `Em ${diff} dia(s). Base potencial: ${publico} cliente(s) com afinidade pelos times.`,
      meta: 'Agenda / Oportunidades',
      acaoLabel: 'Abrir dashboard',
      acao: () => irSafe('dashboard')
    }];
  });
}

/**
 * @returns {NotificationItem[]}
 */
export function buildNotificacoes(){
  const refs = getNotiBuildRefs();
  if(
    notiBuildCache &&
    notiBuildCache.filialId === refs.filialId &&
    notiBuildCache.produtosRef === refs.produtosRef &&
    notiBuildCache.produtosLen === refs.produtosLen &&
    notiBuildCache.clientesRef === refs.clientesRef &&
    notiBuildCache.clientesLen === refs.clientesLen &&
    notiBuildCache.enviosRef === refs.enviosRef &&
    notiBuildCache.enviosLen === refs.enviosLen &&
    notiBuildCache.jogosRef === refs.jogosRef &&
    notiBuildCache.jogosLen === refs.jogosLen
  ) return notiBuildCache.result;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const saldos = calcSaldosSafe();

  const all = [
    ...buildEstoqueNotifications(now, saldos),
    ...buildCampanhaNotifications(),
    ...buildAniversarioNotifications(now),
    ...buildJogosNotifications(now)
  ];

  const deduped = new Map();
  all.forEach(n => {
    if(!deduped.has(n.id)) deduped.set(n.id, n);
  });

  const porOrigem = {};
  const limited = Array.from(deduped.values())
    .sort(compareNotifications)
    .filter(n => {
      const key = String(n.origem || 'sistema');
      porOrigem[key] = (porOrigem[key] || 0) + 1;
      return porOrigem[key] <= NOTI_MAX_ITEMS_PER_ORIGEM;
    })
    .slice(0, NOTI_MAX_TOTAL_ITEMS);

  notiBuildCache = {
    ...refs,
    result: limited
  };

  return limited;
}

export function getNotificacoesResumo(){
  const all = buildNotificacoes();
  return summarizeNotificacoes(all);
}

export function updateNotiBadge(){
  const badge = document.getElementById('noti-badge');
  if(!badge) return;
  const histIds = new Set(getNotiHistory().map(x => x.id));
  const total = buildNotificacoes().filter(n => !histIds.has(n.id)).length;
  if(total > 0){
    badge.style.display = 'inline-flex';
    badge.textContent = total > 99 ? '99+' : String(total);
  }else{
    badge.style.display = 'none';
  }
}

/**
 * @param {string} filtro
 */
export function setFiltroNotificacoes(filtro){
  notiFiltroPrioridade = filtro || 'todas';
  renderNotificacoes();
}

/**
 * @param {string} id
 */
export function executarNotificacao(id){
  const n = notiCache.find(x => x.id === id);
  if(!n) return;
  registerNotificationKpiSafe('executadas', 1);
  if(n.prioridade === 'oportunidade') logStrategicActionSafe('oportunidades');
  if(typeof n.acao === 'function') n.acao();
  renderMetasNegocioSafe();
}

/**
 * @param {string} id
 */
export function resolverNotificacao(id){
  const n = notiCache.find(x => x.id === id);
  if(!n) return;
  notiPendingResolve.add(id);
  renderNotificacoes();
  const hist = getNotiHistory();
  if(!hist.find(x => x.id === id)){
    hist.unshift({
      id: n.id,
      prioridade: n.prioridade,
      titulo: n.titulo,
      meta: n.meta,
      origem: n.origem,
      resolvido_em: new Date().toISOString()
    });
    registerNotificationKpiSafe('resolvidas', 1);
    setNotiHistory(hist.slice(0, 200));
  }
  renderNotificacoes();
  updateNotiBadge();
  toast('Notificação movida para histórico.');
}

/**
 * @param {string} id
 */
export function reabrirNotificacao(id){
  notiPendingResolve.delete(id);
  const hist = getNotiHistory().filter(x => x.id !== id);
  setNotiHistory(hist);
  registerNotificationKpiSafe('reabertas', 1);
  renderNotificacoes();
  updateNotiBadge();
  renderMetasNegocioSafe();
}

export function resolverTodasNotificacoes(){
  const ativos = [...notiCache];
  if(!ativos.length){
    toast('Inbox ja esta vazia.');
    return;
  }
  ativos.forEach(n => notiPendingResolve.add(n.id));
  renderNotificacoes();

  const hist = getNotiHistory();
  const ids = new Set(hist.map(x => x.id));
  const resolvedAt = new Date().toISOString();
  let resolvidasNow = 0;

  ativos.forEach(n => {
    if(ids.has(n.id)) return;
    hist.unshift({
      id: n.id,
      prioridade: n.prioridade,
      titulo: n.titulo,
      meta: n.meta,
      origem: n.origem,
      resolvido_em: resolvedAt
    });
    ids.add(n.id);
    resolvidasNow += 1;
  });

  setNotiHistory(hist.slice(0, 200));
  if(resolvidasNow > 0) registerNotificationKpiSafe('resolvidas', resolvidasNow);
  ativos.forEach(n => notiPendingResolve.delete(n.id));
  renderNotificacoes();
  updateNotiBadge();
  toast('Todas notificacoes ativas foram resolvidas.');
}

/**
 * @param {string} prioridade
 */
function badgeClassForPriority(prioridade){
  if(prioridade === 'critico') return 'br';
  if(prioridade === 'atencao') return 'ba';
  return 'bb';
}

/**
 * @param {string} label
 * @param {string | number} value
 * @param {string} [style]
 */
function renderNotiMetric(label, value, style = ''){
  return `<div class="met"><div class="ml">${label}</div><div class="mv"${style ? ` style="${style}"` : ''}>${value}</div></div>`;
}

/**
 * @param {NotificationItem[]} ativos
 * @param {{ critico: number, atencao: number, oportunidade: number, total: number }} resumo
 */
function renderNotiContextCard(ativos, resumo){
  const el = document.getElementById('noti-context');
  if(!el) return;
  const grupos = groupNotificacoesByOrigem(ativos);
  const origensResumo = grupos.map(g => g.label).join(' | ');

  if(!ativos.length){
    el.innerHTML = `
      <article class="context-card context-card--success">
        <div class="context-card__head">
          <span class="bdg bb">IA</span>
          <span class="context-card__kicker">Notificações</span>
        </div>
        <div class="context-card__title">Inbox zerada — tudo em ordem</div>
        <div class="context-card__copy">Nenhuma notificação ativa no momento. A central continua pronta para reunir sinais de campanhas, estoque, clientes e agenda quando algo exigir ação.</div>
      </article>`;
    return;
  }

  if(resumo.critico > 0){
    const origens = [...new Set(ativos.filter(n => n.prioridade === 'critico').map(n => getNotiOrigemLabel(n.origem)))].join(', ');
    el.innerHTML = `
      <article class="context-card context-card--danger">
        <div class="context-card__head">
          <span class="bdg br">Crítico</span>
          <span class="context-card__kicker">Notificações</span>
        </div>
        <div class="context-card__title">${resumo.critico} alerta${resumo.critico > 1 ? 's' : ''} crítico${resumo.critico > 1 ? 's' : ''} exigem ação imediata</div>
        <div class="context-card__copy">Situações críticas identificadas em: ${origens}. A central agora organiza os sinais por origem para evitar a sensação de dados misturados.</div>
        <div class="context-card__meta">${resumo.total} notificações ativas no total</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="setFiltroNotificacoes('critico')">Ver críticos</button>
        </div>
      </article>`;
    return;
  }

  if(resumo.atencao > 0){
    const origens = [...new Set(ativos.filter(n => n.prioridade === 'atencao').map(n => getNotiOrigemLabel(n.origem)))].join(', ');
    el.innerHTML = `
      <article class="context-card context-card--warning">
        <div class="context-card__head">
          <span class="bdg ba">Atenção</span>
          <span class="context-card__kicker">Notificações</span>
        </div>
        <div class="context-card__title">${resumo.atencao} item${resumo.atencao > 1 ? 'ns' : ''} pedindo atenção</div>
        <div class="context-card__copy">Pontos de atenção em: ${origens}. Endereçar agora evita escalada para crítico.</div>
        <div class="context-card__meta">${resumo.total} notificações ativas no total</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="setFiltroNotificacoes('atencao')">Ver atenções</button>
        </div>
      </article>`;
    return;
  }

  el.innerHTML = `
    <article class="context-card context-card--success">
      <div class="context-card__head">
        <span class="bdg bb">Oportunidade</span>
        <span class="context-card__kicker">Notificações</span>
      </div>
      <div class="context-card__title">${resumo.oportunidade} oportunidade${resumo.oportunidade > 1 ? 's' : ''} para aproveitar</div>
      <div class="context-card__copy">Nenhum alerta crítico ou de atenção. Confira oportunidades organizadas por origem: ${origensResumo}.</div>
      <div class="context-card__actions">
        <button class="btn btn-sm" data-click="setFiltroNotificacoes('oportunidade')">Ver oportunidades</button>
      </div>
    </article>`;
}

/**
 * @param {NotificationItem[]} ativos
 */
function renderNotificacoesAtivasAgrupadas(ativos){
  const grupos = groupNotificacoesByOrigem(ativos);
  return grupos.map(grupo => `
    <section class="noti-group">
      <div class="noti-group__head">
        <div>
          <div class="noti-group__title">${grupo.label}</div>
          <div class="noti-group__sub">${grupo.items.length} item(ns) nesta origem</div>
        </div>
        <span class="bdg bk">${grupo.label}</span>
      </div>
      <div class="noti-group__list">
        ${grupo.items.map(n => `
          <div class="noti-item ${n.prioridade}">
            <div class="noti-head">
              <div>
                <div class="noti-title">${n.titulo}</div>
                <div class="noti-desc">${n.descricao}</div>
                <div class="noti-meta">${n.meta} | ${getNotiOrigemLabel(n.origem)} | ${n.prioridade}</div>
              </div>
              <span class="bdg ${badgeClassForPriority(n.prioridade)}">${n.prioridade}</span>
            </div>
            <div class="noti-actions">
              <button class="btn btn-sm" data-click="executarNotificacao('${n.id}')">${n.acaoLabel || 'Abrir'}</button>
              <button class="btn btn-sm ${notiPendingResolve.has(n.id) ? 'is-loading' : ''}" ${notiPendingResolve.has(n.id) ? 'disabled' : ''} data-click="resolverNotificacao('${n.id}')">${notiPendingResolve.has(n.id) ? 'Resolvendo' : 'Resolver'}</button>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');
}

/**
 * @param {{ id: string, prioridade?: string, titulo?: string, meta?: string, origem?: string, resolvido_em: string }[]} historico
 */
function renderHistoricoAgrupado(historico){
  const grupos = groupNotificacoesByOrigem(historico);
  return grupos.map(grupo => `
    <section class="noti-group noti-group--history">
      <div class="noti-group__head">
        <div>
          <div class="noti-group__title">${grupo.label}</div>
          <div class="noti-group__sub">${grupo.items.length} item(ns) resolvido(s)</div>
        </div>
        <span class="bdg bk">Resolvido</span>
      </div>
      <div class="noti-group__list">
        ${grupo.items.map(h => `
          <div class="noti-item">
            <div class="noti-head">
              <div>
                <div class="noti-title">${h.titulo}</div>
                <div class="noti-meta">${h.meta || 'Sistema'} | ${getNotiOrigemLabel(h.origem)} | resolvida em ${new Date(h.resolvido_em).toLocaleString('pt-BR')}</div>
              </div>
              <span class="bdg bk">${h.prioridade || 'resolvida'}</span>
            </div>
            <div class="noti-actions">
              <button class="btn btn-sm" data-click="reabrirNotificacao('${h.id}')">Reabrir</button>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');
}

export function renderNotificacoes(){
  return measureRender('notificacoes', () => {
  const met = document.getElementById('noti-met');
  const lista = document.getElementById('noti-lista');
  const histEl = document.getElementById('noti-historico');
  const fil = document.getElementById('noti-fil-prioridade');
  const contextEl = document.getElementById('noti-context');
  if(!met || !lista || !histEl) return;
  if(fil) fil.value = notiFiltroPrioridade;

  const produtos = P();
  const clientes = C();
  const envios = D.campanhaEnvios?.[State.FIL] || [];
  if(isRuntimeBootstrapping() && !produtos.length && !clientes.length && !envios.length){
    if(contextEl) contextEl.innerHTML = `<div class="sk-card">${buildSkeletonLines(3)}</div>`;
    met.innerHTML = `
      <div class="sk-grid sk-grid-4">
        <div class="sk-card">${buildSkeletonLines(2)}</div>
        <div class="sk-card">${buildSkeletonLines(2)}</div>
        <div class="sk-card">${buildSkeletonLines(2)}</div>
        <div class="sk-card">${buildSkeletonLines(2)}</div>
      </div>
    `;
    lista.innerHTML = `<div class="sk-card">${buildSkeletonLines(5)}</div>`;
    histEl.innerHTML = `<div class="sk-card">${buildSkeletonLines(4)}</div>`;
    return;
  }

  const all = buildNotificacoes();
  const hist = getNotiHistory();
  const histIds = new Set(hist.map(x => x.id));
  const ativosAll = all.filter(n => !histIds.has(n.id));
  const ativos = notiFiltroPrioridade === 'todas'
    ? ativosAll
    : ativosAll.filter(n => n.prioridade === notiFiltroPrioridade);
  const resumo = summarizeNotificacoes(all);

  renderNotiContextCard(ativosAll, resumo);

  met.innerHTML = [
    renderNotiMetric('Ativas', ativosAll.length),
    renderNotiMetric('Critico', resumo.critico, 'color:var(--color-critical-600)'),
    renderNotiMetric('Atencao', resumo.atencao, 'color:var(--color-warning-600)'),
    renderNotiMetric('Oportunidade', resumo.oportunidade, 'color:var(--color-opportunity-600)'),
    renderNotiMetric('Resolvidas', hist.length)
  ].join('');

  notiCache = ativos;
  if(!ativos.length){
    lista.innerHTML = `<div class="empty"><div class="ico">Inbox</div><p>Nenhuma notificação ativa para o filtro selecionado.</p></div>`;
  }else{
    lista.innerHTML = renderNotificacoesAtivasAgrupadas(ativos);
  }

  if(!hist.length){
    histEl.innerHTML = `<div class="empty"><div class="ico">Hist?rico</div><p>Sem hist?rico ainda.</p></div>`;
    return;
  }

  histEl.innerHTML = renderHistoricoAgrupado(hist.slice(0, 30));
  }, 'page');
}
