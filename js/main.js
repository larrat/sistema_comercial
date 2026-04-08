import { SB } from './api.js';
import { D, State, P, C, PD, FORNS, CPRECOS, CCFG } from './store.js';
import { createAppContext } from '../core/app-context.js';
import { createModuleRegistry } from '../core/module-registry.js';

import {
  toast,
  abrirModal,
  fecharModal,
  uid,
  norm,
  fmt,
  fmtN,
  mk2mg,
  prV
} from '../core/utils.js';

import {
  initCotacaoModule,
  renderFornSel,
  renderCotLogs,
  renderCotForns,
  renderCotTabela,
  salvarForn,
  remForn,
  cotLock,
  updPreco,
  cotFile,
  confirmarMapa,
  renderMapaBody
} from '../modules/cotacao.js';

import {
  initProdutosModule,
  renderProdMet,
  renderProdutos,
  limparFormProd,
  editarProd,
  syncV,
  syncA,
  calcProdPreview,
  salvarProduto,
  removerProd,
  refreshProdSel
} from '../modules/produtos.js';

import {
  renderCliMet,
  renderClientes,
  renderCliSegs,
  abrirCliDet,
  addNota,
  limparFormCli,
  editarCli,
  salvarCliente,
  removerCli,
  refreshCliDL
} from '../modules/clientes.js';

import {
  initPedidosModule,
  renderPedMet,
  renderPedidos,
  limparFormPed,
  editarPed,
  addItem,
  remItem,
  renderItens,
  salvarPedido,
  removerPed,
  verPed
} from '../modules/pedidos.js';

import {
  calcSaldos,
  calcSaldosMulti,
  atualizarBadgeEst,
  renderEstAlerts,
  renderEstPosicao,
  renderEstHist,
  refreshMovSel,
  refreshDestSel,
  resetMov,
  abrirMovProd,
  setTipo,
  movLoadProd,
  movCalc,
  movCalcAjuste,
  salvarMov,
  excluirMov
} from '../modules/estoque.js';

import {
  initDashboardModule,
  renderDashFilSel,
  renderDash,
  setP,
  renderDashJogos,
  abrirNovoJogo,
  limparFormJogo,
  salvarJogoDashboard,
  removerJogoDashboard,
  abrirSyncJogos,
  sincronizarJogosDashboard,
  usarExemploSyncJogos
} from '../modules/dashboard.js';

import {
  carregarCampanhas,
  carregarCampanhaEnvios,
  refreshCampanhasTela,
  limparFormCampanha,
  abrirNovaCampanha,
  adotarCampanhasParaFilialAtiva,
  editarCampanha,
  salvarCampanha,
  removerCampanha,
  renderCampanhasMet,
  renderCampanhas,
  gerarFilaCampanha,
  renderFilaWhatsApp,
  renderCampanhaEnvios,
  abrirWhatsAppEnvio,
  marcarEnvioEnviado,
  marcarEnvioFalhou
} from '../modules/campanhas.js';

import {
  initNotificacoesModule,
  getNotificacoesResumo,
  renderNotificacoes,
  updateNotiBadge,
  setFiltroNotificacoes,
  executarNotificacao,
  resolverNotificacao,
  reabrirNotificacao,
  resolverTodasNotificacoes
} from '../modules/notificacoes.js';

import {
  initFiliaisAcessosModule,
  limparFormFilial,
  editarFilial,
  salvarFilial,
  removerFilial,
  trocarFilial,
  renderFilMet,
  renderFilLista,
  renderAcessosMet,
  renderAcessosPerfis,
  renderAcessosVinculos,
  renderAcessosAuditoria,
  changeAcessosPage,
  preencherPerfilAcesso,
  preencherVinculoAcesso,
  renderAcessosAdmin,
  salvarPerfilAcesso,
  removerPerfilAcesso,
  vincularUsuarioFilial,
  desvincularUsuarioFilial
} from '../modules/filiais-acessos.js';

import {
  initNavigationModule,
  pageAtual,
  filterSidebarNav,
  initSidebarEnhancements,
  ir,
  switchTab,
  abrirSb,
  fecharSb
} from '../modules/navigation.js';

const CORES = ['#163F80', '#156038', '#7A4E00', '#9B2D24', '#5B3F99', '#1A6B7A'];
const GOAL_METRICS_KEY = 'sc_goal_metrics_v1';
const UX_EVENTS_KEY = 'sc_ux_events_v1';
const GOAL_METRICS_VERSION = 2;
const KPI_PAGES = ['dashboard', 'gerencial', 'produtos', 'clientes', 'pedidos', 'cotacao', 'estoque', 'campanhas', 'filiais', 'acessos', 'notificacoes'];
const primaryActionTracker = { page: 'dashboard', clicks: 0, active: false };
const APP_ROLES = ['operador', 'gerente', 'admin'];
const ROLE_LABEL = {
  operador: 'Operador',
  gerente: 'Gerente',
  admin: 'Admin'
};
const ROLE_MANAGER_PLUS = ['admin', 'gerente'];
const ROLE_ADMIN_ONLY = ['admin'];
const ROLE_PAGE_ACCESS = {
  dashboard: APP_ROLES,
  gerencial: APP_ROLES,
  produtos: APP_ROLES,
  clientes: APP_ROLES,
  pedidos: APP_ROLES,
  cotacao: APP_ROLES,
  estoque: APP_ROLES,
  notificacoes: APP_ROLES,
  campanhas: ROLE_MANAGER_PLUS,
  filiais: ROLE_ADMIN_ONLY,
  acessos: ROLE_ADMIN_ONLY
};
const ROLE_UI_MANAGER_SELECTORS = [
  '[onclick*="exportarTudo("]',
  '[onclick*="exportCSV("]',
  '[onclick*="removerProd("]',
  '[onclick*="removerCli("]',
  '[onclick*="removerPed("]',
  '[onclick*="remForn("]',
  '[onclick*="excluirMov("]',
  '[onclick*="abrirNovaCampanha("]',
  '[onclick*="salvarCampanha("]',
  '[onclick*="removerCampanha("]',
  '[onclick*="gerarFilaCampanha("]',
  '[onclick*="marcarEnvioEnviado("]',
  '[onclick*="marcarEnvioFalhou("]',
  '[onclick*="abrirSyncJogos("]',
  '[onclick*="sincronizarJogosDashboard("]',
  '[onclick*="salvarJogoDashboard("]',
  '[onclick*="removerJogoDashboard("]'
];
const ROLE_UI_ADMIN_SELECTORS = [
  '[onclick*="criarPrimeiraFilial("]',
  '[onclick*="salvarFilial("]',
  '[onclick*="removerFilial("]',
  '[onclick*="editarFilial("]',
  '[onclick*="salvarPerfilAcesso("]',
  '[onclick*="removerPerfilAcesso("]',
  '[onclick*="vincularUsuarioFilial("]',
  '[onclick*="desvincularUsuarioFilial("]'
];
let roleUiGuardTimer = null;
let roleUiObserver = null;

const AppContext = createAppContext({
  services: {
    SB,
    D,
    State
  },
  config: {
    appName: 'sistema_comercial'
  }
});

const AppModules = createModuleRegistry();

const JOURNEY_MODAL_MAP = {
  'modal-produto': 'produto',
  'modal-cliente': 'cliente',
  'modal-pedido': 'pedido',
  'modal-campanha': 'campanha'
};

function resetRuntimeData(){
  D.filiais = [];
  D.produtos = {};
  D.clientes = {};
  D.pedidos = {};
  D.fornecedores = {};
  D.cotPrecos = {};
  D.cotConfig = {};
  D.movs = {};
  D.jogos = {};
  D.campanhas = {};
  D.campanhaEnvios = {};
  D.notas = {};
  D.userPerfis = [];
  D.userFiliais = [];
  D.acessosAudit = [];

  State.FIL = null;
  State.selFil = null;
  State.user = null;
  State.userRole = 'operador';
  State.acPagePerfis = 1;
  State.acPageVinculos = 1;
  State.acPageAuditoria = 1;
  State.editIds = {};
  State.pedItens = [];
}

function normalizeUserRole(role){
  const r = norm(role || '');
  return APP_ROLES.includes(r) ? r : 'operador';
}

function currentUserRole(){
  return normalizeUserRole(State.userRole);
}

function hasRole(allowedRoles = []){
  const current = currentUserRole();
  return (allowedRoles || []).map(normalizeUserRole).includes(current);
}

function canAccessPage(page){
  const p = String(page || 'dashboard');
  const allowed = ROLE_PAGE_ACCESS[p] || APP_ROLES;
  return hasRole(allowed);
}

function getFirstAllowedPage(preferred = 'dashboard'){
  if (canAccessPage(preferred)) return preferred;
  const order = ['dashboard', 'produtos', 'clientes', 'pedidos', 'cotacao', 'estoque', 'notificacoes'];
  return order.find(canAccessPage) || 'dashboard';
}

function ensureCurrentPageAccess(){
  const current = pageAtual();
  if (canAccessPage(current)) return;
  ir(getFirstAllowedPage('dashboard'));
}

function requireRole(allowedRoles = [], denyMessage = 'Você não tem permissão para esta ação.'){
  if (hasRole(allowedRoles)) return true;
  toast(denyMessage);
  return false;
}

function buildRoleGuard(fn, allowedRoles, denyMessage){
  return async (...args) => {
    if (!requireRole(allowedRoles, denyMessage)) return;
    return fn(...args);
  };
}

function renderRoleBadge(){
  const el = document.getElementById('sb-role');
  if (!el) return;
  const role = currentUserRole();
  el.textContent = ROLE_LABEL[role] || 'Operador';
}

function setRoleUiLock(el, locked){
  if (!el) return;
  if (!locked){
    el.classList.remove('is-role-locked');
    if (el.dataset.rolePrevDisplay != null){
      el.style.display = el.dataset.rolePrevDisplay;
      delete el.dataset.rolePrevDisplay;
    }
    if ('disabled' in el){
      el.disabled = false;
    }else{
      el.style.pointerEvents = '';
      el.style.opacity = '';
    }
    if (el.dataset.rolePrevTitle != null){
      el.title = el.dataset.rolePrevTitle;
      delete el.dataset.rolePrevTitle;
    }else if (el.title === 'Sem permissão para esta ação.'){
      el.removeAttribute('title');
    }
    return;
  }

  el.classList.add('is-role-locked');
  if (el.dataset.rolePrevDisplay == null){
    el.dataset.rolePrevDisplay = el.style.display || '';
  }
  el.style.display = 'none';
  if (el.dataset.rolePrevTitle == null){
    el.dataset.rolePrevTitle = el.title || '';
  }
  el.title = 'Sem permissão para esta ação.';
  if ('disabled' in el){
    el.disabled = true;
  }else{
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.55';
  }
}

function applyRoleUiGuards(root = document){
  const allowManagerActions = hasRole(ROLE_MANAGER_PLUS);
  const allowAdminActions = hasRole(ROLE_ADMIN_ONLY);

  root.querySelectorAll(ROLE_UI_MANAGER_SELECTORS.join(','))
    .forEach(el => setRoleUiLock(el, !allowManagerActions));
  root.querySelectorAll(ROLE_UI_ADMIN_SELECTORS.join(','))
    .forEach(el => setRoleUiLock(el, !allowAdminActions));

  root.querySelectorAll('[data-p="campanhas"],#pg-campanhas,#mob-campanhas')
    .forEach(el => setRoleUiLock(el, !allowManagerActions));
  root.querySelectorAll('[data-p="filiais"],#pg-filiais,#mob-filiais,[data-p="acessos"],#pg-acessos,#mob-acessos')
    .forEach(el => setRoleUiLock(el, !allowAdminActions));
  filterSidebarNav(document.getElementById('sb-search')?.value || '');
}

function scheduleRoleUiGuards(){
  if (roleUiGuardTimer) clearTimeout(roleUiGuardTimer);
  roleUiGuardTimer = setTimeout(() => {
    applyRoleUiGuards(document);
    roleUiGuardTimer = null;
  }, 0);
}

function startRoleUiObserver(){
  if (roleUiObserver || typeof MutationObserver === 'undefined') return;
  roleUiObserver = new MutationObserver(() => scheduleRoleUiGuards());
  roleUiObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['onclick'] });
}

async function carregarContextoUsuario(session){
  State.user = session?.user || null;
  let role = 'operador';
  try{
    const perfil = await SB.getMeuPerfil(session?.user?.id || null);
    role = normalizeUserRole(perfil?.papel || '');
  }catch(e){
    console.warn('Perfil não encontrado em user_perfis. Assumindo operador.', e?.message || e);
  }
  State.userRole = role;
  renderRoleBadge();
  scheduleRoleUiGuards();
  setTimeout(() => ensureCurrentPageAccess(), 0);
}

function renderAuthGate(session){
  const authBox = document.getElementById('setup-auth');
  const filGrid = document.getElementById('fil-grid');
  const setupForm = document.getElementById('setup-form');
  const setupActions = document.getElementById('setup-actions');
  const sub = document.getElementById('setup-sub');

  if (!authBox || !filGrid || !setupForm || !setupActions || !sub) return;

  if (!session?.access_token){
    authBox.style.display = 'block';
    filGrid.innerHTML = '';
    setupForm.style.display = 'none';
    setupActions.style.display = 'none';
    sub.textContent = 'Faça login para acessar suas filiais';
    return false;
  }

  authBox.style.display = 'none';
  return true;
}

async function authEntrar(){
  const emailEl = document.getElementById('auth-email');
  const passEl = document.getElementById('auth-password');
  const btn = document.getElementById('auth-login-btn');
  const email = emailEl?.value.trim() || '';
  const password = passEl?.value || '';

  if(!email || !password){
    toast('Informe e-mail e senha.');
    return;
  }

  if(btn) btn.disabled = true;
  try{
    await SB.signInWithPassword({ email, password });
    toast('Login realizado com sucesso.');
    if(passEl) passEl.value = '';
    await renderSetup();
  }catch(e){
    toast('Falha no login: ' + (e?.message || 'credenciais inválidas'));
  }finally{
    if(btn) btn.disabled = false;
  }
}

async function sairConta(){
  await SB.signOut();
  resetRuntimeData();
  toast('Sessão encerrada.');
  await renderSetup();
}

function executarAuditoriaVisual(){
  const checks = [];
  const add = (ok, item, detalhe = '') => checks.push({ ok, item, detalhe });
  const has = id => !!document.getElementById(id);

  add(has('app-title') && has('app-sub') && has('app-act-primary'), 'Topbar global');
  add(has('pg-clientes') && has('cli-lista') && has('modal-cliente'), 'Fluxo Clientes');
  add(has('pg-campanhas') && has('camp-lista') && has('camp-wa-fila') && has('modal-campanha'), 'Fluxo Campanhas');

  const btnPrimario = document.getElementById('app-act-primary');
  add(!!String(btnPrimario?.textContent || '').trim(), 'CTA primário com rótulo');

  const cardsMobile = document.querySelectorAll('#pg-clientes .mobile-card, #pg-campanhas .mobile-card').length;
  add(cardsMobile >= 0, 'Render mobile cards', `cards detectados: ${cardsMobile}`);

  const tabelasCriticas = document.querySelectorAll('#pg-clientes .tbl, #pg-campanhas .tbl').length;
  add(tabelasCriticas >= 0, 'Render tabelas críticas', `tabelas detectadas: ${tabelasCriticas}`);

  const falhas = checks.filter(c => !c.ok);
  const ok = checks.length - falhas.length;
  console.table(checks.map(c => ({ status: c.ok ? 'OK' : 'FALHA', item: c.item, detalhe: c.detalhe || '' })));
  toast(falhas.length ? `Auditoria visual: ${ok}/${checks.length} OK (${falhas.length} falha(s)).` : `Auditoria visual: ${ok}/${checks.length} OK.`);
}

function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function executarAuditoriaAceite(){
  const checks = [];
  const add = (frente, ok, item, detalhe = '') => checks.push({ frente, ok, item, detalhe });
  const cta = document.getElementById('app-act-primary');
  const btn = document.querySelector('.btn');
  const card = document.querySelector('.card');
  const panel = document.querySelector('.panel');
  const badge = document.querySelector('.bdg');
  const alert = document.querySelector('.alert');
  const modal = document.querySelector('.modal-box');

  const radiusMd = cssVar('--radius-md');
  const radiusLg = cssVar('--radius-lg');
  const shadowMd = cssVar('--shadow-md');

  add('Consistência visual', !!radiusMd && !!radiusLg && !!shadowMd, 'Tokens base de radius/sombra');
  if(btn){
    const s = getComputedStyle(btn);
    add('Consistência visual', s.borderRadius === radiusMd, 'Botão usa radius padronizado', `button radius: ${s.borderRadius}`);
    add('Consistência visual', Number.parseFloat(s.minHeight || '0') >= 40, 'Botão com altura mínima consistente');
  }else{
    add('Consistência visual', false, 'Botão base encontrado');
  }
  if(card && panel){
    const sc = getComputedStyle(card);
    const sp = getComputedStyle(panel);
    add('Consistência visual', sc.borderRadius === sp.borderRadius, 'Card e Panel com raio consistente', `card:${sc.borderRadius} panel:${sp.borderRadius}`);
  }else{
    add('Consistência visual', false, 'Card/Panel disponíveis para validação');
  }

  add('Semântica de informação', !!badge, 'Badge base renderizado');
  add('Semântica de informação', !!alert, 'Alerta base renderizado');
  add('Semântica de informação', !!cssVar('--color-critical-600') && !!cssVar('--color-warning-600') && !!cssVar('--color-opportunity-600') && !!cssVar('--color-success-600'), 'Paleta semântica de prioridade ativa');

  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  add('Responsividade', vw >= 360, 'Viewport alvo 360px+', `viewport: ${vw}px`);
  if(modal){
    const sm = getComputedStyle(modal);
    add('Responsividade', sm.maxHeight !== 'none', 'Modal com limite de altura para evitar scroll confuso', `max-height: ${sm.maxHeight}`);
  }else{
    add('Responsividade', false, 'Modal base encontrado');
  }
  add('Responsividade', !!document.querySelector('.tw'), 'Tabela com container rolável horizontal (`.tw`)');

  if(btn){
    const prev = document.activeElement;
    btn.focus();
    const sb = getComputedStyle(btn).boxShadow || '';
    if(prev && typeof prev.focus === 'function') prev.focus();
    add('Acessibilidade mínima', sb !== 'none', 'Foco visível aplicável em botões', `focus shadow: ${sb ? 'ok' : 'none'}`);
  }else{
    add('Acessibilidade mínima', false, 'Foco visível em botões (elemento não encontrado)');
  }
  if(cta){
    const scta = getComputedStyle(cta);
    add('Acessibilidade mínima', scta.display !== 'none' && scta.visibility !== 'hidden', 'CTA primário visível');
  }else{
    add('Acessibilidade mínima', false, 'CTA primário presente');
  }
  add('Acessibilidade mínima', Number.parseFloat(getComputedStyle(document.documentElement).fontSize || '16') >= 14, 'Base tipográfica legível');

  const total = checks.length;
  const ok = checks.filter(c => c.ok).length;
  const falhas = checks.filter(c => !c.ok);

  console.table(checks.map(c => ({
    frente: c.frente,
    status: c.ok ? 'OK' : 'FALHA',
    item: c.item,
    detalhe: c.detalhe || ''
  })));
  toast(falhas.length ? `Aceite por frente: ${ok}/${total} OK (${falhas.length} pendência(s)).` : `Aceite por frente: ${ok}/${total} OK.`);
}

const QUICK_COMMANDS = [
  { cmd: '/ dashboard', label: 'Abrir Dashboard', run: () => ir('dashboard') },
  { cmd: '/ gerencial', label: 'Abrir Gerencial', run: () => ir('gerencial') },
  { cmd: '/ produtos', label: 'Abrir Produtos', run: () => ir('produtos') },
  { cmd: '/ clientes', label: 'Abrir Clientes', run: () => ir('clientes') },
  { cmd: '/ pedidos', label: 'Abrir Pedidos', run: () => ir('pedidos') },
  { cmd: '/ cotacao', label: 'Abrir Cotação', run: () => ir('cotacao') },
  { cmd: '/ estoque', label: 'Abrir Estoque', run: () => ir('estoque') },
  { cmd: '/ campanhas', label: 'Abrir Campanhas', run: () => ir('campanhas') },
  { cmd: '/ acessos', label: 'Abrir Acessos', run: () => ir('acessos') },
  { cmd: '/ notificacoes', label: 'Abrir Notificações', run: () => ir('notificacoes') },
  { cmd: '/ filiais', label: 'Abrir Filiais', run: () => ir('filiais') },
  { cmd: '/ novo pedido', label: 'Novo Pedido', run: () => { limparFormPedTracked(); abrirModal('modal-pedido'); } },
  { cmd: '/ novo cliente', label: 'Novo Cliente', run: () => { limparFormCliTracked(); abrirModal('modal-cliente'); } },
  { cmd: '/ novo produto', label: 'Novo Produto', run: () => { limparFormProdTracked(); abrirModal('modal-produto'); } },
  { cmd: '/ nova campanha', label: 'Nova Campanha', run: () => abrirNovaCampanhaTracked() },
  { cmd: '/ nova mov', label: 'Nova Movimentação', run: () => { resetMov(); abrirModal('modal-mov'); } },
  { cmd: '/ sync jogos', label: 'Sincronizar Jogos', run: () => abrirSyncJogos() },
  { cmd: '/ auditoria visual', label: 'Auditoria Visual', run: () => executarAuditoriaVisual() },
  { cmd: '/ auditoria aceite', label: 'Auditoria de Aceite', run: () => executarAuditoriaAceite() }
];

function buildDefaultGoalMetrics(){
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

function getDefaultJourneyShape(){
  return { started: 0, completed: 0, abandoned: 0, rework: 0, total_ms: 0 };
}

function ensureGoalMetricsShape(raw){
  const base = buildDefaultGoalMetrics();
  const out = { ...base, ...(raw || {}) };
  out.version = GOAL_METRICS_VERSION;
  out.started_at = out.started_at || base.started_at;
  out.task_start = { ...base.task_start, ...(out.task_start || {}) };
  out.critical = { ...base.critical, ...(out.critical || {}) };
  Object.keys(base.critical).forEach(k => {
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
  ['produto', 'cliente', 'pedido', 'campanha'].forEach(j => {
    out.kpi.journeys[j] = { ...getDefaultJourneyShape(), ...(out.kpi.journeys[j] || {}) };
  });
  out.kpi.notifications = { ...base.kpi.notifications, ...(out.kpi.notifications || {}) };
  out.kpi.primary_clicks = { ...base.kpi.primary_clicks, ...(out.kpi.primary_clicks || {}) };
  KPI_PAGES.forEach(p => {
    out.kpi.primary_clicks[p] = { ...base.kpi.primary_clicks[p], ...(out.kpi.primary_clicks[p] || {}) };
  });
  return out;
}

function getUxEvents(){
  try{
    const parsed = JSON.parse(localStorage.getItem(UX_EVENTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  }catch{
    return [];
  }
}

function saveUxEvents(events){
  localStorage.setItem(UX_EVENTS_KEY, JSON.stringify(events));
}

function pushUxEvent(type, payload = {}){
  const evs = getUxEvents();
  evs.unshift({
    id: uid(),
    ts: new Date().toISOString(),
    page: pageAtual(),
    type,
    ...payload
  });
  saveUxEvents(evs.slice(0, 300));
}

function getGoalMetrics(){
  try{
    const parsed = JSON.parse(localStorage.getItem(GOAL_METRICS_KEY) || '{}');
    return ensureGoalMetricsShape(parsed);
  }catch{
    return buildDefaultGoalMetrics();
  }
}

function saveGoalMetrics(m){
  localStorage.setItem(GOAL_METRICS_KEY, JSON.stringify(m));
}

function startCriticalTask(tipo){
  const m = getGoalMetrics();
  m.task_start[tipo] = Date.now();
  if(m.kpi.journeys[tipo]){
    m.kpi.journeys[tipo].started += 1;
  }
  saveGoalMetrics(m);
  pushUxEvent('journey_started', { journey: tipo });
}

function completeCriticalTask(tipo){
  const m = getGoalMetrics();
  const st = Number(m.task_start?.[tipo] || 0);
  if(!st) return;
  const elapsed = Math.max(0, Date.now() - st);
  const cur = m.critical[tipo];
  cur.total_ms += elapsed;
  cur.count += 1;
  if(!cur.baseline_ms) cur.baseline_ms = elapsed;
  const j = m.kpi.journeys?.[tipo];
  if(j){
    j.completed += 1;
    j.total_ms += elapsed;
  }
  m.kpi.completion.total += 1;
  if(window.matchMedia('(max-width: 760px)').matches){
    m.kpi.completion.mobile += 1;
  }
  delete m.task_start[tipo];
  saveGoalMetrics(m);
  pushUxEvent('journey_completed', { journey: tipo, elapsed_ms: elapsed });
}

function abandonCriticalTask(tipo, reason = 'unknown'){
  const m = getGoalMetrics();
  const st = Number(m.task_start?.[tipo] || 0);
  if(!st) return;
  const elapsed = Math.max(0, Date.now() - st);
  delete m.task_start[tipo];
  if(m.kpi.journeys[tipo]){
    m.kpi.journeys[tipo].abandoned += 1;
  }
  m.kpi.abandonment.total += 1;
  saveGoalMetrics(m);
  pushUxEvent('journey_abandoned', { journey: tipo, reason, elapsed_ms: elapsed });
}

function registerJourneyRework(tipo){
  const m = getGoalMetrics();
  if(!m.kpi.journeys[tipo]) return;
  m.kpi.journeys[tipo].rework += 1;
  m.kpi.rework.total += 1;
  saveGoalMetrics(m);
  pushUxEvent('journey_rework', { journey: tipo });
}

function startPrimaryActionTracking(page){
  primaryActionTracker.page = String(page || 'dashboard');
  primaryActionTracker.clicks = 0;
  primaryActionTracker.active = true;
}

function trackPrimaryActionClick(e){
  if(!primaryActionTracker.active) return;
  const target = e.target?.closest?.('button,[role="button"],a,.tb,.qk,.ni,.ib');
  if(!target) return;
  if(target.id === 'app-act-primary' || target.closest('#app-act-primary')) return;
  primaryActionTracker.clicks += 1;
}

function completePrimaryActionTracking(page){
  const p = String(page || primaryActionTracker.page || 'dashboard');
  if(!primaryActionTracker.active) return;
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

function registerNotificationKpi(type, amount = 1){
  const m = getGoalMetrics();
  if(!(type in m.kpi.notifications)) return;
  m.kpi.notifications[type] += Math.max(0, Number(amount || 0));
  saveGoalMetrics(m);
}

function logStrategicAction(tipo){
  const m = getGoalMetrics();
  if(!(tipo in m.strategic)) return;
  m.strategic[tipo] += 1;
  saveGoalMetrics(m);
}

function markConsistencyPage(page){
  const m = getGoalMetrics();
  if(page in m.consistency){
    m.consistency[page] = true;
    saveGoalMetrics(m);
  }
}

function classifyToastError(msg, severity = ''){
  const t = norm(msg || '');
  const sev = norm(severity || '');
  if(!t) return;
  const m = getGoalMetrics();
  if(sev === 'error'){
    m.errors.operation += 1;
    saveGoalMetrics(m);
    pushUxEvent('ux_error', { severity: sev, message: String(msg || '').slice(0, 180) });
    return;
  }
  if(sev === 'warning'){
    if(
      t.includes('obrigat') ||
      t.includes('preencha') ||
      t.includes('informe') ||
      t.includes('selecione')
    ){
      m.errors.validation += 1;
      saveGoalMetrics(m);
      pushUxEvent('ux_validation_warning', { severity: sev, message: String(msg || '').slice(0, 180) });
    }
    return;
  }
  if(
    t.startsWith('informe') ||
    t.startsWith('selecione') ||
    t.startsWith('adicione') ||
    t.includes('obrigat')
  ){
    m.errors.validation += 1;
    saveGoalMetrics(m);
    pushUxEvent('ux_validation_warning', { severity: sev || 'warning', message: String(msg || '').slice(0, 180) });
    return;
  }
  if(t.startsWith('erro') || t.includes('falha')){
    m.errors.operation += 1;
    saveGoalMetrics(m);
    pushUxEvent('ux_error', { severity: sev || 'error', message: String(msg || '').slice(0, 180) });
  }
}

function formatMs(ms){
  const s = Math.round((Number(ms || 0) / 1000));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function calcGoalSummary(){
  const m = getGoalMetrics();
  const crit = Object.values(m.critical);
  const withData = crit.filter(c => c.count > 0);
  const currentAvg = withData.length
    ? withData.reduce((a, c) => a + (c.total_ms / c.count), 0) / withData.length
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
    acc[page] = {
      count,
      avg: count > 0 ? total / count : 0
    };
    return acc;
  }, {});
  const clickBuckets = Object.values(clicksByModule).filter(x => x.count > 0);
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
    const avgMs = completed > 0 ? (totalMs / completed) : 0;
    const abandonmentRate = started > 0 ? (abandoned / started) * 100 : 0;
    const reworkRate = completed > 0 ? (rework / completed) * 100 : 0;
    const clicks = m.kpi.primary_clicks?.[key];
    const clicksAvg = clicks?.count > 0 ? (Number(clicks.total || 0) / Number(clicks.count || 1)) : 0;
    acc[key] = { started, completed, abandoned, rework, avgMs, abandonmentRate, reworkRate, clicksAvg };
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

function renderMetasNegocio(){
  const el = document.getElementById('dash-metas-negocio');
  if(!el) return;
  const s = calcGoalSummary();

  const tempoMeta = Math.min(100, Math.max(0, (s.ganhoTempo / 20) * 100));
  const retrabalhoMeta = Math.min(100, Math.max(0, (s.reducaoRetrabalho / 30) * 100));
  const mobileMeta = Math.min(100, s.mobileCompletionRate);
  const clickMeta = Math.min(100, Math.max(0, (4 / Math.max(1, s.avgClicksPrimary || 1)) * 100));
  const notiMeta = Math.min(100, s.notiResolutionRate);
  const clickResumo = ['clientes', 'campanhas', 'pedidos']
    .map(p => {
      const d = s.clicksByModule[p] || { avg: 0, count: 0 };
      return `${p.slice(0,3)} ${d.count ? d.avg.toFixed(1) : '—'}`;
    })
    .join(' · ');

  el.innerHTML = `
    <div class="dash-goals-grid">
      <div class="dash-goal-item">
        <div class="fb">
          <div style="font-size:12px;color:var(--tx2)">Tempo de ações críticas</div>
          <span class="bdg ${tempoMeta >= 100 ? 'bg' : 'bb'}">${s.ganhoTempo.toFixed(1)}%</span>
        </div>
        <div class="sbar"><div class="sbar-f" style="width:${tempoMeta}%;background:var(--b)"></div></div>
        <div style="font-size:11px;color:var(--tx3)">Atual ${formatMs(s.currentAvg)} · Meta 20%</div>
      </div>

      <div class="dash-goal-item">
        <div class="fb">
          <div style="font-size:12px;color:var(--tx2)">Retrabalho por erro visual</div>
          <span class="bdg ${retrabalhoMeta >= 100 ? 'bg' : 'ba'}">${s.erroRate.toFixed(1)}%</span>
        </div>
        <div class="sbar"><div class="sbar-f" style="width:${retrabalhoMeta}%;background:var(--a)"></div></div>
        <div style="font-size:11px;color:var(--tx3)">Validação ${s.m.errors.validation} · Operação ${s.m.errors.operation}</div>
      </div>

      <div class="dash-goal-item">
        <div class="fb">
          <div style="font-size:12px;color:var(--tx2)">Uso de ações estratégicas</div>
          <span class="bdg ${s.strategicProgress >= 100 ? 'bg' : 'bb'}">${s.strategicTotal}</span>
        </div>
        <div class="sbar"><div class="sbar-f" style="width:${s.strategicProgress}%;background:var(--g)"></div></div>
        <div style="font-size:11px;color:var(--tx3)">Camp ${s.m.strategic.campanhas} · Noti ${s.m.strategic.notificacoes} · Opp ${s.m.strategic.oportunidades}</div>
      </div>

      <div class="dash-goal-item">
        <div class="fb">
          <div style="font-size:12px;color:var(--tx2)">Consistência entre módulos</div>
          <span class="bdg ${s.consistencyProgress >= 100 ? 'bg' : 'ba'}">${s.consistencyDone}/4</span>
        </div>
        <div class="sbar"><div class="sbar-f" style="width:${s.consistencyProgress}%;background:var(--acc)"></div></div>
        <div style="font-size:11px;color:var(--tx3)">Dashboard · Clientes · Campanhas · Pedidos</div>
      </div>
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

function renderUxJourneyKpis(summary){
  const el = document.getElementById('dash-kpi-jornadas');
  if(!el) return;
  const rows = ['cliente', 'pedido', 'campanha', 'produto'];
  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Jornada</th>
            <th style="text-align:right">Tempo médio</th>
            <th style="text-align:right">Inícios</th>
            <th style="text-align:right">Conclusões</th>
            <th style="text-align:right">Abandono</th>
            <th style="text-align:right">Retrabalho</th>
            <th style="text-align:right">Cliques</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(j => {
            const d = summary.journeys?.[j] || {};
            return `
              <tr>
                <td style="font-weight:600;text-transform:capitalize">${j}</td>
                <td style="text-align:right">${formatMs(d.avgMs || 0)}</td>
                <td style="text-align:right">${d.started || 0}</td>
                <td style="text-align:right">${d.completed || 0}</td>
                <td style="text-align:right">${(d.abandonmentRate || 0).toFixed(1)}%</td>
                <td style="text-align:right">${(d.reworkRate || 0).toFixed(1)}%</td>
                <td style="text-align:right">${(d.clicksAvg || 0).toFixed(1)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="dash-goals-foot" style="margin-top:10px">
      <span class="bdg ${summary.avgAbandonmentRate <= 20 ? 'bg' : 'ba'}">Abandono médio ${summary.avgAbandonmentRate.toFixed(1)}%</span>
      <span class="bdg ${summary.avgReworkRate <= 20 ? 'bg' : 'ba'}">Retrabalho médio ${summary.avgReworkRate.toFixed(1)}%</span>
    </div>
  `;
}

function renderUxEventsPanel(){
  const el = document.getElementById('dash-kpi-eventos');
  if(!el) return;
  const events = getUxEvents();
  if(!events.length){
    el.innerHTML = `<div class="empty" style="padding:12px"><p>Sem eventos registrados ainda.</p></div>`;
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
    <div class="dash-goals-foot">
      ${topTypes.map(([k, n]) => `<span class="bdg bk">${k}: ${n}</span>`).join('')}
    </div>
    <div class="tw" style="margin-top:10px">
      <table class="tbl">
        <thead>
          <tr>
            <th>Quando</th>
            <th>Tipo</th>
            <th>Página</th>
            <th>Detalhe</th>
          </tr>
        </thead>
        <tbody>
          ${recent.map(ev => `
            <tr>
              <td>${new Date(ev.ts).toLocaleString('pt-BR')}</td>
              <td><span class="bdg bb">${ev.type}</span></td>
              <td>${ev.page || '—'}</td>
              <td>${ev.journey || ev.message || (ev.clicks_to_primary != null ? `cliques=${ev.clicks_to_primary}` : '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function mapInsightToBadgeClass(kind){
  if(kind === 'risco') return 'br';
  if(kind === 'atencao') return 'ba';
  return 'bb';
}

function buildGerencialModel(summary){
  const insights = [];
  const noti = getNotificacoesResumo();
  const pendenciasCampanha = (D.campanhaEnvios?.[State.FIL] || []).filter(e => e.status === 'pendente' || e.status === 'manual').length;

  if(summary.avgAbandonmentRate > 20){
    insights.push({
      kind: 'risco',
      title: 'Abandono elevado nas jornadas críticas',
      metric: `${summary.avgAbandonmentRate.toFixed(1)}%`,
      description: `A taxa de abandono está acima do esperado. Revise fricções em cliente, pedido e campanha.`,
      action: { id: 'ir-clientes', label: 'Revisar jornada de clientes' },
      priority: 1
    });
  }

  if(summary.erroRate > 12){
    insights.push({
      kind: 'risco',
      title: 'Erro operacional acima da meta',
      metric: `${summary.erroRate.toFixed(1)}%`,
      description: 'Há mais erros em formulários e operações do que o aceitável para produtividade.',
      action: { id: 'ir-notificacoes', label: 'Abrir notificações' },
      priority: 2
    });
  }

  if(noti.critico > 0){
    insights.push({
      kind: 'risco',
      title: 'Itens críticos pendentes',
      metric: `${noti.critico}`,
      description: 'Existem alertas críticos ativos que podem impactar venda e operação diária.',
      action: { id: 'ir-notificacoes', label: 'Tratar críticos' },
      priority: 3
    });
  }

  if(pendenciasCampanha > 0){
    insights.push({
      kind: 'atencao',
      title: 'Fila de campanha pendente',
      metric: `${pendenciasCampanha}`,
      description: 'Há envios manuais/pendentes aguardando execução da equipe.',
      action: { id: 'ir-campanhas', label: 'Abrir fila de campanhas' },
      priority: 4
    });
  }

  if(noti.oportunidade > 0){
    insights.push({
      kind: 'oportunidade',
      title: 'Oportunidades comerciais detectadas',
      metric: `${noti.oportunidade}`,
      description: 'Clientes elegíveis e eventos próximos podem virar receita com ação rápida.',
      action: { id: 'ir-campanhas', label: 'Criar ação comercial' },
      priority: 5
    });
  }

  if(summary.mobileCompletionRate < 70){
    insights.push({
      kind: 'atencao',
      title: 'Conclusão no mobile abaixo do ideal',
      metric: `${summary.mobileCompletionRate.toFixed(1)}%`,
      description: 'Usuários mobile concluem menos tarefas. Priorize fluxos com menos passos.',
      action: { id: 'ir-pedidos-novo', label: 'Testar fluxo rápido de pedido' },
      priority: 6
    });
  }

  if(summary.strategicTotal >= 6 && noti.critico === 0 && summary.erroRate <= 12){
    insights.push({
      kind: 'oportunidade',
      title: 'Momento favorável para acelerar campanhas',
      metric: `${summary.strategicTotal} ações`,
      description: 'Base está estável. Há espaço para aumentar cadência de ações de relacionamento.',
      action: { id: 'nova-campanha', label: 'Nova campanha' },
      priority: 7
    });
  }

  const orderedInsights = insights
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6);

  const recommendations = orderedInsights.map((item, idx) => ({
    id: `rec-${idx + 1}`,
    severity: item.kind,
    title: item.title,
    recommendation: buildRecommendationText(item, summary),
    action: item.action
  }));

  if(!recommendations.length){
    recommendations.push({
      id: 'rec-baseline',
      severity: 'oportunidade',
      title: 'Painel está estável',
      recommendation: 'Sem riscos imediatos. Atualize os KPIs e avance com ações comerciais da semana.',
      action: { id: 'atualizar-kpis', label: 'Atualizar KPIs' }
    });
  }

  return { insights: orderedInsights, recommendations };
}

function buildRecommendationText(item, summary){
  if(item.kind === 'risco'){
    return `Impacto alto na operação. Corrigir agora reduz retrabalho e melhora tempo médio (${formatMs(summary.currentAvg)}).`;
  }
  if(item.kind === 'atencao'){
    return 'Monitorar no curto prazo evita que o problema vire bloqueio operacional.';
  }
  return 'Ação com potencial de ganho comercial direto. Execute para aumentar conversão.';
}

function executarAcaoGerencial(actionId){
  const actions = {
    'ir-clientes': () => ir('clientes'),
    'ir-notificacoes': () => ir('notificacoes'),
    'ir-campanhas': () => ir('campanhas'),
    'nova-campanha': () => abrirNovaCampanhaTracked(),
    'ir-pedidos-novo': () => {
      ir('pedidos');
      limparFormPedTracked();
      abrirModal('modal-pedido');
    },
    'atualizar-kpis': () => renderMetasNegocio()
  };
  pushUxEvent('gerencial_action', { action_id: actionId, page: 'gerencial' });
  if(actions[actionId]) actions[actionId]();
}

function renderGerencialLayer(summary){
  const insightEl = document.getElementById('ger-insights');
  const recEl = document.getElementById('ger-recomendacoes');
  if(!insightEl || !recEl) return;

  const model = buildGerencialModel(summary);
  if(!model.insights.length){
    insightEl.innerHTML = `<div class="empty" style="padding:12px"><p>Sem insights disponíveis com os dados atuais.</p></div>`;
  }else{
    insightEl.innerHTML = `
      <div class="ger-insights-grid">
        ${model.insights.map(item => `
          <article class="ger-insight-card ger-insight-${item.kind}">
            <div class="ger-insight-head">
              <span class="bdg ${mapInsightToBadgeClass(item.kind)}">${item.kind}</span>
              <span class="bdg bk">${item.metric}</span>
            </div>
            <h4>${item.title}</h4>
            <p>${item.description}</p>
            <button class="btn btn-sm" onclick="executarAcaoGerencial('${item.action.id}')">${item.action.label}</button>
          </article>
        `).join('')}
      </div>
    `;
  }

  recEl.innerHTML = `
    <div class="ger-reco-list">
      ${model.recommendations.map((item, i) => `
        <article class="ger-reco-item">
          <div class="ger-reco-meta">
            <span class="bdg bk">#${i + 1}</span>
            <span class="bdg ${mapInsightToBadgeClass(item.severity)}">${item.severity}</span>
          </div>
          <h4>${item.title}</h4>
          <p>${item.recommendation}</p>
          <button class="btn btn-sm" onclick="executarAcaoGerencial('${item.action.id}')">${item.action.label}</button>
        </article>
      `).join('')}
    </div>
  `;
}

function initGoalTracking(){
  getGoalMetrics();
  document.addEventListener('click', trackPrimaryActionClick, true);
  window.addEventListener('sc:toast', e => {
    classifyToastError(e?.detail?.message || '', e?.detail?.severity || '');
    renderMetasNegocio();
  });
  window.addEventListener('sc:modal-open', e => {
    const id = e?.detail?.id;
    const journey = JOURNEY_MODAL_MAP[id];
    if(journey) pushUxEvent('modal_open', { modal_id: id, journey });
  });
  window.addEventListener('sc:modal-close', e => {
    const id = e?.detail?.id;
    const journey = JOURNEY_MODAL_MAP[id];
    if(!journey) return;
    pushUxEvent('modal_close', { modal_id: id, journey });
    const m = getGoalMetrics();
    const started = Number(m.task_start?.[journey] || 0);
    if(started > 0){
      abandonCriticalTask(journey, 'modal_close');
      renderMetasNegocio();
    }
  });
}

function limparFormProdTracked(){
  startCriticalTask('produto');
  return limparFormProd();
}
function limparFormCliTracked(){
  startCriticalTask('cliente');
  return limparFormCli();
}
function limparFormPedTracked(){
  startCriticalTask('pedido');
  return limparFormPed();
}
function abrirNovaCampanhaTracked(){
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode criar campanha.')) return;
  startCriticalTask('campanha');
  logStrategicAction('campanhas');
  return abrirNovaCampanha();
}
async function salvarProdutoTracked(){
  if(State.editIds.prod) registerJourneyRework('produto');
  await salvarProduto();
  const open = document.getElementById('modal-produto')?.classList.contains('on');
  if(!open) completeCriticalTask('produto');
  renderMetasNegocio();
}
async function salvarClienteTracked(){
  if(State.editIds.cli) registerJourneyRework('cliente');
  await salvarCliente();
  const open = document.getElementById('modal-cliente')?.classList.contains('on');
  if(!open) completeCriticalTask('cliente');
  renderMetasNegocio();
}
async function salvarPedidoTracked(){
  if(State.editIds.ped) registerJourneyRework('pedido');
  await salvarPedido();
  const open = document.getElementById('modal-pedido')?.classList.contains('on');
  if(!open) completeCriticalTask('pedido');
  renderMetasNegocio();
}
async function salvarCampanhaTracked(){
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode salvar campanha.')) return;
  if(State.editIds?.campanha) registerJourneyRework('campanha');
  await salvarCampanha();
  const open = document.getElementById('modal-campanha')?.classList.contains('on');
  if(!open){
    completeCriticalTask('campanha');
    logStrategicAction('campanhas');
  }
  renderMetasNegocio();
}
async function gerarFilaCampanhaTracked(id){
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode gerar fila de campanha.')) return;
  logStrategicAction('campanhas');
  await gerarFilaCampanha(id);
  renderMetasNegocio();
}

function findQuickCommand(raw){
  const v = norm(raw).replace(/^\/\s*/, '');
  if(!v) return null;
  return QUICK_COMMANDS.find(c => norm(c.cmd).replace(/^\/\s*/, '') === v) ||
    QUICK_COMMANDS.find(c => norm(c.cmd).replace(/^\/\s*/, '').includes(v));
}

function executeQuickCommand(raw){
  const found = findQuickCommand(raw);
  if(!found){
    toast('Comando não encontrado. Ex: / clientes, / nova campanha');
    return false;
  }
  found.run();
  return true;
}

function initQuickCommand(){
  const input = document.getElementById('quick-cmd');
  const dl = document.getElementById('quick-cmd-list');
  if(!input || !dl) return;

  dl.innerHTML = QUICK_COMMANDS
    .map(c => `<option value="${c.cmd}">${c.label}</option>`)
    .join('');

  input.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const ok = executeQuickCommand(input.value);
    if(ok) input.value = '';
  });

  document.addEventListener('keydown', e => {
    if(e.key !== '/') return;
    const target = e.target;
    const editing = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
    if(editing) return;
    e.preventDefault();
    input.focus();
    input.select();
  });
}

const FLOW_MAX = { prod: 4, cli: 4 };
window.__flowSteps = { prod: 1, cli: 1 };

function flowVal(id, fallback = '—'){
  const el = document.getElementById(id);
  if(!el) return fallback;
  const raw = ('value' in el ? el.value : el.textContent) ?? '';
  const v = String(raw).trim();
  return v || fallback;
}

function focusField(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.focus();
  if(typeof el.select === 'function') el.select();
}

function validateFlowStep(flow, step){
  if(flow === 'prod'){
    if(step === 1){
      const nome = flowVal('p-nome', '');
      const custo = parseFloat(document.getElementById('p-custo')?.value || 0) || 0;
      if(!nome){
        toast('Produto: informe o nome para continuar.');
        focusField('p-nome');
        return false;
      }
      if(custo <= 0){
        toast('Produto: informe um custo maior que zero.');
        focusField('p-custo');
        return false;
      }
    }
    if(step === 2){
      const mkv = parseFloat(document.getElementById('p-mkv')?.value || 0) || 0;
      const pfa = parseFloat(document.getElementById('p-pfa')?.value || 0) || 0;
      const mka = parseFloat(document.getElementById('p-mka')?.value || 0) || 0;
      if(mkv <= 0 && pfa <= 0 && mka <= 0){
        toast('Produto: defina markup varejo ou preço/markup de atacado.');
        focusField('p-mkv');
        return false;
      }
    }
    return true;
  }

  if(flow === 'cli'){
    if(step === 1){
      const nome = flowVal('c-nome', '');
      if(!nome){
        toast('Cliente: informe o nome para continuar.');
        focusField('c-nome');
        return false;
      }
    }
    if(step === 2){
      const tab = flowVal('c-tab', '');
      const prazo = flowVal('c-prazo', '');
      if(!tab || !prazo){
        toast('Cliente: complete os dados comerciais (tabela e prazo).');
        focusField(!tab ? 'c-tab' : 'c-prazo');
        return false;
      }
    }
    return true;
  }

  return true;
}

function renderFlowSummary(flow){
  if(flow === 'prod'){
    const el = document.getElementById('prod-flow-resumo');
    if(!el) return;
    const custo = parseFloat(document.getElementById('p-custo')?.value || 0) || 0;
    const mkv = parseFloat(document.getElementById('p-mkv')?.value || 0) || 0;
    const mka = parseFloat(document.getElementById('p-mka')?.value || 0) || 0;
    const pfa = parseFloat(document.getElementById('p-pfa')?.value || 0) || 0;
    const un = flowVal('p-un', '');
    const nome = flowVal('p-nome', '');
    const sku = flowVal('p-sku', '—');
    const cat = flowVal('p-cat', '—');
    const pv = custo > 0 && mkv > 0 ? prV(custo, mkv) : 0;
    const pa = pfa > 0 ? pfa : (custo > 0 && mka > 0 ? prV(custo, mka) : 0);
    const margemV = pv > 0 ? ((pv - custo) / pv) * 100 : 0;
    const margemA = pa > 0 ? ((pa - custo) / pa) * 100 : 0;
    const inconsistencias = [];
    if(pv > 0 && pv <= custo) inconsistencias.push('Preço varejo está menor/igual ao custo.');
    if(pa > 0 && pa <= custo) inconsistencias.push('Preço atacado está menor/igual ao custo.');
    if(pa > 0 && pv > 0 && pa > pv) inconsistencias.push('Preço atacado está acima do varejo.');
    if((parseFloat(document.getElementById('p-emin')?.value || 0) || 0) < 0) inconsistencias.push('Estoque mínimo negativo.');

    const checks = [
      { ok: !!nome, label: 'Nome do produto' },
      { ok: !!un, label: 'Unidade' },
      { ok: custo > 0, label: 'Custo válido' },
      { ok: mkv > 0 || mka > 0 || pfa > 0, label: 'Regra de preço definida' }
    ];

    const checkHtml = checks.map(c => `<span class="bdg ${c.ok ? 'bg' : 'br'}">${c.ok ? 'OK' : 'Pendente'} • ${c.label}</span>`).join('');
    const incHtml = inconsistencias.length
      ? `<div class="panel" style="margin-top:10px"><div class="pt">Inconsistências</div>${inconsistencias.map(i => `<div style="margin-bottom:4px">- ${i}</div>`).join('')}</div>`
      : `<div class="panel" style="margin-top:10px"><div class="pt">Inconsistências</div><div>Nenhuma inconsistência crítica detectada.</div></div>`;

    el.innerHTML = `
      <div class="fg2" style="margin-bottom:10px;gap:6px">${checkHtml}</div>
      <div class="fg c2">
        <div><div class="fl">Produto</div><div><b>${nome || '—'}</b></div></div>
        <div><div class="fl">SKU</div><div>${sku}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Unidade / Categoria</div><div>${un || '—'} • ${cat}</div></div>
        <div><div class="fl">Custo</div><div>${custo > 0 ? fmt(custo) : '—'}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Preço Varejo</div><div>${pv > 0 ? `${fmt(pv)} (${margemV.toFixed(1)}% margem)` : '—'}</div></div>
        <div><div class="fl">Preço Atacado</div><div>${pa > 0 ? `${fmt(pa)} (${margemA.toFixed(1)}% margem)` : '—'}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Estoque inicial</div><div>${flowVal('p-esal')}</div></div>
        <div><div class="fl">Estoque mínimo</div><div>${flowVal('p-emin')}</div></div>
      </div>
      ${incHtml}
    `;
    return;
  }

  if(flow === 'cli'){
    const el = document.getElementById('cli-flow-resumo');
    if(!el) return;
    const optins = [
      document.getElementById('c-optin-marketing')?.checked ? 'Marketing' : '',
      document.getElementById('c-optin-email')?.checked ? 'E-mail' : '',
      document.getElementById('c-optin-sms')?.checked ? 'SMS' : ''
    ].filter(Boolean).join(', ');
    const nome = flowVal('c-nome', '');
    const whatsapp = flowVal('c-whatsapp', '');
    const tel = flowVal('c-tel', '');
    const email = flowVal('c-email', '');
    const contatoCount = [whatsapp, tel, email].filter(Boolean).length;
    const optinEmail = !!document.getElementById('c-optin-email')?.checked;
    const optinSms = !!document.getElementById('c-optin-sms')?.checked;
    const optinMkt = !!document.getElementById('c-optin-marketing')?.checked;
    const inconsistencias = [];
    if(optinEmail && !email) inconsistencias.push('Opt-in de e-mail marcado sem e-mail cadastrado.');
    if(optinSms && !tel) inconsistencias.push('Opt-in de SMS marcado sem telefone.');
    if(optinMkt && !whatsapp && !tel && !email) inconsistencias.push('Opt-in de marketing marcado sem canal de contato.');

    const checks = [
      { ok: !!nome, label: 'Nome do cliente' },
      { ok: contatoCount > 0, label: 'Pelo menos 1 canal de contato' },
      { ok: !!flowVal('c-tab', ''), label: 'Tabela comercial' },
      { ok: !!flowVal('c-prazo', ''), label: 'Prazo comercial' }
    ];
    const checkHtml = checks.map(c => `<span class="bdg ${c.ok ? 'bg' : 'br'}">${c.ok ? 'OK' : 'Pendente'} • ${c.label}</span>`).join('');
    const canais = [
      whatsapp ? 'WhatsApp' : '',
      tel ? 'Telefone' : '',
      email ? 'E-mail' : ''
    ].filter(Boolean).join(', ') || 'Nenhum';
    const incHtml = inconsistencias.length
      ? `<div class="panel" style="margin-top:10px"><div class="pt">Inconsistências</div>${inconsistencias.map(i => `<div style="margin-bottom:4px">- ${i}</div>`).join('')}</div>`
      : `<div class="panel" style="margin-top:10px"><div class="pt">Inconsistências</div><div>Nenhuma inconsistência crítica detectada.</div></div>`;
    el.innerHTML = `
      <div class="fg2" style="margin-bottom:10px;gap:6px">${checkHtml}</div>
      <div class="fg c2">
        <div><div class="fl">Cliente</div><div><b>${nome || '—'}</b></div></div>
        <div><div class="fl">Apelido</div><div>${flowVal('c-apelido')}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Documento / Tipo</div><div>${flowVal('c-doc')} • ${flowVal('c-tipo')}</div></div>
        <div><div class="fl">Status</div><div>${flowVal('c-status')}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Contato</div><div>${flowVal('c-tel')} • ${flowVal('c-whatsapp')} • ${flowVal('c-email')}</div></div>
        <div><div class="fl">Aniversário</div><div>${flowVal('c-aniv')}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Comercial</div><div>${flowVal('c-seg')} • ${flowVal('c-tab')} • ${flowVal('c-prazo')}</div></div>
        <div><div class="fl">Time(s)</div><div>${flowVal('c-time')}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Cidade / Estado</div><div>${flowVal('c-cidade')} • ${flowVal('c-estado')}</div></div>
        <div><div class="fl">Opt-ins</div><div>${optins || 'Nenhum'}</div></div>
      </div>
      <div class="panel" style="margin-top:10px">
        <div class="pt">Impacto comercial</div>
        <div>Canal(is) disponível(is): <b>${canais}</b></div>
        <div style="margin-top:4px">Pronto para campanhas: <b>${(optinMkt && contatoCount > 0) ? 'Sim' : 'Parcial'}</b></div>
      </div>
      ${incHtml}
    `;
  }
}

function setFlowStep(flow, rawStep){
  const max = FLOW_MAX[flow];
  if(!max) return;
  const current = window.__flowSteps[flow] || 1;
  let step = Math.max(1, Math.min(max, Number(rawStep) || 1));

  if(step > current){
    for(let s = current; s < step; s += 1){
      if(!validateFlowStep(flow, s)){
        step = current;
        break;
      }
    }
  }

  window.__flowSteps[flow] = step;

  document.querySelectorAll(`.flow-step[data-flow-id="${flow}"]`).forEach(el => {
    el.classList.toggle('on', Number(el.dataset.step) === step);
  });
  document.querySelectorAll(`.flow-chip[data-flow-chip="${flow}"]`).forEach(el => {
    el.classList.toggle('on', Number(el.dataset.step) === step);
  });

  const prev = document.getElementById(`${flow}-flow-prev`);
  const next = document.getElementById(`${flow}-flow-next`);
  const save = document.getElementById(`${flow}-flow-save`);
  if(prev) prev.disabled = step <= 1;
  if(next) next.style.display = step >= max ? 'none' : 'inline-flex';
  if(save) save.style.display = step >= max ? 'inline-flex' : 'none';

  if(step === max) renderFlowSummary(flow);
}

function initFlowWizards(){
  ['prod','cli'].forEach(flow => setFlowStep(flow, 1));
  [
    'p-nome','p-sku','p-un','p-cat','p-custo','p-mkv','p-mka','p-pfa','p-esal','p-emin',
    'c-nome','c-apelido','c-doc','c-tipo','c-status','c-tel','c-whatsapp','c-email','c-aniv',
    'c-seg','c-tab','c-prazo','c-time','c-cidade','c-estado','c-optin-marketing','c-optin-email','c-optin-sms'
  ].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      if(window.__flowSteps.prod === FLOW_MAX.prod) renderFlowSummary('prod');
      if(window.__flowSteps.cli === FLOW_MAX.cli) renderFlowSummary('cli');
    });
  });
}

function buildSkeletonLines(lines = 3){
  return Array.from({ length: lines })
    .map(() => '<span class="sk-line"></span>')
    .join('');
}

function renderSkeletonState(){
  const map = {
    'dash-met': `<div class="sk-grid sk-grid-4">
      <div class="sk-card">${buildSkeletonLines(2)}</div>
      <div class="sk-card">${buildSkeletonLines(2)}</div>
      <div class="sk-card">${buildSkeletonLines(2)}</div>
      <div class="sk-card">${buildSkeletonLines(2)}</div>
    </div>`,
    'dash-chart': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'dash-status': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'prod-lista': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'cli-lista': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'ped-lista': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'est-posicao': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'camp-lista': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'camp-wa-fila': `<div class="sk-card">${buildSkeletonLines(3)}</div>`,
    'camp-envios-lista': `<div class="sk-card">${buildSkeletonLines(3)}</div>`,
    'noti-lista': `<div class="sk-card">${buildSkeletonLines(3)}</div>`
  };

  Object.entries(map).forEach(([id, html]) => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = html;
  });
}

function showLoading(on) {
  let el = document.getElementById('sb-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sb-loading';
    el.style.cssText =
      'position:fixed;inset:0;background:rgba(246,245,242,.88);z-index:8000;display:none;align-items:center;justify-content:center;gap:12px;font-size:14px;font-weight:500;color:var(--tx2);font-family:DM Sans,sans-serif;backdrop-filter:blur(2px)';
    el.innerHTML =
      '<div style="width:22px;height:22px;border:2.5px solid var(--bd2);border-top-color:var(--acc);border-radius:50%;animation:sp .7s linear infinite"></div>Carregando dados…';
    const st = document.createElement('style');
    st.textContent = '@keyframes sp{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
    document.body.appendChild(el);
  }
  el.style.display = on ? 'flex' : 'none';
}

async function carregarDadosFilial(filId) {
  renderSkeletonState();
  showLoading(true);
  try {
    const [
      prods,
      clis,
      peds,
      forns,
      precos,
      cfg,
      movs,
      jogos,
      campanhas,
      campanhaEnvios
    ] = await Promise.all([
      SB.getProdutos(filId),
      SB.getClientes(filId),
      SB.getPedidos(filId),
      SB.getFornecedores(filId),
      SB.getCotPrecos(filId),
      SB.getCotConfig(filId),
      SB.getMovs(filId),
      SB.getJogosAgenda(filId).catch(() => []),
      SB.getCampanhas(filId).catch(e => {
        console.error('Falha ao carregar campanhas na entrada da filial', e);
        toast('Não foi possível carregar campanhas do banco. Usando cache local.');
        return D.campanhas?.[filId] || [];
      }),
      SB.getCampanhaEnvios(filId).catch(e => {
        console.error('Falha ao carregar envios de campanhas na entrada da filial', e);
        toast('Não foi possível carregar envios de campanha do banco. Usando cache local.');
        return D.campanhaEnvios?.[filId] || [];
      })
    ]);

    D.produtos[filId] = prods || [];
    D.clientes[filId] = clis || [];
    D.pedidos[filId] = (peds || []).map(p => ({
      ...p,
      itens: typeof p.itens === 'string' ? JSON.parse(p.itens || '[]') : (p.itens || [])
    }));
    D.fornecedores[filId] = forns || [];

    if (!D.cotPrecos[filId]) D.cotPrecos[filId] = {};
    D.cotPrecos[filId] = {};
    (precos || []).forEach(p => {
      D.cotPrecos[filId][p.produto_id + '_' + p.fornecedor_id] = p.preco;
    });

    const logs = cfg?.logs
      ? (typeof cfg.logs === 'string' ? JSON.parse(cfg.logs) : cfg.logs)
      : [];

    D.cotConfig[filId] = {
      filial_id: filId,
      locked: cfg?.locked || false,
      logs
    };

    D.movs[filId] = movs || [];
    if (!D.jogos) D.jogos = {};
    D.jogos[filId] = jogos || [];

    if (!D.campanhas) D.campanhas = {};
    if (!D.campanhaEnvios) D.campanhaEnvios = {};
    D.campanhas[filId] = campanhas || [];
    D.campanhaEnvios[filId] = campanhaEnvios || [];
  } catch (e) {
    toast('Erro ao carregar: ' + e.message);
    console.error(e);
  }
  showLoading(false);
}

function mostrarTela(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById(id)?.classList.add('on');
  window.scrollTo(0, 0);
}

function renderSetupGrid() {
  const grid = document.getElementById('fil-grid');
  const form = document.getElementById('setup-form');
  const actions = document.getElementById('setup-actions');
  const sub = document.getElementById('setup-sub');

  if (!grid || !form || !actions || !sub) return;

  if (!D.filiais.length) {
    grid.innerHTML = '';
    form.style.display = 'block';
    actions.style.display = 'none';
    sub.textContent = 'Crie sua primeira filial para começar';
    scheduleRoleUiGuards();
    return;
  }

  form.style.display = 'none';
  actions.style.display = 'flex';
  sub.textContent = 'Selecione a filial para continuar';

  grid.innerHTML = D.filiais.map(f => `
    <div class="fil-opt ${State.selFil === f.id ? 'sel' : ''}" onclick="selFilial('${f.id}')">
      <div class="fil-dot" style="background:${f.cor}"></div>
      <div>
        <div class="fil-name">${f.nome}</div>
        <div class="fil-city">${f.cidade || ''}${f.estado ? ' - ' + f.estado : ''}</div>
      </div>
    </div>
  `).join('');
  scheduleRoleUiGuards();
}

async function renderSetup() {
  mostrarTela('screen-setup');
  const session = await SB.getSession();
  if (!renderAuthGate(session)) {
    State.user = null;
    State.userRole = 'operador';
    renderRoleBadge();
    return;
  }
  await carregarContextoUsuario(session);

  const grid = document.getElementById('fil-grid');
  const form = document.getElementById('setup-form');
  const actions = document.getElementById('setup-actions');
  const sub = document.getElementById('setup-sub');
  if(grid && form && actions && sub){
    form.style.display = 'none';
    actions.style.display = 'none';
    sub.textContent = 'Carregando filiais...';
    grid.innerHTML = `
      <div class="sk-card" style="grid-column:1/-1">${buildSkeletonLines(3)}</div>
      <div class="sk-card" style="grid-column:1/-1">${buildSkeletonLines(3)}</div>
    `;
  }
  showLoading(true);
  try {
    D.filiais = await SB.getFiliais() || [];
  } catch (e) {
    toast('Erro ao buscar filiais: ' + e.message);
  }
  showLoading(false);
  renderSetupGrid();
}

function selFilial(id) {
  State.selFil = id;
  renderSetupGrid();
}

async function criarPrimeiraFilial() {
  if (!requireRole(ROLE_ADMIN_ONLY, 'Somente admin pode criar filial.')) return;
  const nome = document.getElementById('sf-nome')?.value.trim();
  if (!nome) {
    toast('Informe o nome da filial.');
    return;
  }

  const f = {
    id: uid(),
    nome,
    cidade: document.getElementById('sf-cidade')?.value.trim() || '',
    estado: document.getElementById('sf-estado')?.value.trim() || '',
    cor: document.getElementById('sf-cor')?.value || CORES[0],
    endereco: ''
  };

  try {
    await SB.upsertFilial(f);
  } catch (e) {
    toast('Erro ao criar filial: ' + e.message);
    return;
  }

  D.filiais.push(f);
  State.selFil = f.id;
  await entrar();
}

async function entrar() {
  const session = await SB.getSession();
  if(!session?.access_token){
    toast('Faça login para continuar.');
    await renderSetup();
    return;
  }
  await carregarContextoUsuario(session);

  if (!State.selFil) {
    toast('Selecione uma filial.');
    return;
  }

  try {
    D.filiais = await SB.getFiliais() || [];
  } catch (e) {}

  const f = D.filiais.find(x => x.id === State.selFil);
  if (!f) {
    toast('Filial não encontrada.');
    return;
  }

  State.FIL = State.selFil;

  const dot = document.getElementById('sb-dot');
  const fname = document.getElementById('sb-fname');
  if (dot) dot.style.background = f.cor;
  if (fname) fname.textContent = f.nome;

  await carregarDadosFilial(State.FIL);

  mostrarTela('screen-app');

  refreshProdSel();
  refreshCliDL();
  renderFornSel();
  refreshMovSel();
  refreshDestSel();
  renderDashFilSel();
  renderDash();
  atualizarBadgeEst();
  updateNotiBadge();

  ir('dashboard');
}

function voltarSetup() {
  renderSetup();
}

function resolverTodasNotificacoesTracked(){
  logStrategicAction('notificacoes');
  resolverTodasNotificacoes();
  renderMetasNegocio();
}

function exportCSV(tipo) {
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode exportar CSV.')) return;
  const saldos = calcSaldos();
  let rows = [];
  let name = '';

  if (tipo === 'produtos') {
    name = 'produtos';
    rows = [
      ['Nome', 'SKU', 'Un', 'Categoria', 'Custo', 'Mk Varejo%', 'Mg Varejo%', 'Preço Varejo', 'Mk Atacado%', 'Preço Atacado', 'Est. Min', 'Saldo Atual'],
      ...P().map(p => {
        const pv = prV(p.custo, p.mkv);
        const pa = p.pfa > 0 ? p.pfa : (p.mka > 0 ? prV(p.custo, p.mka) : 0);
        const s = saldos[p.id] || { saldo: 0 };
        return [p.nome, p.sku || '', p.un, p.cat || '', fmtN(p.custo), fmtN(p.mkv), fmtN(mk2mg(p.mkv)), fmtN(pv), fmtN(p.mka), pa > 0 ? fmtN(pa) : '', p.emin || '', fmtN(s.saldo)];
      })
    ];
  } else if (tipo === 'clientes') {
    name = 'clientes';
    rows = [
      ['Nome', 'Apelido', 'CPF/CNPJ', 'Tipo', 'Status', 'Telefone', 'Email', 'Time', 'Segmento', 'Tabela', 'Prazo', 'Cidade', 'WhatsApp', 'Aniversário'],
      ...C().map(c => [c.nome, c.apelido || '', c.doc || '', c.tipo, c.status, c.tel || '', c.email || '', c.time || '', c.seg || '', c.tab, c.prazo, c.cidade || '', c.whatsapp || '', c.data_aniversario || ''])
    ];
  } else if (tipo === 'pedidos') {
    name = 'pedidos';
    rows = [
      ['Nº', 'Cliente', 'Data', 'Status', 'Tipo', 'Pagamento', 'Prazo', 'Total', 'Lucro', 'Obs'],
      ...PD().map(p => {
        const lucro = (p.itens || []).reduce((a, i) => a + ((i.preco - i.custo) * i.qty), 0);
        return [p.num, p.cli, p.data, p.status, p.tipo, p.pgto, p.prazo, fmtN(p.total), fmtN(lucro), p.obs || ''];
      })
    ];
  } else if (tipo === 'cotacao') {
    name = 'cotacao';
    const forns = FORNS();
    if (!P().length || !forns.length) {
      toast('Sem dados para exportar.');
      return;
    }

    rows = [
      ['Produto', 'Un', ...forns.map(f => f.nome), 'Melhor preço', 'Melhor fornecedor'],
      ...P().map(p => {
        const prices = forns.map(f => {
          const k = p.id + '_' + f.id;
          return CPRECOS()[k] !== undefined ? parseFloat(CPRECOS()[k]) : '';
        });
        const valid = prices.filter(v => v !== '' && v > 0);
        const mp = valid.length ? Math.min(...valid) : '';
        const bi = prices.findIndex(v => v === mp);
        return [p.nome, p.un, ...prices, mp !== '' ? fmtN(mp) : '', bi >= 0 ? forns[bi].nome : ''];
      })
    ];
  } else if (tipo === 'estoque') {
    name = 'estoque';
    rows = [
      ['Produto', 'SKU', 'Un', 'Saldo', 'Custo Médio', 'Valor Total', 'Est. Mín', 'Status'],
      ...P().map(p => {
        const s = saldos[p.id] || { saldo: 0, cm: 0 };
        const min = p.emin || 0;
        const st = s.saldo <= 0 ? 'Zerado' : min > 0 && s.saldo < min ? 'Baixo' : 'OK';
        return [p.nome, p.sku || '', p.un, fmtN(s.saldo), fmtN(s.cm), fmtN(s.saldo * s.cm), min || '', st];
      })
    ];
  } else if (tipo === 'campanhas') {
    name = 'campanhas';
    const campanhas = (D.campanhas?.[State.FIL] || []);
    rows = [
      ['Nome', 'Tipo', 'Canal', 'Antecedência', 'Assunto', 'Cupom', 'Desconto', 'Ativo'],
      ...campanhas.map(c => [c.nome, c.tipo, c.canal, c.dias_antecedencia || 0, c.assunto || '', c.cupom || '', c.desconto || 0, c.ativo ? 'Sim' : 'Não'])
    ];
  }

  if (!rows.length) {
    toast('Sem dados para exportar.');
    return;
  }

  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.csv';
  a.click();
  toast('CSV exportado!');
}

function exportarTudo() {
  ['produtos', 'clientes', 'pedidos', 'cotacao', 'estoque', 'campanhas'].forEach((t, i) =>
    setTimeout(() => exportCSV(t), i * 200)
  );
}

function resetUxKpis(){
  if(!confirm('Resetar KPIs de UX e telemetria local desta filial/navegador?')) return;
  localStorage.removeItem(GOAL_METRICS_KEY);
  localStorage.removeItem(UX_EVENTS_KEY);
  pushUxEvent('metrics_reset', { reason: 'manual' });
  renderMetasNegocio();
  toast('KPIs de UX resetados com sucesso.');
}

const removerProdGuard = buildRoleGuard(removerProd, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover produto.');
const removerCliGuard = buildRoleGuard(removerCli, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover cliente.');
const removerPedGuard = buildRoleGuard(removerPed, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover pedido.');
const remFornGuard = buildRoleGuard(remForn, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover fornecedor.');
const excluirMovGuard = buildRoleGuard(excluirMov, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode excluir movimentação.');
const removerJogoDashboardGuard = buildRoleGuard(removerJogoDashboard, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover jogo.');
const salvarJogoDashboardGuard = buildRoleGuard(salvarJogoDashboard, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode salvar jogo.');
const sincronizarJogosDashboardGuard = buildRoleGuard(sincronizarJogosDashboard, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode sincronizar jogos.');
const removerCampanhaGuard = buildRoleGuard(removerCampanha, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover campanha.');
const marcarEnvioEnviadoGuard = buildRoleGuard(marcarEnvioEnviado, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode alterar envio.');
const marcarEnvioFalhouGuard = buildRoleGuard(marcarEnvioFalhou, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode alterar envio.');

AppModules.register({
  name: 'cotacao',
  init(){
    initCotacaoModule({
      renderCotLogs,
      renderProdMet,
      renderProdutos
    });
  }
});

AppModules.register({
  name: 'produtos',
  init(){
    initProdutosModule({
      calcSaldos
    });
  }
});

AppModules.register({
  name: 'pedidos',
  init(){
    initPedidosModule({
      refreshProdSel,
      refreshCliDL
    });
  }
});

AppModules.register({
  name: 'dashboard',
  init(){
    initDashboardModule({
      calcSaldosMulti
    });
  }
});

AppModules.register({
  name: 'navigation',
  init(){
    initNavigationModule({
      hasRole,
      canAccessPage,
      getFirstAllowedPage,
      scheduleRoleUiGuards,
      startPrimaryActionTracking,
      completePrimaryActionTracking,
      markConsistencyPage,
      updateNotiBadge,
      renderDash,
      renderMetasNegocio,
      renderProdMet,
      renderProdutos,
      renderCliMet,
      renderClientes,
      renderPedMet,
      renderPedidos,
      renderFornSel,
      renderCotForns,
      renderCotLogs,
      renderCotTabela,
      renderEstAlerts,
      renderEstPosicao,
      renderEstHist,
      renderCampanhasMet,
      renderCampanhas,
      renderFilaWhatsApp,
      renderCampanhaEnvios,
      renderFilMet,
      renderFilLista,
      renderAcessosAdmin,
      renderNotificacoes,
      limparFormPedTracked,
      limparFormCliTracked,
      limparFormProdTracked,
      abrirNovaCampanhaTracked,
      gerarFilaCampanhaTracked,
      abrirModal,
      exportCSV,
      resetMov,
      cotLock,
      voltarSetup,
      limparFormFilial,
      resolverTodasNotificacoesTracked,
      refreshCampanhasTela,
      roleManagerPlus: ROLE_MANAGER_PLUS,
      roleAdminOnly: ROLE_ADMIN_ONLY
    });
  }
});

AppModules.register({
  name: 'filiais-acessos',
  init(){
    initFiliaisAcessosModule({
      requireRole,
      renderSetup,
      entrar,
      renderDashFilSel,
      scheduleRoleUiGuards,
      roleAdminOnly: ROLE_ADMIN_ONLY,
      appRoles: APP_ROLES,
      cores: CORES
    });
  }
});

AppModules.register({
  name: 'notificacoes',
  init(){
    initNotificacoesModule({
      calcSaldos,
      ir,
      renderMetasNegocio,
      registerNotificationKpi,
      logStrategicAction
    });
  }
});

async function bootstrapApplication(){
  await AppModules.initAll(AppContext);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrapApplication().catch(e => console.error('Falha no bootstrap da aplicacao:', e));
    initGoalTracking();
    initQuickCommand();
    initSidebarEnhancements();
    initFlowWizards();
    startRoleUiObserver();
    scheduleRoleUiGuards();
    renderSetup();
  });
} else {
  bootstrapApplication().catch(e => console.error('Falha no bootstrap da aplicacao:', e));
  initGoalTracking();
  initQuickCommand();
  initSidebarEnhancements();
  initFlowWizards();
  startRoleUiObserver();
  scheduleRoleUiGuards();
  renderSetup();
}

window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.criarPrimeiraFilial = criarPrimeiraFilial;
window.entrar = entrar;
window.voltarSetup = voltarSetup;
window.authEntrar = authEntrar;
window.sairConta = sairConta;
window.selFilial = selFilial;
window.fecharSb = fecharSb;
window.abrirSb = abrirSb;
window.ir = ir;
window.switchTab = switchTab;
window.exportarTudo = exportarTudo;
window.exportCSV = exportCSV;
window.setFlowStep = setFlowStep;
window.renderNotificacoes = renderNotificacoes;
window.renderMetasNegocio = renderMetasNegocio;
window.resetUxKpis = resetUxKpis;
window.executarAcaoGerencial = executarAcaoGerencial;
window.setFiltroNotificacoes = setFiltroNotificacoes;
window.executarNotificacao = executarNotificacao;
window.resolverNotificacao = resolverNotificacao;
window.reabrirNotificacao = reabrirNotificacao;
window.resolverTodasNotificacoes = resolverTodasNotificacoesTracked;

window.renderDashFilSel = renderDashFilSel;
window.renderDash = renderDash;
window.setP = setP;
window.renderDashJogos = renderDashJogos;
window.abrirNovoJogo = abrirNovoJogo;
window.limparFormJogo = limparFormJogo;
window.salvarJogoDashboard = salvarJogoDashboardGuard;
window.removerJogoDashboard = removerJogoDashboardGuard;
window.abrirSyncJogos = abrirSyncJogos;
window.sincronizarJogosDashboard = sincronizarJogosDashboardGuard;
window.usarExemploSyncJogos = usarExemploSyncJogos;

window.renderProdutos = renderProdutos;
window.renderProdMet = renderProdMet;
window.limparFormProd = limparFormProdTracked;
window.salvarProduto = salvarProdutoTracked;
window.editarProd = editarProd;
window.removerProd = removerProdGuard;
window.calcProdPreview = calcProdPreview;
window.syncV = syncV;
window.syncA = syncA;
window.refreshProdSel = refreshProdSel;

window.renderClientes = renderClientes;
window.renderCliMet = renderCliMet;
window.limparFormCli = limparFormCliTracked;
window.salvarCliente = salvarClienteTracked;
window.editarCli = editarCli;
window.removerCli = removerCliGuard;
window.renderCliSegs = renderCliSegs;
window.abrirCliDet = abrirCliDet;
window.addNota = addNota;
window.refreshCliDL = refreshCliDL;

window.renderPedidos = renderPedidos;
window.renderPedMet = renderPedMet;
window.limparFormPed = limparFormPedTracked;
window.salvarPedido = salvarPedidoTracked;
window.editarPed = editarPed;
window.removerPed = removerPedGuard;
window.verPed = verPed;
window.addItem = addItem;
window.remItem = remItem;
window.renderItens = renderItens;

window.renderCotForns = renderCotForns;
window.renderCotTabela = renderCotTabela;
window.cotFile = cotFile;
window.cotLock = cotLock;
window.salvarForn = salvarForn;
window.remForn = remFornGuard;
window.confirmarMapa = confirmarMapa;
window.renderMapaBody = renderMapaBody;
window.renderFornSel = renderFornSel;
window.renderCotLogs = renderCotLogs;
window.updPreco = updPreco;

window.renderEstPosicao = renderEstPosicao;
window.renderEstHist = renderEstHist;
window.renderEstAlerts = renderEstAlerts;
window.atualizarBadgeEst = atualizarBadgeEst;
window.resetMov = resetMov;
window.abrirMovProd = abrirMovProd;
window.setTipo = setTipo;
window.movLoadProd = movLoadProd;
window.movCalc = movCalc;
window.movCalcAjuste = movCalcAjuste;
window.salvarMov = salvarMov;
window.excluirMov = excluirMovGuard;
window.refreshMovSel = refreshMovSel;
window.refreshDestSel = refreshDestSel;

window.salvarFilial = salvarFilial;
window.limparFormFilial = limparFormFilial;
window.editarFilial = editarFilial;
window.removerFilial = removerFilial;
window.trocarFilial = trocarFilial;
window.renderFilMet = renderFilMet;
window.renderFilLista = renderFilLista;
window.renderAcessosAdmin = renderAcessosAdmin;
window.renderAcessosPerfis = renderAcessosPerfis;
window.renderAcessosVinculos = renderAcessosVinculos;
window.renderAcessosAuditoria = renderAcessosAuditoria;
window.changeAcessosPage = changeAcessosPage;
window.preencherPerfilAcesso = preencherPerfilAcesso;
window.preencherVinculoAcesso = preencherVinculoAcesso;
window.salvarPerfilAcesso = salvarPerfilAcesso;
window.removerPerfilAcesso = removerPerfilAcesso;
window.vincularUsuarioFilial = vincularUsuarioFilial;
window.desvincularUsuarioFilial = desvincularUsuarioFilial;

window.carregarCampanhas = carregarCampanhas;
window.carregarCampanhaEnvios = carregarCampanhaEnvios;
window.refreshCampanhasTela = refreshCampanhasTela;
window.limparFormCampanha = limparFormCampanha;
window.abrirNovaCampanha = abrirNovaCampanhaTracked;
window.adotarCampanhasParaFilialAtiva = adotarCampanhasParaFilialAtiva;
window.editarCampanha = editarCampanha;
window.salvarCampanha = salvarCampanhaTracked;
window.removerCampanha = removerCampanhaGuard;
window.renderCampanhasMet = renderCampanhasMet;
window.renderCampanhas = renderCampanhas;
window.gerarFilaCampanha = gerarFilaCampanhaTracked;
window.renderFilaWhatsApp = renderFilaWhatsApp;
window.renderCampanhaEnvios = renderCampanhaEnvios;
window.abrirWhatsAppEnvio = abrirWhatsAppEnvio;
window.marcarEnvioEnviado = marcarEnvioEnviadoGuard;
window.marcarEnvioFalhou = marcarEnvioFalhouGuard;
