// @ts-check

import { D, State } from '../app/store.js';
import { norm, toast } from '../shared/utils.js';
import { markInvalidation, markRender } from '../shared/render-metrics.js';
import {
  getClientesReactBridgeState,
  isClientesReactFeatureEnabled,
  isClientesReactPilotActive,
  isClientesReactPilotRequested,
  forceClientesReactMode,
  syncClientesReactBridge
} from './clientes-react-bridge.js';

/** @typedef {import('../types/domain').NavigationModuleDeps} NavigationModuleDeps */
/** @typedef {import('../types/domain').NavigationPageMeta} NavigationPageMeta */
/** @typedef {import('../types/domain').NavigationPageAction} NavigationPageAction */

const IS_E2E_UI_CORE = window.__SC_E2E_MODE__ === true || window.__SC_E2E_UI_CORE__ === true;
const MOBILE_MENU_FAB_POS_KEY = 'sc_mobile_menu_fab_pos_v1';
const MOBILE_MENU_FAB_IDLE_MS = 1600;
const THEME_KEY = 'sc_theme_v1';
const NAV_FAVORITES_KEY = 'sc_nav_favorites_v1';
const SEARCH_RESULT_LIMIT = 5;

/** @type {readonly ('auto'|'light'|'dark')[]} */
const THEME_CYCLE = /** @type {const} */ (['auto', 'light', 'dark']);

const THEME_LABELS = { auto: 'Auto', light: 'Claro', dark: 'Escuro' };

function getFavoriteStorageKey() {
  const userId = State.user?.id || State.user?.email || 'anon';
  return `${NAV_FAVORITES_KEY}:${userId}`;
}

function readFavoritePages() {
  try {
    const raw = JSON.parse(localStorage.getItem(getFavoriteStorageKey()) || '[]');
    return Array.isArray(raw) ? raw.filter((page) => typeof page === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavoritePages(pages) {
  localStorage.setItem(getFavoriteStorageKey(), JSON.stringify(Array.from(new Set(pages))));
}

function getBaseNavButtons() {
  return Array.from(document.querySelectorAll('.sb-group:not(.sb-group--favorites) .ni')).filter(
    (el) => el instanceof HTMLButtonElement
  );
}

function getNavPageLabel(page) {
  const btn = getBaseNavButtons().find((item) => item.dataset.p === page);
  return btn?.dataset.label || btn?.textContent?.trim() || page;
}

function isFavoritePage(page) {
  return readFavoritePages().includes(page);
}

function renderFavoriteNav(query = '') {
  const group = document.getElementById('sb-favorites-group');
  const slot = document.getElementById('sb-favorites');
  if (!group || !slot) return;

  const favorites = readFavoritePages()
    .filter((page) => deps.canAccessPage(page))
    .map((page) => ({ page, label: getNavPageLabel(page) }))
    .filter((item) => !query || norm(item.label).includes(query));

  group.classList.toggle('is-hidden', favorites.length === 0);
  group.hidden = favorites.length === 0;

  if (!favorites.length) {
    slot.innerHTML = '';
    return;
  }

  slot.innerHTML = favorites
    .map(
      ({ page, label }) => `
        <button class="ni ni-favorite" type="button" data-p="${page}" data-label="${label}">
          <span class="ni-favorite-star" aria-hidden="true">&#9733;</span>${label}
        </button>
      `
    )
    .join('');

  Array.from(slot.querySelectorAll('.ni')).forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.onclick = () => ir(btn.dataset.p || 'dashboard');
    btn.classList.toggle('on', btn.dataset.p === pageAtual());
  });
}

function renderSearchResults(raw = '') {
  const host = document.getElementById('sb-search-results');
  if (!host) return;

  const query = norm(raw || '');
  if (!query) {
    host.innerHTML = '';
    host.classList.add('is-hidden');
    return;
  }

  const matches = getBaseNavButtons()
    .map((btn) => ({
      page: btn.dataset.p || '',
      label: btn.dataset.label || btn.textContent?.trim() || ''
    }))
    .filter((item) => item.page && norm(item.label).includes(query))
    .slice(0, SEARCH_RESULT_LIMIT);

  if (!matches.length) {
    host.innerHTML = `
      <div class="sb-search-empty">
        Nenhuma tela encontrada. Use Ctrl+K para buscar ações rápidas.
      </div>
    `;
    host.classList.remove('is-hidden');
    return;
  }

  host.innerHTML = `
    <div class="sb-search-title">Ir direto para</div>
    <div class="sb-search-list">
      ${matches
        .map(
          (item, index) => `
            <button
              class="sb-search-result${index === 0 ? ' is-primary' : ''}"
              type="button"
              data-page="${item.page}"
            >
              <span>${item.label}</span>
              <span class="sb-search-result-hint">${index === 0 ? 'Enter' : 'Abrir'}</span>
            </button>
          `
        )
        .join('')}
    </div>
  `;
  host.classList.remove('is-hidden');

  Array.from(host.querySelectorAll('[data-page]')).forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.onclick = () => ir(btn.dataset.page || 'dashboard');
  });
}

function getBestSidebarSearchMatch() {
  const explicit = document.querySelector('#sb-search-results [data-page]');
  if (explicit instanceof HTMLButtonElement) return explicit.dataset.page || null;

  const visible = Array.from(document.querySelectorAll('.sb-nav .ni')).find((item) => {
    if (!(item instanceof HTMLButtonElement)) return false;
    return !item.hidden && item.style.display !== 'none';
  });
  return visible instanceof HTMLButtonElement ? visible.dataset.p || null : null;
}

function syncFavoriteButton(page) {
  const btn = document.getElementById('app-act-favorite');
  if (!(btn instanceof HTMLButtonElement)) return;
  const active = isFavoritePage(page);
  btn.textContent = active ? 'Desfixar' : 'Fixar';
  btn.classList.toggle('btn-gh', active);
  btn.title = active ? 'Remover dos favoritos' : 'Salvar esta tela nos favoritos';
  btn.onclick = () => toggleCurrentPageFavorite();
}

/**
 * Lê o tema salvo no localStorage.
 * @returns {'auto'|'light'|'dark'}
 */
function getStoredTheme() {
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  return 'auto';
}

/**
 * Aplica o tema no HTML e atualiza o botão.
 * @param {'auto'|'light'|'dark'} theme
 */
function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'auto') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', theme);
  }
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById('sb-theme-toggle');
  if (btn) btn.textContent = THEME_LABELS[theme] || 'Auto';
}

export function initTheme() {
  applyTheme(getStoredTheme());
  const btn = document.getElementById('sb-theme-toggle');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', () => {
    const current = getStoredTheme();
    const idx = THEME_CYCLE.indexOf(current);
    const next = /** @type {'auto'|'light'|'dark'} */ (THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
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
  abrirNovoClienteReact: () => {},
  limparFiltrosClienteReact: () => {},
  abrirListaClienteReact: () => {},
  abrirSegmentosClienteReact: () => {},
  editarClienteReactAtual: () => {},
  exportarClientesReactCsv: () => {},
  abrirResumoClienteReact: () => {},
  abrirAbertasClienteReact: () => {},
  abrirFechadasClienteReact: () => {},
  abrirNotasClienteReact: () => {},
  abrirFidelidadeClienteReact: () => {},
  renderPedMet: () => {},
  renderPedidos: () => {},
  renderContasReceberMet: () => {},
  renderContasReceber: () => {},
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
export function initNavigationModule(nextDeps = {}) {
  deps = {
    ...deps,
    ...nextDeps,
    roleManagerPlus: Array.isArray(nextDeps.roleManagerPlus)
      ? nextDeps.roleManagerPlus
      : deps.roleManagerPlus,
    roleAdminOnly: Array.isArray(nextDeps.roleAdminOnly)
      ? nextDeps.roleAdminOnly
      : deps.roleAdminOnly
  };
}

function getPageRenderers() {
  return {
    dashboard: [deps.renderDash],
    gerencial: [deps.renderMetasNegocio],
    relatorios: [deps.renderRelatorios],
    produtos: [deps.renderProdMet, deps.renderProdutos],
    clientes: isClientesReactFeatureEnabled() ? [] : [deps.renderCliMet, deps.renderClientes],
    pedidos: [deps.renderPedMet, deps.renderPedidos],
    receber: [deps.renderContasReceberMet, deps.renderContasReceber],
    cotacao: [deps.renderFornSel, deps.renderCotForns, deps.renderCotLogs, deps.renderCotTabela],
    estoque: [deps.renderEstAlerts, deps.renderEstPosicao, deps.renderEstHist],
    campanhas: [
      deps.renderCampanhasMet,
      deps.renderCampanhas,
      deps.renderFilaWhatsApp,
      deps.renderCampanhaEnvios
    ],
    filiais: [deps.renderFilMet, deps.renderFilLista],
    acessos: [deps.renderAcessosAdmin],
    notificacoes: [deps.renderNotificacoes]
  };
}

/**
 * @param {string} page
 */
function runPageRender(page) {
  const renderers = getPageRenderers()[page] || [];
  renderers.forEach((render) => {
    if (typeof render === 'function') render();
  });
  markRender(page, 'page');
}

/**
 * @param {string} page
 */
function schedulePageRender(page) {
  pendingPageName = page;
  markInvalidation(page, 'page', 'navigation');
  if (IS_E2E_UI_CORE) {
    runPageRender(page);
    return;
  }
  if (pendingPageRender) return;
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
    kicker: 'Início',
    title: 'Painel do dia',
    sub: 'Prioridades, riscos e pr?ximos passos da opera??o',
    primary: {
      label: 'Novo pedido',
      run: () => {
        deps.limparFormPedTracked();
        deps.abrirModal('modal-pedido');
      }
    },
    secondary: {
      label: 'Novo cliente',
      run: () => {
        if (isClientesReactFeatureEnabled()) {
          forceClientesReactMode();
          deps.abrirNovoClienteReact();
          return;
        }
        deps.limparFormCliTracked();
        deps.abrirModal('modal-cliente');
      }
    },
    tertiary: {
      label: 'Novo produto',
      run: () => {
        deps.limparFormProdTracked();
        deps.abrirModal('modal-produto');
      }
    }
  },
  gerencial: {
    kicker: 'Análises',
    title: 'Análises',
    sub: 'Metas, sinais e desempenho da opera??o',
    primary: { label: 'Atualizar KPIs', run: () => deps.renderMetasNegocio() },
    secondary: { label: 'Auditoria visual', run: () => deps.executarAuditoriaVisual() },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  },
  relatorios: {
    kicker: 'AnÃ¡lises',
    title: 'Relat?rios',
    sub: 'Leituras detalhadas do desempenho comercial',
    primary: { label: 'Atualizar relatório', run: () => deps.renderRelatorios() },
    secondary: { label: 'Ir dashboard', run: () => ir('dashboard') },
    tertiary: { label: 'Ir pedidos', run: () => ir('pedidos') }
  },
  produtos: {
    kicker: 'Cadastros',
    title: 'Produtos',
    sub: 'Catálogo, preços e cadastro',
    primary: {
      label: 'Novo produto',
      run: () => {
        deps.limparFormProdTracked();
        deps.abrirModal('modal-produto');
      }
    },
    secondary: {
      label: 'Exportar CSV',
      run: () => deps.exportCSV('produtos'),
      roles: deps.roleManagerPlus
    },
    tertiary: { label: 'Ir clientes', run: () => ir('clientes') }
  },
  clientes: {
    kicker: 'Cadastros',
    title: 'Clientes',
    sub: 'Base, relacionamento e histórico',
    primary: {
      label: 'Novo cliente',
      run: () => {
        if (isClientesReactFeatureEnabled()) {
          forceClientesReactMode();
          deps.abrirNovoClienteReact();
          return;
        }
        deps.limparFormCliTracked();
        deps.abrirModal('modal-cliente');
      }
    },
    secondary: {
      label: 'Exportar CSV',
      run: () => deps.exportCSV('clientes'),
      roles: deps.roleManagerPlus
    },
    tertiary: { label: 'Ver segmentos', run: () => switchTab('cli', 'segs') }
  },
  pedidos: {
    kicker: 'Vendas',
    title: 'Pedidos',
    sub: 'Orçamentos, vendas e acompanhamento',
    primary: {
      label: 'Novo pedido',
      run: () => {
        deps.limparFormPedTracked();
        deps.abrirModal('modal-pedido');
      }
    },
    secondary: {
      label: 'Exportar CSV',
      run: () => deps.exportCSV('pedidos'),
      roles: deps.roleManagerPlus
    },
    tertiary: { label: 'Ir estoque', run: () => ir('estoque') }
  },
  receber: {
    kicker: 'Financeiro',
    title: 'Contas a receber',
    sub: 'Contas a receber e recebimentos',
    primary: { label: 'Ir pedidos', run: () => ir('pedidos') },
    secondary: null,
    tertiary: null
  },
  cotacao: {
    kicker: 'Financeiro',
    title: 'Compras',
    sub: 'Fornecedores, pre?os e negocia??es de compra',
    primary: { label: 'Novo fornecedor', run: () => deps.abrirModal('modal-forn') },
    secondary: {
      label: 'Exportar CSV',
      run: () => deps.exportCSV('cotacao'),
      roles: deps.roleManagerPlus
    },
    tertiary: { label: 'Travar/Destravar', run: () => deps.cotLock() }
  },
  estoque: {
    kicker: 'Estoque',
    title: 'Estoque',
    sub: 'Saldo, alertas e movimenta??es',
    primary: {
      label: 'Nova movimentação',
      run: () => {
        deps.resetMov();
        deps.abrirModal('modal-mov');
      }
    },
    secondary: {
      label: 'Exportar CSV',
      run: () => deps.exportCSV('estoque'),
      roles: deps.roleManagerPlus
    },
    tertiary: { label: 'Ir produtos', run: () => ir('produtos') }
  },
  campanhas: {
    kicker: 'Marketing',
    title: 'Campanhas',
    sub: 'Ações, públicos e envios',
    primary: {
      label: 'Nova campanha',
      run: () => deps.abrirNovaCampanhaTracked(),
      roles: deps.roleManagerPlus
    },
    secondary: { label: 'Atualizar tela', run: () => deps.refreshCampanhasTela() },
    tertiary: {
      label: 'Exportar CSV',
      run: () => deps.exportCSV('campanhas'),
      roles: deps.roleManagerPlus
    }
  },
  filiais: {
    kicker: 'Administração',
    title: 'Filiais',
    sub: 'Unidades, contexto e operação ativa',
    primary: {
      label: 'Nova filial',
      run: () => {
        deps.limparFormFilial();
        deps.abrirModal('modal-filial');
      },
      roles: deps.roleAdminOnly
    },
    secondary: { label: 'Voltar setup', run: () => deps.voltarSetup() },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  },
  acessos: {
    kicker: 'Administração',
    title: 'Acessos',
    sub: 'Perfis, usu?rios e permiss?es',
    primary: {
      label: 'Atualizar',
      run: () => deps.renderAcessosAdmin(),
      roles: deps.roleAdminOnly
    },
    secondary: { label: 'Ir filiais', run: () => ir('filiais'), roles: deps.roleAdminOnly },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  },
  notificacoes: {
    kicker: 'Marketing',
    title: 'Notificações',
    sub: 'Críticos, atenção e oportunidade',
    primary: { label: 'Resolver todas', run: () => deps.resolverTodasNotificacoesTracked() },
    secondary: { label: 'Atualizar', run: () => deps.renderNotificacoes() },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  }
};

PAGE_META.relatorios.kicker = 'An\u00e1lises';
PAGE_META.cotacao.kicker = 'Financeiro';
PAGE_META.cotacao.title = 'Compras';
PAGE_META.cotacao.sub = 'Fornecedores, pre\u00e7os e negocia\u00e7\u00f5es de compra';
PAGE_META.estoque.kicker = 'Estoque';
PAGE_META.notificacoes.kicker = 'Marketing';
PAGE_META.notificacoes.title = 'Alertas e pend\u00eancias';
PAGE_META.notificacoes.sub = 'Pend\u00eancias, aten\u00e7\u00e3o e oportunidades para agir';

export function pageAtual() {
  const on = document.querySelector('.pg.on');
  if (!on?.id) return 'dashboard';
  return String(on.id).replace(/^pg-/, '') || 'dashboard';
}

/**
 * @param {string} id
 */
function scrollToCampSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function getContextualPageMeta(page) {
  const base = PAGE_META[page] || PAGE_META.dashboard;
  const meta = {
    ...base,
    primary: base.primary ? { ...base.primary } : null,
    secondary: base.secondary ? { ...base.secondary } : null,
    tertiary: base.tertiary ? { ...base.tertiary } : null
  };

  if (page === 'clientes') {
    const segTabAtiva = !!document.getElementById('cli-tc-segs')?.classList.contains('on');
    const reactState = getClientesReactBridgeState();
    const reactAtivo = isClientesReactPilotActive() || isClientesReactPilotRequested();

    if (reactAtivo) {
      meta.primary = { label: 'Novo cliente', run: () => deps.abrirNovoClienteReact() };

      if (reactState.view === 'detail') {
        meta.secondary = {
          label: reactState.detailTab === 'abertas' ? 'Pedidos fechados' : 'Pedidos abertos',
          run: () =>
            reactState.detailTab === 'abertas'
              ? deps.abrirFechadasClienteReact()
              : deps.abrirAbertasClienteReact()
        };
        meta.tertiary = { label: 'Voltar lista', run: () => deps.abrirListaClienteReact() };
      } else if (reactState.view === 'form') {
        meta.secondary = {
          label: 'Voltar lista',
          run: () => deps.abrirListaClienteReact()
        };
        meta.tertiary = {
          label: 'Exportar CSV',
          run: () => deps.exportarClientesReactCsv(),
          roles: deps.roleManagerPlus
        };
      } else {
        meta.secondary = {
          label: 'Exportar CSV',
          run: () => deps.exportarClientesReactCsv(),
          roles: deps.roleManagerPlus
        };
        meta.tertiary =
          reactState.surfaceTab === 'segmentos'
            ? { label: 'Voltar lista', run: () => deps.abrirListaClienteReact() }
            : reactState.filtersActive > 0
              ? { label: 'Limpar filtros', run: () => deps.limparFiltrosClienteReact() }
              : { label: 'Ver segmentos', run: () => deps.abrirSegmentosClienteReact() };
      }
    } else {
      meta.tertiary = segTabAtiva
        ? { label: 'Voltar lista', run: () => switchTab('cli', 'lista') }
        : { label: 'Ver segmentos', run: () => switchTab('cli', 'segs') };
    }
  }

  if (page === 'campanhas') {
    const envios = D.campanhaEnvios?.[State.FIL] || [];
    const campanhas = D.campanhas?.[State.FIL] || [];
    const pendentes = envios.filter(
      (e) => e.canal === 'whatsapp_manual' && (e.status === 'manual' || e.status === 'pendente')
    );
    const primeiraAtiva = campanhas.find((c) => c.ativo);

    meta.secondary = pendentes.length
      ? {
          label: `Fila WhatsApp (${pendentes.length})`,
          run: () => scrollToCampSection('camp-wa-fila')
        }
      : { label: 'Atualizar tela', run: () => deps.refreshCampanhasTela() };

    meta.tertiary = primeiraAtiva
      ? {
          label: 'Rodar 1a ativa',
          run: () => deps.gerarFilaCampanhaTracked(primeiraAtiva.id),
          roles: deps.roleManagerPlus
        }
      : {
          label: 'Exportar CSV',
          run: () => deps.exportCSV('campanhas'),
          roles: deps.roleManagerPlus
        };
  }

  return meta;
}

/**
 * @param {string} id
 * @param {NavigationPageAction | null | undefined} action
 */
function bindTopbarAction(id, action) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!action || (action.roles && !deps.hasRole(action.roles))) {
    el.style.display = 'none';
    el.onclick = null;
    return;
  }
  el.style.display = 'inline-flex';
  el.textContent = action.label;
  el.onclick = () => {
    if (id === 'app-act-primary') {
      deps.completePrimaryActionTracking(pageAtual());
    }
    action.run();
  };
}

/**
 * @param {string} page
 */
export function syncTopbar(page) {
  const meta = getContextualPageMeta(page);
  const kicker = document.getElementById('app-kicker');
  const title = document.getElementById('app-title');
  const sub = document.getElementById('app-sub');

  if (kicker) kicker.textContent = meta.kicker;
  if (title) title.textContent = meta.title;
  if (sub) sub.textContent = meta.sub;

  bindTopbarAction('app-act-primary', meta.primary);
  bindTopbarAction('app-act-secondary', meta.secondary);
  bindTopbarAction('app-act-tertiary', meta.tertiary);
  syncFavoriteButton(page);
  renderQuickLinks(meta);
  syncSidebarContext(meta);
}

/**
 * @param {NavigationPageMeta | null | undefined} meta
 */
export function syncSidebarContext(meta) {
  const kicker = document.getElementById('sb-context-kicker');
  const title = document.getElementById('sb-context-title');
  const sub = document.getElementById('sb-context-sub');
  if (kicker) kicker.textContent = meta?.kicker || 'In?cio';
  if (title) title.textContent = meta?.title || 'Painel do dia';
  if (sub) sub.textContent = meta?.sub || 'Prioridades da opera??o';
}

export function filterSidebarNav(raw = '') {
  const query = norm(raw || '');
  /** @type {HTMLButtonElement[]} */
  const items = Array.from(document.querySelectorAll('.sb-nav .ni'));
  /** @type {HTMLElement[]} */
  const groups = Array.from(document.querySelectorAll('.sb-nav .sb-group'));
  let visibleItems = 0;

  items.forEach((item) => {
    const haystack = norm(item.dataset.label || item.textContent || '');
    const match = !query || haystack.includes(query);
    item.hidden = !match;
    if (match && item.style.display !== 'none') visibleItems += 1;
  });

  groups.forEach((group) => {
    const hasVisibleItems = Array.from(
      /** @type {NodeListOf<HTMLButtonElement>} */ (group.querySelectorAll('.ni'))
    ).some((item) => !item.hidden && item.style.display !== 'none');
    group.hidden = !hasVisibleItems;
  });

  const empty = document.getElementById('sb-empty');
  if (empty) empty.style.display = visibleItems ? 'none' : 'block';
  renderFavoriteNav(query);
  renderSearchResults(raw);
}

export function initSidebarEnhancements() {
  /** @type {HTMLInputElement | null} */
  const input = /** @type {HTMLInputElement | null} */ (document.getElementById('sb-search'));
  if (input && !input.dataset.bound) {
    input.dataset.bound = '1';
    /** @type {ReturnType<typeof setTimeout> | null} */
    let sidebarFilterTimer = null;
    input.addEventListener('input', (e) => {
      const value = /** @type {HTMLInputElement} */ (e.target).value;
      if (sidebarFilterTimer) clearTimeout(sidebarFilterTimer);
      sidebarFilterTimer = setTimeout(() => {
        filterSidebarNav(value);
      }, 120);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const nextPage = getBestSidebarSearchMatch();
        if (nextPage) {
          e.preventDefault();
          ir(nextPage);
        }
        return;
      }
      if (e.key === 'Escape') {
        if (sidebarFilterTimer) clearTimeout(sidebarFilterTimer);
        input.value = '';
        filterSidebarNav('');
        input.blur();
      }
    });
  }
  filterSidebarNav(input?.value || '');
  renderFavoriteNav(norm(input?.value || ''));
  const current = pageAtual();
  setActivePageVisibility(current);
  syncSidebarContext(getContextualPageMeta(current));
  syncFavoriteButton(current);
  initMobileMenuFab();
}

function initMobileMenuFab() {
  const fab = document.getElementById('mob-menu-fab');
  if (!fab || fab.dataset.bound) return;
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

  function isMobileViewport() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function clampPosition(left, top) {
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
  function applyPosition(left, top, persist = true) {
    const next = clampPosition(left, top);
    fab.style.left = `${next.left}px`;
    fab.style.top = `${next.top}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
    if (persist) {
      localStorage.setItem(MOBILE_MENU_FAB_POS_KEY, JSON.stringify(next));
    }
  }

  function clearIdleTimer() {
    if (idleTimer) {
      window.clearTimeout(idleTimer);
      idleTimer = 0;
    }
  }

  function scheduleIdleState() {
    clearIdleTimer();
    fab.classList.remove('is-idle');
    if (!isMobileViewport() || dragging) return;
    idleTimer = window.setTimeout(() => {
      fab.classList.add('is-idle');
    }, MOBILE_MENU_FAB_IDLE_MS);
  }

  function snapToEdge() {
    const rect = fab.getBoundingClientRect();
    const snappedLeft =
      rect.left + rect.width / 2 < window.innerWidth / 2 ? 8 : window.innerWidth - rect.width - 8;
    applyPosition(snappedLeft, rect.top);
  }

  function applyStoredPosition() {
    if (!isMobileViewport()) {
      clearIdleTimer();
      fab.classList.remove('is-idle');
      fab.style.left = '';
      fab.style.top = '';
      fab.style.right = '';
      fab.style.bottom = '';
      return;
    }
    try {
      const raw = localStorage.getItem(MOBILE_MENU_FAB_POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Number.isFinite(parsed?.left) && Number.isFinite(parsed?.top)) {
          applyPosition(parsed.left, parsed.top, false);
          return;
        }
      }
    } catch {
      // ignore invalid persisted position
    }
    fab.style.left = '';
    fab.style.top = '';
    fab.style.right = `${defaultOffset.right}px`;
    fab.style.bottom = `${defaultOffset.bottom}px`;
    scheduleIdleState();
  }

  fab.addEventListener('click', (event) => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
      moved = false;
      return;
    }
    abrirSb();
  });

  fab.addEventListener('pointerdown', (event) => {
    if (!isMobileViewport()) return;
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
    if (!dragging || event.pointerId !== pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (!moved && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
      moved = true;
    }
    if (!moved) return;
    applyPosition(originLeft + deltaX, originTop + deltaY);
  });

  /**
   * @param {PointerEvent} event
   */
  function stopDragging(event) {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    if (fab.hasPointerCapture(pointerId)) {
      fab.releasePointerCapture(pointerId);
    }
    fab.classList.remove('is-dragging');
    pointerId = null;
    if (moved) {
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
export function renderQuickLinks(meta) {
  const el = document.getElementById('quick-links');
  if (!el) return;
  const actions = [meta?.primary, meta?.secondary, meta?.tertiary]
    .filter((a) => a && (!a.roles || deps.hasRole(a.roles)))
    .slice(0, 2);
  el.innerHTML = actions
    .map((a) => `<button class="qk" type="button">${a.label}</button>`)
    .join('');
  Array.from(el.querySelectorAll('.qk')).forEach((btn, idx) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.onclick = actions[idx].run;
  });
}

export function toggleCurrentPageFavorite() {
  const page = pageAtual();
  const favorites = readFavoritePages();
  const next = favorites.includes(page)
    ? favorites.filter((item) => item !== page)
    : [...favorites, page];
  writeFavoritePages(next);
  syncFavoriteButton(page);
  renderFavoriteNav(norm(document.getElementById('sb-search')?.value || ''));
}

/** @type {string} */
let _activePage = '';

function setActivePageVisibility(nextPage) {
  if (_activePage === nextPage) return;

  const prevEl = _activePage ? document.getElementById(`pg-${_activePage}`) : null;
  const nextEl = document.getElementById(`pg-${nextPage}`);

  if (prevEl instanceof HTMLElement) {
    prevEl.classList.remove('on', 'anim-done');
    prevEl.style.removeProperty('display');
  }
  if (nextEl instanceof HTMLElement) {
    nextEl.classList.remove('anim-done');
    nextEl.style.removeProperty('display');
    nextEl.classList.add('on');
    nextEl.addEventListener(
      'animationend',
      () => {
        nextEl.classList.add('anim-done');
      },
      { once: true }
    );
  }

  _activePage = nextPage;
  document.body.dataset.currentPage = nextPage;
}

export function ir(page) {
  document.body.dataset.navState = 'navigating';
  let nextPage = page;
  if (!deps.canAccessPage(nextPage)) {
    toast('Você não tem permissão para acessar esta área.');
    nextPage = deps.getFirstAllowedPage('dashboard');
  }
  fecharSb();

  document.querySelectorAll('.ni').forEach((n) => {
    if (!(n instanceof HTMLButtonElement)) return;
    n.classList.toggle('on', n.dataset.p === nextPage);
  });
  setActivePageVisibility(nextPage);
  if (nextPage === 'clientes' && isClientesReactFeatureEnabled()) {
    forceClientesReactMode();
    syncClientesReactBridge();
  }
  document
    .querySelectorAll('.mob-btn')
    .forEach((b) => b.classList.toggle('on', b.id === 'mob-' + nextPage));

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

export function switchTab(grp, name) {
  const prefix = grp + '-tc-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach((t) => t.classList.remove('on'));
  document.getElementById(prefix + name)?.classList.add('on');

  document.querySelectorAll(`#pg-${grp} .tb`).forEach((b, i) => {
    const ids = Array.from(document.querySelectorAll(`[id^="${prefix}"]`)).map((t) =>
      t.id.replace(prefix, '')
    );
    b.classList.toggle('on', ids[i] === name);
  });

  const atual = pageAtual();
  if (atual === grp) {
    syncTopbar(atual);
  }
}

export function abrirSb() {
  document.getElementById('sb')?.classList.add('on');
  document.getElementById('sb-overlay')?.classList.add('on');
  const close = document.getElementById('sb-close');
  if (close instanceof HTMLElement) close.hidden = false;
  document.getElementById('sb-search')?.focus();
}

export function fecharSb() {
  document.getElementById('sb')?.classList.remove('on');
  document.getElementById('sb-overlay')?.classList.remove('on');
  const close = document.getElementById('sb-close');
  if (close instanceof HTMLElement) close.hidden = true;
}
