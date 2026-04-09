// @ts-check

import { D, State } from '../app/store.js';
import { norm, toast } from '../shared/utils.js';
import { markInvalidation, markRender } from '../shared/render-metrics.js';

/** @typedef {import('../types/domain').NavigationModuleDeps} NavigationModuleDeps */
/** @typedef {import('../types/domain').NavigationPageMeta} NavigationPageMeta */
/** @typedef {import('../types/domain').NavigationPageAction} NavigationPageAction */

const IS_E2E_UI_CORE = window.__SC_E2E_MODE__ === true || window.__SC_E2E_UI_CORE__ === true;
const MOBILE_MENU_FAB_POS_KEY = 'sc_mobile_menu_fab_pos_v1';
const MOBILE_MENU_FAB_IDLE_MS = 1600;
const THEME_KEY = 'sc_theme_v1';

/** @type {'auto'|'light'|'dark'} */
const THEME_CYCLE = /** @type {const} */ (['auto', 'light', 'dark']);

const THEME_LABELS = { auto: 'Auto', light: 'Claro', dark: 'Escuro' };

/**
 * Lê o tema salvo no localStorage.
 * @returns {'auto'|'light'|'dark'}
 */
function getStoredTheme(){
  const raw = localStorage.getItem(THEME_KEY);
  if(raw === 'light' || raw === 'dark') return raw;
  return 'auto';
}

/**
 * Aplica o tema no HTML e atualiza o botão.
 * @param {'auto'|'light'|'dark'} theme
 */
function applyTheme(theme){
  const html = document.documentElement;
  if(theme === 'auto'){
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', theme);
  }
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById('sb-theme-toggle');
  if(btn) btn.textContent = THEME_LABELS[theme] || 'Auto';
}

export function initTheme(){
  applyTheme(getStoredTheme());
  const btn = document.getElementById('sb-theme-toggle');
  if(!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', () => {
    const current = getStoredTheme();
    const idx = THEME_CYCLE.indexOf(current);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    applyTheme(next);
  });
}

/** @type {Required<NavigationModuleDeps>} */
let deps = {
  hasRole: () => true,
  canAccessPage: () => true,
  getFirstAllowedPage: () => 'dashboard',
  scheduleRoleUiGuards: () => {},
  startPrimaryActionTracking: () => {},
  completePrimaryActionTracking: () => {},
  markConsistencyPage: () => {},
  updateNotiBadge: () => {},
  renderDash: () => {},
  renderMetasNegocio: () => {},
  renderRelatorios: () => {},
  renderProdMet: () => {},
  renderProdutos: () => {},
  renderCliMet: () => {},
  renderClientes: () => {},
  renderPedMet: () => {},
  renderPedidos: () => {},
  renderFornSel: () => {},
  renderCotForns: () => {},
  renderCotLogs: () => {},
  renderCotTabela: () => {},
  renderEstAlerts: () => {},
  renderEstPosicao: () => {},
  renderEstHist: () => {},
  renderCampanhasMet: () => {},
  renderCampanhas: () => {},
  renderFilaWhatsApp: () => {},
  renderCampanhaEnvios: () => {},
  renderFilMet: () => {},
  renderFilLista: () => {},
  renderAcessosAdmin: () => {},
  renderNotificacoes: () => {},
  limparFormPedTracked: () => {},
  limparFormCliTracked: () => {},
  limparFormProdTracked: () => {},
  abrirNovaCampanhaTracked: () => {},
  gerarFilaCampanhaTracked: () => {},
  abrirModal: () => {},
  exportCSV: () => {},
  resetMov: () => {},
  cotLock: () => {},
  voltarSetup: () => {},
  limparFormFilial: () => {},
  resolverTodasNotificacoesTracked: () => {},
  refreshCampanhasTela: () => {},
  executarAuditoriaVisual: () => {},
  roleManagerPlus: ['admin', 'gerente'],
  roleAdminOnly: ['admin']
};
let pendingPageRender = 0;
let pendingPageName = '';

/**
 * @param {NavigationModuleDeps} [nextDeps]
 */
export function initNavigationModule(nextDeps = {}){
  deps = {
    ...deps,
    ...nextDeps,
    roleManagerPlus: Array.isArray(nextDeps.roleManagerPlus) ? nextDeps.roleManagerPlus : deps.roleManagerPlus,
    roleAdminOnly: Array.isArray(nextDeps.roleAdminOnly) ? nextDeps.roleAdminOnly : deps.roleAdminOnly
  };
}

function getPageRenderers(){
  return {
    dashboard: [deps.renderDash],
    gerencial: [deps.renderMetasNegocio],
    relatorios: [deps.renderRelatorios],
    produtos: [deps.renderProdMet, deps.renderProdutos],
    clientes: [deps.renderCliMet, deps.renderClientes],
    pedidos: [deps.renderPedMet, deps.renderPedidos],
    cotacao: [deps.renderFornSel, deps.renderCotForns, deps.renderCotLogs, deps.renderCotTabela],
    estoque: [deps.renderEstAlerts, deps.renderEstPosicao, deps.renderEstHist],
    campanhas: [deps.renderCampanhasMet, deps.renderCampanhas, deps.renderFilaWhatsApp, deps.renderCampanhaEnvios],
    filiais: [deps.renderFilMet, deps.renderFilLista],
    acessos: [deps.renderAcessosAdmin],
    notificacoes: [deps.renderNotificacoes]
  };
}

/**
 * @param {string} page
 */
function runPageRender(page){
  const renderers = getPageRenderers()[page] || [];
  renderers.forEach(render => {
    if(typeof render === 'function') render();
  });
  markRender(page, 'page');
}

/**
 * @param {string} page
 */
function schedulePageRender(page){
  pendingPageName = page;
  markInvalidation(page, 'page', 'navigation');
  if(IS_E2E_UI_CORE){
    runPageRender(page);
    return;
  }
  if(pendingPageRender) return;
  pendingPageRender = window.requestAnimationFrame(() => {
    const pageToRender = pendingPageName;
    pendingPageRender = 0;
    pendingPageName = '';
    runPageRender(pageToRender);
  });
}

/** @type {Record<string, NavigationPageMeta>} */
const PAGE_META = {
  dashboard: {
    kicker: 'Resumo',
    title: 'Dashboard',
    sub: 'Visão geral da filial',
    primary: { label: 'Novo pedido', run: () => { deps.limparFormPedTracked(); deps.abrirModal('modal-pedido'); } },
    secondary: { label: 'Novo cliente', run: () => { deps.limparFormCliTracked(); deps.abrirModal('modal-cliente'); } },
    tertiary: { label: 'Novo produto', run: () => { deps.limparFormProdTracked(); deps.abrirModal('modal-produto'); } }
  },
  gerencial: {
    kicker: 'Indicadores',
    title: 'Gerencial',
    sub: 'Metas e desempenho',
    primary: { label: 'Atualizar KPIs', run: () => deps.renderMetasNegocio() },
    secondary: { label: 'Auditoria visual', run: () => deps.executarAuditoriaVisual() },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  },
  relatorios: {
    kicker: 'Analitico',
    title: 'Relatórios',
    sub: 'Oportunidades por jogos e conversão comercial',
    primary: { label: 'Atualizar relatório', run: () => deps.renderRelatorios() },
    secondary: { label: 'Ir dashboard', run: () => ir('dashboard') },
    tertiary: { label: 'Ir pedidos', run: () => ir('pedidos') }
  },
  produtos: {
    kicker: 'Cadastros',
    title: 'Produtos',
    sub: 'Catalogo e precos',
    primary: { label: 'Novo produto', run: () => { deps.limparFormProdTracked(); deps.abrirModal('modal-produto'); } },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('produtos'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Ir clientes', run: () => ir('clientes') }
  },
  clientes: {
    kicker: 'Cadastros',
    title: 'Clientes',
    sub: 'Relacionamento e segmentos',
    primary: { label: 'Novo cliente', run: () => { deps.limparFormCliTracked(); deps.abrirModal('modal-cliente'); } },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('clientes'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Ver segmentos', run: () => switchTab('cli', 'segs') }
  },
  pedidos: {
    kicker: 'Vendas',
    title: 'Pedidos',
    sub: 'Orcamentos e vendas',
    primary: { label: 'Novo pedido', run: () => { deps.limparFormPedTracked(); deps.abrirModal('modal-pedido'); } },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('pedidos'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Ir estoque', run: () => ir('estoque') }
  },
  cotacao: {
    kicker: 'Compras',
    title: 'Cotação',
    sub: 'Fornecedores e precos',
    primary: { label: 'Novo fornecedor', run: () => deps.abrirModal('modal-forn') },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('cotacao'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Travar/Destravar', run: () => deps.cotLock() }
  },
  estoque: {
    kicker: 'Operação',
    title: 'Estoque',
    sub: 'Saldo e movimentações',
    primary: { label: 'Nova movimentação', run: () => { deps.resetMov(); deps.abrirModal('modal-mov'); } },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('estoque'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Ir produtos', run: () => ir('produtos') }
  },
  campanhas: {
    kicker: 'Marketing',
    title: 'Campanhas',
    sub: 'Acoes e envios',
    primary: { label: 'Nova campanha', run: () => deps.abrirNovaCampanhaTracked(), roles: deps.roleManagerPlus },
    secondary: { label: 'Atualizar tela', run: () => deps.refreshCampanhasTela() },
    tertiary: { label: 'Exportar CSV', run: () => deps.exportCSV('campanhas'), roles: deps.roleManagerPlus }
  },
  filiais: {
    kicker: 'Sistema',
    title: 'Filiais',
    sub: 'Unidades e contexto',
    primary: { label: 'Nova filial', run: () => { deps.limparFormFilial(); deps.abrirModal('modal-filial'); }, roles: deps.roleAdminOnly },
    secondary: { label: 'Voltar setup', run: () => deps.voltarSetup() },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  },
  acessos: {
    kicker: 'Sistema',
    title: 'Acessos',
    sub: 'Perfis e permissões',
    primary: { label: 'Atualizar', run: () => deps.renderAcessosAdmin(), roles: deps.roleAdminOnly },
    secondary: { label: 'Ir filiais', run: () => ir('filiais'), roles: deps.roleAdminOnly },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  },
  notificacoes: {
    kicker: 'Alertas',
    title: 'Notificações',
    sub: 'Críticos, atenção e oportunidade',
    primary: { label: 'Resolver todas', run: () => deps.resolverTodasNotificacoesTracked() },
    secondary: { label: 'Atualizar', run: () => deps.renderNotificacoes() },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  }
};

export function pageAtual(){
  const on = document.querySelector('.pg.on');
  if(!on?.id) return 'dashboard';
  return String(on.id).replace(/^pg-/, '') || 'dashboard';
}

/**
 * @param {string} id
 */
function scrollToCampSection(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function getContextualPageMeta(page){
  const base = PAGE_META[page] || PAGE_META.dashboard;
  const meta = {
    ...base,
    primary: base.primary ? { ...base.primary } : null,
    secondary: base.secondary ? { ...base.secondary } : null,
    tertiary: base.tertiary ? { ...base.tertiary } : null
  };

  if(page === 'clientes'){
    const segTabAtiva = !!document.getElementById('cli-tc-segs')?.classList.contains('on');
    meta.tertiary = segTabAtiva
      ? { label: 'Voltar lista', run: () => switchTab('cli', 'lista') }
      : { label: 'Ver segmentos', run: () => switchTab('cli', 'segs') };
  }

  if(page === 'campanhas'){
    const envios = D.campanhaEnvios?.[State.FIL] || [];
    const campanhas = D.campanhas?.[State.FIL] || [];
    const pendentes = envios.filter(e => e.canal === 'whatsapp_manual' && (e.status === 'manual' || e.status === 'pendente'));
    const primeiraAtiva = campanhas.find(c => c.ativo);

    meta.secondary = pendentes.length
      ? { label: `Fila WhatsApp (${pendentes.length})`, run: () => scrollToCampSection('camp-wa-fila') }
      : { label: 'Atualizar tela', run: () => deps.refreshCampanhasTela() };

    meta.tertiary = primeiraAtiva
      ? { label: 'Rodar 1a ativa', run: () => deps.gerarFilaCampanhaTracked(primeiraAtiva.id), roles: deps.roleManagerPlus }
      : { label: 'Exportar CSV', run: () => deps.exportCSV('campanhas'), roles: deps.roleManagerPlus };
  }

  return meta;
}

/**
 * @param {string} id
 * @param {NavigationPageAction | null | undefined} action
 */
function bindTopbarAction(id, action){
  const el = document.getElementById(id);
  if(!el) return;
  if(!action || (action.roles && !deps.hasRole(action.roles))){
    el.style.display = 'none';
    el.onclick = null;
    return;
  }
  el.style.display = 'inline-flex';
  el.textContent = action.label;
  el.onclick = () => {
    if(id === 'app-act-primary'){
      deps.completePrimaryActionTracking(pageAtual());
    }
    action.run();
  };
}

/**
 * @param {string} page
 */
export function syncTopbar(page){
  const meta = getContextualPageMeta(page);
  const kicker = document.getElementById('app-kicker');
  const title = document.getElementById('app-title');
  const sub = document.getElementById('app-sub');

  if(kicker) kicker.textContent = meta.kicker;
  if(title) title.textContent = meta.title;
  if(sub) sub.textContent = meta.sub;

  bindTopbarAction('app-act-primary', meta.primary);
  bindTopbarAction('app-act-secondary', meta.secondary);
  bindTopbarAction('app-act-tertiary', meta.tertiary);
  renderQuickLinks(meta);
  syncSidebarContext(meta);
}

/**
 * @param {NavigationPageMeta | null | undefined} meta
 */
export function syncSidebarContext(meta){
  const kicker = document.getElementById('sb-context-kicker');
  const title = document.getElementById('sb-context-title');
  const sub = document.getElementById('sb-context-sub');
  if(kicker) kicker.textContent = meta?.kicker || 'Resumo';
  if(title) title.textContent = meta?.title || 'Dashboard';
  if(sub) sub.textContent = meta?.sub || 'Visão geral';
}

export function filterSidebarNav(raw = ''){
  const query = norm(raw || '');
  /** @type {HTMLButtonElement[]} */
  const items = Array.from(document.querySelectorAll('.sb-nav .ni'));
  /** @type {HTMLElement[]} */
  const groups = Array.from(document.querySelectorAll('.sb-nav .sb-group'));
  let visibleItems = 0;

  items.forEach(item => {
    const haystack = norm(item.dataset.label || item.textContent || '');
    const match = !query || haystack.includes(query);
    item.hidden = !match;
    if(match && item.style.display !== 'none') visibleItems += 1;
  });

  groups.forEach(group => {
    const hasVisibleItems = Array.from(/** @type {NodeListOf<HTMLButtonElement>} */ (group.querySelectorAll('.ni')))
      .some(item => !item.hidden && item.style.display !== 'none');
    group.hidden = !hasVisibleItems;
  });

  const empty = document.getElementById('sb-empty');
  if(empty) empty.style.display = visibleItems ? 'none' : 'block';
}

export function initSidebarEnhancements(){
  /** @type {HTMLInputElement | null} */
  const input = /** @type {HTMLInputElement | null} */ (document.getElementById('sb-search'));
  if(input && !input.dataset.bound){
    input.dataset.bound = '1';
    input.addEventListener('input', e => filterSidebarNav((/** @type {HTMLInputElement} */ (e.target)).value));
    input.addEventListener('keydown', e => {
      if(e.key === 'Escape'){
        input.value = '';
        filterSidebarNav('');
        input.blur();
      }
    });
  }
  filterSidebarNav(input?.value || '');
  const current = pageAtual();
  setActivePageVisibility(current);
  syncSidebarContext(getContextualPageMeta(current));
  initMobileMenuFab();
}

function initMobileMenuFab(){
  const fab = document.getElementById('mob-menu-fab');
  if(!fab || fab.dataset.bound) return;
  fab.dataset.bound = '1';

  const defaultOffset = { right: 16, bottom: 96 };
  let pointerId = null;
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let idleTimer = 0;

  function isMobileViewport(){
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function clampPosition(left, top){
    const width = fab.offsetWidth || 58;
    const height = fab.offsetHeight || 58;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop)
    };
  }

  /**
   * @param {number} left
   * @param {number} top
   * @param {boolean} [persist]
   */
  function applyPosition(left, top, persist = true){
    const next = clampPosition(left, top);
    fab.style.left = `${next.left}px`;
    fab.style.top = `${next.top}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
    if(persist){
      localStorage.setItem(MOBILE_MENU_FAB_POS_KEY, JSON.stringify(next));
    }
  }

  function clearIdleTimer(){
    if(idleTimer){
      window.clearTimeout(idleTimer);
      idleTimer = 0;
    }
  }

  function scheduleIdleState(){
    clearIdleTimer();
    fab.classList.remove('is-idle');
    if(!isMobileViewport() || dragging) return;
    idleTimer = window.setTimeout(() => {
      fab.classList.add('is-idle');
    }, MOBILE_MENU_FAB_IDLE_MS);
  }

  function snapToEdge(){
    const rect = fab.getBoundingClientRect();
    const snappedLeft = rect.left + rect.width / 2 < window.innerWidth / 2
      ? 8
      : window.innerWidth - rect.width - 8;
    applyPosition(snappedLeft, rect.top);
  }

  function applyStoredPosition(){
    if(!isMobileViewport()){
      clearIdleTimer();
      fab.classList.remove('is-idle');
      fab.style.left = '';
      fab.style.top = '';
      fab.style.right = '';
      fab.style.bottom = '';
      return;
    }
    try{
      const raw = localStorage.getItem(MOBILE_MENU_FAB_POS_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(Number.isFinite(parsed?.left) && Number.isFinite(parsed?.top)){
          applyPosition(parsed.left, parsed.top, false);
          return;
        }
      }
    }catch{
      // ignore invalid persisted position
    }
    fab.style.left = '';
    fab.style.top = '';
    fab.style.right = `${defaultOffset.right}px`;
    fab.style.bottom = `${defaultOffset.bottom}px`;
    scheduleIdleState();
  }

  fab.addEventListener('click', (event) => {
    if(moved){
      event.preventDefault();
      event.stopPropagation();
      moved = false;
      return;
    }
    abrirSb();
  });

  fab.addEventListener('pointerdown', (event) => {
    if(!isMobileViewport()) return;
    clearIdleTimer();
    fab.classList.remove('is-idle');
    pointerId = event.pointerId;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    const rect = fab.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    fab.setPointerCapture(pointerId);
    fab.classList.add('is-dragging');
  });

  fab.addEventListener('pointermove', (event) => {
    if(!dragging || event.pointerId !== pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if(!moved && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)){
      moved = true;
    }
    if(!moved) return;
    applyPosition(originLeft + deltaX, originTop + deltaY);
  });

  /**
   * @param {PointerEvent} event
   */
  function stopDragging(event){
    if(!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    if(fab.hasPointerCapture(pointerId)){
      fab.releasePointerCapture(pointerId);
    }
    fab.classList.remove('is-dragging');
    pointerId = null;
    if(moved){
      snapToEdge();
    }
    scheduleIdleState();
    window.setTimeout(() => {
      moved = false;
    }, 0);
  }

  fab.addEventListener('pointerup', stopDragging);
  fab.addEventListener('pointercancel', stopDragging);
  window.addEventListener('resize', applyStoredPosition);
  applyStoredPosition();
}

/**
 * @param {NavigationPageMeta | null | undefined} meta
 */
export function renderQuickLinks(meta){
  const el = document.getElementById('quick-links');
  if(!el) return;
  const actions = [meta?.primary, meta?.secondary, meta?.tertiary]
    .filter(a => a && (!a.roles || deps.hasRole(a.roles)))
    .slice(0, 2);
  el.innerHTML = actions
    .map(a => `<button class="qk" type="button">${a.label}</button>`)
    .join('');
  Array.from(el.querySelectorAll('.qk')).forEach((btn, idx) => {
    if(!(btn instanceof HTMLButtonElement)) return;
    btn.onclick = actions[idx].run;
  });
}

/** @type {string} */
let _activePage = '';

function setActivePageVisibility(nextPage){
  if(_activePage === nextPage) return;

  const prevEl = _activePage ? document.getElementById(`pg-${_activePage}`) : null;
  const nextEl = document.getElementById(`pg-${nextPage}`);

  if(prevEl instanceof HTMLElement){
    prevEl.classList.remove('on', 'anim-done');
    prevEl.style.display = 'none';
  }
  if(nextEl instanceof HTMLElement){
    nextEl.classList.remove('anim-done');
    nextEl.classList.add('on');
    nextEl.style.display = 'block';
    nextEl.addEventListener('animationend', () => {
      nextEl.classList.add('anim-done');
    }, { once: true });
  }

  _activePage = nextPage;
  document.body.dataset.currentPage = nextPage;
}

export function ir(page){
  document.body.dataset.navState = 'navigating';
  let nextPage = page;
  if(!deps.canAccessPage(nextPage)){
    toast('Você não tem permissão para acessar esta área.');
    nextPage = deps.getFirstAllowedPage('dashboard');
  }
  fecharSb();

  document.querySelectorAll('.ni').forEach(n => {
    if(!(n instanceof HTMLButtonElement)) return;
    n.classList.toggle('on', n.dataset.p === nextPage);
  });
  setActivePageVisibility(nextPage);
  document.querySelectorAll('.mob-btn').forEach(b => b.classList.toggle('on', b.id === 'mob-' + nextPage));

  schedulePageRender(nextPage);
  deps.startPrimaryActionTracking(nextPage);
  deps.markConsistencyPage(nextPage);
  deps.updateNotiBadge();
  syncTopbar(nextPage);
  deps.scheduleRoleUiGuards();
  filterSidebarNav(document.getElementById('sb-search')?.value || '');
  document.body.dataset.navState = 'ready';
  window.scrollTo(0, 0);
}

export function switchTab(grp, name){
  const prefix = grp + '-tc-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(t => t.classList.remove('on'));
  document.getElementById(prefix + name)?.classList.add('on');

  document.querySelectorAll(`#pg-${grp} .tb`).forEach((b, i) => {
    const ids = Array.from(document.querySelectorAll(`[id^="${prefix}"]`)).map(t => t.id.replace(prefix, ''));
    b.classList.toggle('on', ids[i] === name);
  });

  const atual = pageAtual();
  if(atual === grp){
    syncTopbar(atual);
  }
}

export function abrirSb(){
  document.getElementById('sb')?.classList.add('on');
  document.getElementById('sb-overlay')?.classList.add('on');
  const close = document.getElementById('sb-close');
  if(close instanceof HTMLElement) close.hidden = false;
  document.getElementById('sb-search')?.focus();
}

export function fecharSb(){
  document.getElementById('sb')?.classList.remove('on');
  document.getElementById('sb-overlay')?.classList.remove('on');
  const close = document.getElementById('sb-close');
  if(close instanceof HTMLElement) close.hidden = true;
}

