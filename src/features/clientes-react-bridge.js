// @ts-check

import { STORAGE_KEYS, UI_MODES } from '../legacy/bridges/storage-keys.js';
import {
  isPilotEnabled,
  setPilotEnabled,
  getPilotFlagStorageKey
} from '../legacy/bridges/feature-flags.js';
import { createDirectBridgeFromWindow } from '../legacy/bridges/bridge-contract.js';
import { fecharModal } from '../shared/utils.js';

/** @typedef {import('../legacy/bridges/bridge-contract.js').BridgeInterface} BridgeInterface */
/** @typedef {import('../legacy/bridges/bridge-contract.js').BridgeState} BridgeState */

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

/** @type {BridgeInterface | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;
let currentBridgeState = { ...DEFAULT_BRIDGE_STATE };

function getMode() {
  const stored = localStorage.getItem(STORAGE_KEYS.CLIENTES_UI_MODE);
  if (stored === UI_MODES.LEGACY || stored === UI_MODES.REACT) return stored;
  return isClientesReactFeatureEnabled() ? UI_MODES.REACT : UI_MODES.LEGACY;
}

function setMode(mode) {
  localStorage.setItem(STORAGE_KEYS.CLIENTES_UI_MODE, mode);
}

export function isClientesReactFeatureEnabled() {
  return isPilotEnabled('clientes');
}

export function setClientesReactFeatureEnabled(enabled) {
  setPilotEnabled('clientes', enabled);
  if (!localStorage.getItem(STORAGE_KEYS.CLIENTES_UI_MODE)) {
    setMode(enabled ? UI_MODES.REACT : UI_MODES.LEGACY);
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

function getLegacyMetrics() {
  return /** @type {HTMLElement | null} */ (document.getElementById('cli-met'));
}

function getTabsBar() {
  return /** @type {HTMLElement | null} */ (document.querySelector('#pg-clientes > .tabs'));
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

function getLegacyDetailModal() {
  return /** @type {HTMLElement | null} */ (document.getElementById('modal-cli-det'));
}

function getLegacyFormModal() {
  return /** @type {HTMLElement | null} */ (document.getElementById('modal-cliente'));
}

function getLegacyDetailBox() {
  return /** @type {HTMLElement | null} */ (document.getElementById('cli-det-box'));
}

function isClientesPageActive() {
  return getClientesPage()?.classList.contains('on') || false;
}

function isReactModeRequested() {
  return !!(bridge?.mount && getMode() === UI_MODES.REACT && isClientesPageActive());
}

function isReactModeActive() {
  return !!(mounted && getMode() === UI_MODES.REACT && isClientesPageActive());
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
  const legacyMetrics = getLegacyMetrics();
  const tabsBar = getTabsBar();
  const reactModebar = getReactModebar();
  const exportButton = getExportButton();
  const segTab = getSegmentosTab();
  const segPanel = getSegmentosPanel();

  if (legacyControls) legacyControls.hidden = !!reactActive;
  if (legacyMetrics) legacyMetrics.hidden = !!reactActive;
  if (tabsBar) tabsBar.hidden = !!reactActive;
  if (reactModebar) reactModebar.hidden = !reactActive;
  if (exportButton) exportButton.hidden = !!reactActive;
  if (segTab) segTab.hidden = !!reactActive;
  if (segPanel) segPanel.hidden = !!reactActive;

  if (reactActive) forceClientesListTab();
}

function syncLegacyDetailModal(reactActive) {
  const modal = getLegacyDetailModal();
  if (!modal) return;

  if (reactActive) {
    if (modal.classList.contains('on')) fecharModal('modal-cli-det');
    const detailBox = getLegacyDetailBox();
    if (detailBox) detailBox.innerHTML = '';
    modal.hidden = true;
    return;
  }

  modal.hidden = false;
}

function syncLegacyFormModal(reactActive) {
  const modal = getLegacyFormModal();
  if (!modal) return;

  if (reactActive) {
    if (modal.classList.contains('on')) fecharModal('modal-cliente');
    modal.hidden = true;
    return;
  }

  modal.hidden = false;
}

function updateToggle() {
  const toggle = getToggle();
  if (!toggle) return;

  if (!bridge?.mount || !isClientesPageActive()) {
    toggle.hidden = true;
    return;
  }

  toggle.hidden = false;
  toggle.textContent = getMode() === UI_MODES.REACT ? 'Voltar legado' : 'Piloto React';
}

async function applyMode() {
  const legacyShell = getLegacyShell();
  const reactShell = getReactShell();
  const root = getRoot();
  const reactRequested = isReactModeRequested();

  if (!reactRequested) {
    if (mounted && bridge?.unmount) bridge.unmount();
    mounted = false;
    if (legacyShell) legacyShell.hidden = false;
    if (reactShell) reactShell.hidden = true;
    syncShellModeUi(false);
    syncLegacyDetailModal(false);
    syncLegacyFormModal(false);
    syncBridgeState(null);
    updateToggle();
    return;
  }

  if (!root || !bridge?.mount) {
    if (legacyShell) legacyShell.hidden = false;
    if (reactShell) reactShell.hidden = true;
    syncShellModeUi(false);
    syncLegacyDetailModal(false);
    syncLegacyFormModal(false);
    updateToggle();
    return;
  }

  if (!mounted) {
    try {
      await bridge.mount(root);
      mounted = true;
    } catch (error) {
      mounted = false;
      console.error(
        '[clientes-react-bridge] falha ao montar piloto React; usando fallback legado.',
        error
      );
    }
  }

  const reactActive = isReactModeActive();
  if (legacyShell) legacyShell.hidden = !!reactActive;
  if (reactShell) reactShell.hidden = !reactActive;
  syncShellModeUi(reactActive);
  syncLegacyDetailModal(reactActive);
  syncLegacyFormModal(reactActive);

  if (!reactActive) {
    syncBridgeState(null);
    updateToggle();
    return;
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
  setMode(getMode() === UI_MODES.REACT ? UI_MODES.LEGACY : UI_MODES.REACT);
  void applyMode();
}

export function forceClientesReactMode() {
  if (!isClientesReactFeatureEnabled()) return;
  if (getMode() !== UI_MODES.REACT) {
    setMode(UI_MODES.REACT);
  }
  void applyMode();
}

export function abrirNovoClienteReact() {
  return postToReactFrame('clientes:novo');
}

export function abrirDetalheClienteReact(clienteId, tab = 'resumo') {
  if (!clienteId) return false;
  return postToReactFrame('clientes:abrir-detalhe', { id: String(clienteId), tab });
}

export function editarClienteReact(clienteId) {
  if (!clienteId) return false;
  return postToReactFrame('clientes:editar', { id: String(clienteId) });
}

export function excluirClienteReact(clienteId) {
  if (!clienteId) return false;
  return postToReactFrame('clientes:excluir', { id: String(clienteId) });
}

export function limparFiltrosClienteReact() {
  return postToReactFrame('clientes:limpar-filtros');
}

export function abrirListaClienteReact() {
  return postToReactFrame('clientes:abrir-lista');
}

export function editarClienteReactAtual() {
  return postToReactFrame('clientes:editar-atual');
}

export function exportarClientesReactCsv() {
  return postToReactFrame('clientes:exportar-csv');
}

export function abrirResumoClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    return abrirDetalheClienteReact(targetId, 'resumo');
  }
  return postToReactFrame('clientes:abrir-resumo');
}

export function abrirAbertasClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    return abrirDetalheClienteReact(targetId, 'abertas');
  }
  return postToReactFrame('clientes:abrir-abertas');
}

export function abrirFechadasClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    return abrirDetalheClienteReact(targetId, 'fechadas');
  }
  return postToReactFrame('clientes:abrir-fechadas');
}

export function abrirNotasClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    return abrirDetalheClienteReact(targetId, 'notas');
  }
  return postToReactFrame('clientes:abrir-notas');
}

export function abrirFidelidadeClienteReact(clienteId) {
  const targetId = clienteId || currentBridgeState.selectedId;
  if (targetId) {
    return abrirDetalheClienteReact(targetId, 'fidelidade');
  }
  return postToReactFrame('clientes:abrir-fidelidade');
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

function ensurePageObserver() {
  if (pageObserver || typeof MutationObserver === 'undefined') return;

  const clientesPage = getClientesPage();
  if (!clientesPage) return;

  pageObserver = new MutationObserver(() => {
    void applyMode();
  });
  pageObserver.observe(clientesPage, { attributes: true, attributeFilter: ['class'] });
}

if (typeof window !== 'undefined') {
  ensurePageObserver();
  registerClientesReactBridge(createDirectBridgeFromWindow('__SC_CLIENTES_DIRECT_BRIDGE__'));
  window.addEventListener('message', handleBridgeMessage);
  window.addEventListener('storage', (e) => {
    const flagKey = getPilotFlagStorageKey('clientes');
    if (e.key === STORAGE_KEYS.CLIENTES_UI_MODE || e.key === flagKey) void applyMode();
  });
}
