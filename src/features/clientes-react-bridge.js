const STORAGE_KEY = 'sc_clientes_ui_mode';
const MODE_LEGACY = 'legacy';
const MODE_REACT = 'react';
const REACT_CLIENTES_URL = './react.html?embed=clientes';
const FRAME_ID = 'cli-react-frame';
const MESSAGE_SOURCE = 'clientes-react-pilot';
const COMMAND_SOURCE = 'clientes-legacy-shell';
const DEFAULT_FRAME_HEIGHT = 820;
const DEFAULT_BRIDGE_STATE = {
  view: 'list',
  status: 'ready',
  count: 0,
  filtersActive: 0
};

/** @type {{ mount?: (el: HTMLElement) => void | Promise<void>, unmount?: () => void } | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;
let currentBridgeState = { ...DEFAULT_BRIDGE_STATE };

function getMode() {
  return localStorage.getItem(STORAGE_KEY) || MODE_LEGACY;
}

function setMode(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
}

function getToggle() {
  return /** @type {HTMLButtonElement | null} */ (document.getElementById('cli-react-toggle'));
}

function getLegacyShell() {
  return document.getElementById('cli-legacy-shell');
}

function getReactShell() {
  return document.getElementById('cli-react-shell');
}

function getRoot() {
  return /** @type {HTMLElement | null} */ (document.getElementById('cli-react-root'));
}

function getFrame() {
  return /** @type {HTMLIFrameElement | null} */ (document.getElementById(FRAME_ID));
}

function getLegacyControls() {
  return /** @type {HTMLElement | null} */ (document.getElementById('cli-legacy-controls'));
}

function getReactModebar() {
  return /** @type {HTMLElement | null} */ (document.getElementById('cli-react-modebar'));
}

function getExportButton() {
  return /** @type {HTMLButtonElement | null} */ (document.getElementById('cli-export-btn'));
}

function getListaTab() {
  return /** @type {HTMLButtonElement | null} */ (document.getElementById('cli-tab-lista'));
}

function getSegmentosTab() {
  return /** @type {HTMLButtonElement | null} */ (document.getElementById('cli-tab-segs'));
}

function getListaPanel() {
  return /** @type {HTMLElement | null} */ (document.getElementById('cli-tc-lista'));
}

function getSegmentosPanel() {
  return /** @type {HTMLElement | null} */ (document.getElementById('cli-tc-segs'));
}

function getClientesPage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('pg-clientes'));
}

function isClientesPageActive() {
  return getClientesPage()?.classList.contains('on') || false;
}

function updateFrameHeight(nextHeight) {
  const frame = getFrame();
  if (!frame) return;

  const height = Number.isFinite(nextHeight)
    ? Math.max(620, Math.round(nextHeight))
    : DEFAULT_FRAME_HEIGHT;
  frame.style.height = `${height}px`;
}

function toViewLabel(view) {
  return view === 'form' ? 'Formulario' : view === 'detail' ? 'Detalhe' : 'Lista';
}

function toStatusLabel(status) {
  return status === 'deleting' ? 'Removendo' : status === 'error' ? 'Atencao' : 'Pronto';
}

function toStatusTone(status) {
  return status === 'deleting' ? 'ba' : status === 'error' ? 'br' : 'bk';
}

function toFiltersLabel(filtersActive) {
  const count = Number(filtersActive || 0);
  if (!count) return 'Sem filtros';
  return `${count} filtro${count === 1 ? '' : 's'}`;
}

function toFiltersTone(filtersActive) {
  return Number(filtersActive || 0) > 0 ? 'ba' : 'bk';
}

function updateBridgeIndicators() {
  const indicators = [
    ['cli-react-indicator-view', toViewLabel(currentBridgeState.view), 'bb'],
    ['cli-react-shell-view', toViewLabel(currentBridgeState.view), 'bb'],
    [
      'cli-react-indicator-status',
      toStatusLabel(currentBridgeState.status),
      toStatusTone(currentBridgeState.status)
    ],
    [
      'cli-react-shell-status',
      toStatusLabel(currentBridgeState.status),
      toStatusTone(currentBridgeState.status)
    ],
    [
      'cli-react-indicator-count',
      `${currentBridgeState.count || 0} cliente${currentBridgeState.count === 1 ? '' : 's'}`,
      'bg'
    ],
    [
      'cli-react-shell-count',
      `${currentBridgeState.count || 0} cliente${currentBridgeState.count === 1 ? '' : 's'}`,
      'bg'
    ],
    [
      'cli-react-indicator-filters',
      toFiltersLabel(currentBridgeState.filtersActive),
      toFiltersTone(currentBridgeState.filtersActive)
    ],
    [
      'cli-react-shell-filters',
      toFiltersLabel(currentBridgeState.filtersActive),
      toFiltersTone(currentBridgeState.filtersActive)
    ]
  ];

  indicators.forEach(([id, text, tone]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `bdg ${tone}`;
  });

  const modebarTitle = document.getElementById('cli-react-modebar-title');
  if (modebarTitle) {
    modebarTitle.textContent =
      currentBridgeState.view === 'form'
        ? 'Formulario React no fluxo principal'
        : currentBridgeState.view === 'detail'
          ? 'Detalhe React aberto no piloto'
          : 'Lista React em substituição controlada';
  }

  const shellTitle = document.getElementById('cli-react-shell-title');
  if (shellTitle) {
    shellTitle.textContent =
      currentBridgeState.view === 'form'
        ? 'Edicao e cadastro rodando no piloto'
        : currentBridgeState.view === 'detail'
          ? 'Detalhe do cliente em foco'
          : 'Lista em migracao controlada';
  }
}

function syncBridgeState(state) {
  const reactShell = getReactShell();
  const nextState = state && typeof state === 'object' ? state : {};
  currentBridgeState = {
    view: String(nextState.view || 'list'),
    status: String(nextState.status || 'ready'),
    count: Number(nextState.count ?? 0) || 0,
    filtersActive: Number(nextState.filtersActive ?? 0) || 0
  };

  if (reactShell) {
    reactShell.dataset.reactView = currentBridgeState.view;
    reactShell.dataset.reactStatus = currentBridgeState.status;
    reactShell.dataset.reactCount = String(currentBridgeState.count);
    reactShell.dataset.reactFiltersActive = String(currentBridgeState.filtersActive);
  }

  const clearFiltersButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('cli-react-clear-filters')
  );
  if (clearFiltersButton) {
    clearFiltersButton.hidden = currentBridgeState.filtersActive <= 0;
  }

  updateBridgeIndicators();
}

function isReactModeActive() {
  return !!(bridge?.mount && getMode() === MODE_REACT && isClientesPageActive());
}

function postToReactFrame(type, payload = {}) {
  if (!isReactModeActive()) return false;

  const frame = getFrame();
  if (!frame?.contentWindow) return false;

  frame.contentWindow.postMessage(
    {
      source: COMMAND_SOURCE,
      type,
      ...payload
    },
    window.location.origin
  );

  return true;
}

function forceClientesListTab() {
  const listaTab = getListaTab();
  const segTab = getSegmentosTab();
  const listaPanel = getListaPanel();
  const segPanel = getSegmentosPanel();

  listaTab?.classList.add('on');
  segTab?.classList.remove('on');
  listaPanel?.classList.add('on');
  segPanel?.classList.remove('on');
}

function syncShellModeUi(reactActive) {
  const legacyControls = getLegacyControls();
  const reactModebar = getReactModebar();
  const exportButton = getExportButton();
  const segTab = getSegmentosTab();

  if (legacyControls) legacyControls.hidden = !!reactActive;
  if (reactModebar) reactModebar.hidden = !reactActive;
  if (exportButton) exportButton.hidden = !!reactActive;
  if (segTab) segTab.hidden = !!reactActive;

  if (reactActive) {
    forceClientesListTab();
  }
}

function updateToggle() {
  const toggle = getToggle();
  if (!toggle) return;

  if (!bridge?.mount || !isClientesPageActive()) {
    toggle.hidden = true;
    return;
  }

  toggle.hidden = false;
  toggle.textContent = getMode() === MODE_REACT ? 'Voltar legado' : 'Piloto React';
}

async function applyMode() {
  const legacyShell = getLegacyShell();
  const reactShell = getReactShell();
  const root = getRoot();
  const reactActive = isReactModeActive();

  if (legacyShell) legacyShell.hidden = !!reactActive;
  if (reactShell) reactShell.hidden = !reactActive;
  syncShellModeUi(!!reactActive);

  if (!reactActive) {
    if (mounted && bridge?.unmount) bridge.unmount();
    mounted = false;
    updateFrameHeight(DEFAULT_FRAME_HEIGHT);
    syncBridgeState(null);
    updateToggle();
    return;
  }

  if (!root || !bridge?.mount) {
    updateToggle();
    return;
  }

  if (!mounted) {
    await bridge.mount(root);
    mounted = true;
  }

  updateBridgeIndicators();
  updateToggle();
}

export function registerClientesReactBridge(nextBridge) {
  bridge = nextBridge || null;
  void applyMode();
}

export function shouldRenderLegacyClientes() {
  return !(bridge?.mount && getMode() === MODE_REACT && isClientesPageActive());
}

export function syncClientesReactBridge() {
  void applyMode();
}

export function toggleClientesReactBridge() {
  if (!bridge?.mount) return;
  setMode(getMode() === MODE_REACT ? MODE_LEGACY : MODE_REACT);
  void applyMode();
}

export function abrirNovoClienteReact() {
  postToReactFrame('clientes:novo');
}

export function limparFiltrosClienteReact() {
  postToReactFrame('clientes:limpar-filtros');
}

function createClientesIframeBridge() {
  return {
    mount(root) {
      const existing = getFrame();
      if (existing) {
        updateFrameHeight(DEFAULT_FRAME_HEIGHT);
        return;
      }

      root.innerHTML = '';
      const frame = document.createElement('iframe');
      frame.id = FRAME_ID;
      frame.src = REACT_CLIENTES_URL;
      frame.title = 'Piloto React de clientes';
      frame.loading = 'lazy';
      frame.className = 'cli-react-frame';
      frame.style.height = `${DEFAULT_FRAME_HEIGHT}px`;
      root.appendChild(frame);
    },
    unmount() {
      const root = getRoot();
      if (!root) return;
      root.innerHTML = '';
    }
  };
}

function ensurePageObserver() {
  if (pageObserver || typeof MutationObserver === 'undefined') return;

  const clientesPage = getClientesPage();
  if (!clientesPage) return;

  pageObserver = new MutationObserver(() => {
    void applyMode();
  });
  pageObserver.observe(clientesPage, { attributes: true, attributeFilter: ['class'] });
}

function handleBridgeMessage(event) {
  if (event.origin !== window.location.origin) return;

  const data = event.data;
  if (!data || data.source !== MESSAGE_SOURCE) return;

  if (data.type === 'clientes:height') {
    updateFrameHeight(Number(data.height));
    return;
  }

  if (data.type === 'clientes:state') {
    syncBridgeState(data.state);
  }
}

if (typeof window !== 'undefined') {
  ensurePageObserver();
  registerClientesReactBridge(createClientesIframeBridge());
  window.addEventListener('message', handleBridgeMessage);
  window.addEventListener('storage', () => {
    void applyMode();
  });
}
