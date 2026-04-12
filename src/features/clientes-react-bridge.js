const STORAGE_KEY = 'sc_clientes_ui_mode';
const FEATURE_FLAG_KEY = 'sc_clientes_react_enabled';
const MODE_LEGACY = 'legacy';
const MODE_REACT = 'react';
const MESSAGE_SOURCE = 'clientes-react-pilot';
const COMMAND_SOURCE = 'clientes-legacy-shell';
const DEFAULT_BRIDGE_STATE = {
  view: 'list',
  status: 'ready',
  count: 0,
  filtersActive: 0,
  selectedId: '',
  selectedName: '',
  detailTab: 'resumo'
};

/** @type {{ mount?: (el: HTMLElement) => void | Promise<void>, unmount?: () => void } | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;
let currentBridgeState = { ...DEFAULT_BRIDGE_STATE };

function getMode() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === MODE_LEGACY || stored === MODE_REACT) return stored;
  return isClientesReactFeatureEnabled() ? MODE_REACT : MODE_LEGACY;
}

function setMode(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function isClientesReactFeatureEnabled() {
  const stored = localStorage.getItem(FEATURE_FLAG_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return window.__SC_CLIENTES_REACT_ENABLED__ === true;
}

export function setClientesReactFeatureEnabled(enabled) {
  localStorage.setItem(FEATURE_FLAG_KEY, enabled ? 'true' : 'false');
  if (!localStorage.getItem(STORAGE_KEY)) {
    setMode(enabled ? MODE_REACT : MODE_LEGACY);
  }
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

function isReactModeActive() {
  return !!(bridge?.mount && getMode() === MODE_REACT && isClientesPageActive());
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
  return count > 0 ? `${count} filtro${count === 1 ? '' : 's'}` : 'Sem filtros';
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
    const baseTitle =
      currentBridgeState.view === 'form'
        ? 'Formulario React no fluxo principal'
        : currentBridgeState.view === 'detail'
          ? 'Detalhe React aberto no piloto'
          : 'Lista React em substituicao controlada';
    modebarTitle.textContent = currentBridgeState.selectedName
      ? `${baseTitle} - ${currentBridgeState.selectedName}`
      : baseTitle;
  }

  const shellTitle = document.getElementById('cli-react-shell-title');
  if (shellTitle) {
    const baseTitle =
      currentBridgeState.view === 'form'
        ? 'Edicao e cadastro rodando no piloto'
        : currentBridgeState.view === 'detail'
          ? 'Detalhe do cliente em foco'
          : 'Lista em migracao controlada';
    shellTitle.textContent = currentBridgeState.selectedName
      ? `${baseTitle} - ${currentBridgeState.selectedName}`
      : baseTitle;
  }
}

function syncBridgeState(state) {
  const reactShell = getReactShell();
  const nextState = state && typeof state === 'object' ? state : {};
  currentBridgeState = {
    view: String(nextState.view || 'list'),
    status: String(nextState.status || 'ready'),
    count: Number(nextState.count ?? 0) || 0,
    filtersActive: Number(nextState.filtersActive ?? 0) || 0,
    selectedId: String(nextState.selectedId || ''),
    selectedName: String(nextState.selectedName || ''),
    detailTab: String(nextState.detailTab || 'resumo')
  };

  if (reactShell) {
    reactShell.dataset.reactView = currentBridgeState.view;
    reactShell.dataset.reactStatus = currentBridgeState.status;
    reactShell.dataset.reactCount = String(currentBridgeState.count);
    reactShell.dataset.reactFiltersActive = String(currentBridgeState.filtersActive);
    reactShell.dataset.reactSelectedId = currentBridgeState.selectedId;
  }

  const clearFiltersButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('cli-react-clear-filters')
  );
  if (clearFiltersButton) {
    clearFiltersButton.hidden = currentBridgeState.filtersActive <= 0;
  }

  const backToListButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('cli-react-back-list')
  );
  if (backToListButton) {
    backToListButton.hidden = currentBridgeState.view === 'list';
  }

  const editCurrentButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('cli-react-edit-current')
  );
  if (editCurrentButton) {
    editCurrentButton.hidden =
      currentBridgeState.view !== 'detail' || !currentBridgeState.selectedId;
  }

  const resumoButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('cli-react-open-resumo')
  );
  const notasButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('cli-react-open-notas')
  );
  const fidelidadeButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('cli-react-open-fidelidade')
  );
  const abertasButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('cli-react-open-abertas')
  );
  const fechadasButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('cli-react-open-fechadas')
  );
  const detailOpen = currentBridgeState.view === 'detail';

  if (resumoButton) {
    resumoButton.hidden = !detailOpen || currentBridgeState.detailTab === 'resumo';
  }
  if (notasButton) {
    notasButton.hidden = !detailOpen || currentBridgeState.detailTab === 'notas';
  }
  if (fidelidadeButton) {
    fidelidadeButton.hidden = !detailOpen || currentBridgeState.detailTab === 'fidelidade';
  }
  if (abertasButton) {
    abertasButton.hidden = !detailOpen || currentBridgeState.detailTab === 'abertas';
  }
  if (fechadasButton) {
    fechadasButton.hidden = !detailOpen || currentBridgeState.detailTab === 'fechadas';
  }

  updateBridgeIndicators();
}

function postToReactFrame(type, payload = {}) {
  if (!isReactModeActive()) return false;

  window.postMessage(
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
  getListaTab()?.classList.add('on');
  getSegmentosTab()?.classList.remove('on');
  getListaPanel()?.classList.add('on');
  getSegmentosPanel()?.classList.remove('on');
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

  if (reactActive) forceClientesListTab();
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
  syncShellModeUi(reactActive);

  if (!reactActive) {
    if (mounted && bridge?.unmount) bridge.unmount();
    mounted = false;
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
  return !isReactModeActive();
}

export function isClientesReactPilotActive() {
  return isReactModeActive();
}

export function getClientesReactBridgeState() {
  return { ...currentBridgeState };
}

export function syncClientesReactBridge() {
  void applyMode();
}

export function toggleClientesReactBridge() {
  if (!bridge?.mount) return;
  setMode(getMode() === MODE_REACT ? MODE_LEGACY : MODE_REACT);
  void applyMode();
}

export function forceClientesReactMode() {
  if (!isClientesReactFeatureEnabled()) return;
  if (getMode() !== MODE_REACT) {
    setMode(MODE_REACT);
  }
  void applyMode();
}

export function abrirNovoClienteReact() {
  postToReactFrame('clientes:novo');
}

export function abrirDetalheClienteReact(clienteId, tab = 'resumo') {
  if (!clienteId) return;
  postToReactFrame('clientes:abrir-detalhe', { id: String(clienteId), tab });
}

export function editarClienteReact(clienteId) {
  if (!clienteId) return;
  postToReactFrame('clientes:editar', { id: String(clienteId) });
}

export function excluirClienteReact(clienteId) {
  if (!clienteId) return;
  postToReactFrame('clientes:excluir', { id: String(clienteId) });
}

export function limparFiltrosClienteReact() {
  postToReactFrame('clientes:limpar-filtros');
}

export function abrirListaClienteReact() {
  postToReactFrame('clientes:abrir-lista');
}

export function editarClienteReactAtual() {
  postToReactFrame('clientes:editar-atual');
}

export function exportarClientesReactCsv() {
  postToReactFrame('clientes:exportar-csv');
}

export function abrirResumoClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    abrirDetalheClienteReact(targetId, 'resumo');
    return;
  }
  postToReactFrame('clientes:abrir-resumo');
}

export function abrirAbertasClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    abrirDetalheClienteReact(targetId, 'abertas');
    return;
  }
  postToReactFrame('clientes:abrir-abertas');
}

export function abrirFechadasClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    abrirDetalheClienteReact(targetId, 'fechadas');
    return;
  }
  postToReactFrame('clientes:abrir-fechadas');
}

export function abrirNotasClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    abrirDetalheClienteReact(targetId, 'notas');
    return;
  }
  postToReactFrame('clientes:abrir-notas');
}

export function abrirFidelidadeClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    abrirDetalheClienteReact(targetId, 'fidelidade');
    return;
  }
  postToReactFrame('clientes:abrir-fidelidade');
}

function createClientesDirectBridge() {
  const directBridge = window.__SC_CLIENTES_DIRECT_BRIDGE__;
  if (!directBridge) return null;

  return {
    mount(root) {
      directBridge.mount(root);
    },
    unmount() {
      directBridge.unmount();
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

  if (data.type === 'clientes:state') {
    syncBridgeState(data.state);
    return;
  }

  if (data.type === 'clientes:pedido-acao') {
    const payload = {
      action: String(data.action || ''),
      pedidoId: String(data.pedidoId || ''),
      clienteId: String(data.clienteId || '')
    };
    window.dispatchEvent(new CustomEvent('sc:clientes-pedido-acao', { detail: payload }));
  }
}

if (typeof window !== 'undefined') {
  ensurePageObserver();
  registerClientesReactBridge(createClientesDirectBridge());
  window.addEventListener('message', handleBridgeMessage);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === FEATURE_FLAG_KEY) void applyMode();
  });
}
