import { D, State, P, C } from '../app/store.js';
import { fmtQ, toast } from '../shared/utils.js';

const NOTI_HISTORY_KEY = 'sc_noti_hist_v1';
const NOTI_PRIORITY_ORDER = { critico: 0, atencao: 1, oportunidade: 2 };

let calcSaldosSafe = () => ({});
let irSafe = () => {};
let renderMetasNegocioSafe = () => {};
let registerNotificationKpiSafe = () => {};
let logStrategicActionSafe = () => {};

let notiFiltroPrioridade = 'todas';
let notiCache = [];

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

function setNotiHistory(list){
  const map = getNotiHistoryMap();
  map[State.FIL] = list;
  localStorage.setItem(NOTI_HISTORY_KEY, JSON.stringify(map));
}

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

function daysDiff(base, target){
  const ms = target.getTime() - base.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function compareNotifications(a, b){
  const pa = NOTI_PRIORITY_ORDER[a.prioridade] ?? 99;
  const pb = NOTI_PRIORITY_ORDER[b.prioridade] ?? 99;
  if(pa !== pb) return pa - pb;
  return String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR');
}

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

function buildCampanhaNotifications(){
  const envios = D.campanhaEnvios?.[State.FIL] || [];
  const pendentes = envios.filter(e => e.status === 'pendente' || e.status === 'manual');
  if(!pendentes.length) return [];
  return [{
    id: `campanhas-pendentes-${pendentes.length}`,
    prioridade: 'atencao',
    origem: 'campanhas',
    titulo: `Fila de campanhas com ${pendentes.length} envio(s) pendente(s)`,
    descricao: 'Existe fila manual ou pendente aguardando acao.',
    meta: 'Campanhas',
    acaoLabel: 'Abrir campanhas',
    acao: () => irSafe('campanhas')
  }];
}

function buildAniversarioNotifications(now){
  return C().flatMap(c => {
    const prox = getProxAniversario(c.data_aniversario);
    if(!prox) return [];
    const diff = daysDiff(now, prox);
    if(diff < 0 || diff > 7) return [];
    const canais = [c.whatsapp, c.tel, c.email].filter(Boolean);
    if(!c.optin_marketing || !canais.length) return [];
    return [{
      id: `aniversario-${c.id}-${prox.toISOString().slice(0,10)}`,
      prioridade: 'oportunidade',
      origem: 'clientes',
      titulo: `${c.nome} faz aniversario em ${diff} dia(s)`,
      descricao: `Cliente apto para campanha. Canais disponiveis: ${canais.length}.`,
      meta: 'Clientes / Campanhas',
      acaoLabel: 'Abrir campanhas',
      acao: () => irSafe('campanhas')
    }];
  });
}

function buildJogosNotifications(now){
  const jogos = (D.jogos?.[State.FIL] || [])
    .filter(j => !!j.data_hora)
    .map(j => ({ ...j, dt: new Date(j.data_hora) }))
    .filter(j => !Number.isNaN(j.dt.getTime()))
    .sort((a, b) => a.dt - b.dt)
    .slice(0, 6);

  return jogos.flatMap(j => {
    const d = new Date(j.dt);
    d.setHours(0, 0, 0, 0);
    const diff = daysDiff(now, d);
    if(diff < 0 || diff > 7) return [];
    return [{
      id: `jogo-${j.id || j.titulo}-${j.dt.toISOString()}`,
      prioridade: 'oportunidade',
      origem: 'agenda',
      titulo: `Jogo proximo: ${j.titulo || `${j.mandante || ''} x ${j.visitante || ''}`}`,
      descricao: `Em ${diff} dia(s). Bom momento para campanha por time.`,
      meta: 'Agenda / Oportunidades',
      acaoLabel: 'Abrir dashboard',
      acao: () => irSafe('dashboard')
    }];
  });
}

export function buildNotificacoes(){
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

  return Array.from(deduped.values()).sort(compareNotifications);
}

export function getNotificacoesResumo(){
  const all = buildNotificacoes();
  return all.reduce((acc, n) => {
    const p = String(n.prioridade || '').toLowerCase();
    if(p === 'critico') acc.critico += 1;
    else if(p === 'atencao') acc.atencao += 1;
    else if(p === 'oportunidade') acc.oportunidade += 1;
    acc.total += 1;
    return acc;
  }, { critico: 0, atencao: 0, oportunidade: 0, total: 0 });
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

export function setFiltroNotificacoes(filtro){
  notiFiltroPrioridade = filtro || 'todas';
  renderNotificacoes();
}

export function executarNotificacao(id){
  const n = notiCache.find(x => x.id === id);
  if(!n) return;
  registerNotificationKpiSafe('executadas', 1);
  if(n.prioridade === 'oportunidade') logStrategicActionSafe('oportunidades');
  if(typeof n.acao === 'function') n.acao();
  renderMetasNegocioSafe();
}

export function resolverNotificacao(id){
  const n = notiCache.find(x => x.id === id);
  if(!n) return;
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
  toast('Notificacao movida para historico.');
}

export function reabrirNotificacao(id){
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
  renderNotificacoes();
  updateNotiBadge();
  toast('Todas notificacoes ativas foram resolvidas.');
}

function badgeClassForPriority(prioridade){
  if(prioridade === 'critico') return 'br';
  if(prioridade === 'atencao') return 'ba';
  return 'bb';
}

function renderNotiMetric(label, value, style = ''){
  return `<div class="met"><div class="ml">${label}</div><div class="mv"${style ? ` style="${style}"` : ''}>${value}</div></div>`;
}

export function renderNotificacoes(){
  const met = document.getElementById('noti-met');
  const lista = document.getElementById('noti-lista');
  const histEl = document.getElementById('noti-historico');
  const fil = document.getElementById('noti-fil-prioridade');
  if(!met || !lista || !histEl) return;
  if(fil) fil.value = notiFiltroPrioridade;

  const all = buildNotificacoes();
  const hist = getNotiHistory();
  const histIds = new Set(hist.map(x => x.id));
  const ativosAll = all.filter(n => !histIds.has(n.id));
  const ativos = notiFiltroPrioridade === 'todas'
    ? ativosAll
    : ativosAll.filter(n => n.prioridade === notiFiltroPrioridade);
  const resumo = getNotificacoesResumo();

  met.innerHTML = [
    renderNotiMetric('Ativas', ativosAll.length),
    renderNotiMetric('Critico', resumo.critico, 'color:var(--color-critical-600)'),
    renderNotiMetric('Atencao', resumo.atencao, 'color:var(--color-warning-600)'),
    renderNotiMetric('Oportunidade', resumo.oportunidade, 'color:var(--color-opportunity-600)'),
    renderNotiMetric('Resolvidas', hist.length)
  ].join('');

  notiCache = ativos;
  if(!ativos.length){
    lista.innerHTML = `<div class="empty"><div class="ico">Inbox</div><p>Nenhuma notificacao ativa para o filtro selecionado.</p></div>`;
  }else{
    lista.innerHTML = ativos.map(n => `
      <div class="noti-item ${n.prioridade}">
        <div class="noti-head">
          <div>
            <div class="noti-title">${n.titulo}</div>
            <div class="noti-desc">${n.descricao}</div>
            <div class="noti-meta">${n.meta} - ${n.prioridade}</div>
          </div>
          <span class="bdg ${badgeClassForPriority(n.prioridade)}">${n.prioridade}</span>
        </div>
        <div class="noti-actions">
          <button class="btn btn-sm" data-click="executarNotificacao('${n.id}')">${n.acaoLabel || 'Abrir'}</button>
          <button class="btn btn-sm" data-click="resolverNotificacao('${n.id}')">Resolver</button>
        </div>
      </div>
    `).join('');
  }

  if(!hist.length){
    histEl.innerHTML = `<div class="empty"><div class="ico">Historico</div><p>Sem historico ainda.</p></div>`;
    return;
  }

  histEl.innerHTML = hist.slice(0, 30).map(h => `
    <div class="noti-item">
      <div class="noti-head">
        <div>
          <div class="noti-title">${h.titulo}</div>
          <div class="noti-meta">${h.meta || 'Sistema'} - resolvida em ${new Date(h.resolvido_em).toLocaleString('pt-BR')}</div>
        </div>
        <span class="bdg bk">${h.prioridade || 'resolvida'}</span>
      </div>
      <div class="noti-actions">
        <button class="btn btn-sm" data-click="reabrirNotificacao('${h.id}')">Reabrir</button>
      </div>
    </div>
  `).join('');
}


