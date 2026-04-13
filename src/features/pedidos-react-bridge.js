// @ts-check

import { STORAGE_KEYS, UI_MODES } from '../legacy/bridges/storage-keys.js';
import {
  isPilotEnabled,
  setPilotEnabled,
  getPilotFlagStorageKey
} from '../legacy/bridges/feature-flags.js';
import { createDirectBridgeFromWindow } from '../legacy/bridges/bridge-contract.js';

/** @typedef {import('../legacy/bridges/bridge-contract.js').BridgeInterface} BridgeInterface */

const MESSAGE_SOURCE = 'pedidos-react-pilot';
const COMMAND_SOURCE = 'pedidos-legacy-shell';

/** @type {BridgeInterface | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;

const DEFAULT_BRIDGE_STATE = {
  tab: 'emaberto',
  view: 'list',
  status: 'ready',
  count: 0,
  filtersActive: 0,
  totalPedidos: 0,
  selectedId: '',
  selectedNum: null
};

let currentBridgeState = { ...DEFAULT_BRIDGE_STATE };

function getMode() {
  const stored = localStorage.getItem(STORAGE_KEYS.PEDIDOS_UI_MODE);
  if (stored === UI_MODES.LEGACY || stored === UI_MODES.REACT) return stored;
  return isPedidosReactFeatureEnabled() ? UI_MODES.REACT : UI_MODES.LEGACY;
}

function setMode(mode) {
  localStorage.setItem(STORAGE_KEYS.PEDIDOS_UI_MODE, mode);
}

export function isPedidosReactFeatureEnabled() {
  return isPilotEnabled('pedidos');
}

export function setPedidosReactFeatureEnabled(enabled) {
  setPilotEnabled('pedidos', enabled);
  if (!localStorage.getItem(STORAGE_KEYS.PEDIDOS_UI_MODE)) {
    setMode(enabled ? UI_MODES.REACT : UI_MODES.LEGACY);
  }
}

function getToggle() {
  return /** @type {HTMLButtonElement | null} */ (document.getElementById('ped-react-toggle'));
}

function getLegacyShell() {
  return document.getElementById('ped-legacy-shell');
}

function getReactShell() {
  return document.getElementById('ped-react-shell');
}

function getRoot() {
  return /** @type {HTMLElement | null} */ (document.getElementById('ped-react-root'));
}

function getPedidosPage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('pg-pedidos'));
}

function isPedidosPageActive() {
  return getPedidosPage()?.classList.contains('on') || false;
}

function isReactModeActive() {
  return !!(bridge?.mount && getMode() === UI_MODES.REACT && isPedidosPageActive());
}

function toStatusTone(status) {
  return status === 'loading' ? 'ba' : status === 'error' ? 'br' : 'bk';
}

function toStatusLabel(status) {
  return status === 'loading' ? 'Carregando' : status === 'error' ? 'Atencao' : 'Pronto';
}

function toTabLabel(tab) {
  return tab === 'entregues' ? 'Entregues' : tab === 'cancelados' ? 'Cancelados' : 'Em Aberto';
}

function updateBridgeIndicators() {
  const indicators = [
    ['ped-react-indicator-tab', toTabLabel(currentBridgeState.tab), 'bb'],
    [
      'ped-react-indicator-status',
      toStatusLabel(currentBridgeState.status),
      toStatusTone(currentBridgeState.status)
    ],
    [
      'ped-react-indicator-count',
      `${currentBridgeState.count} pedido${currentBridgeState.count === 1 ? '' : 's'}`,
      'bg'
    ]
  ];

  indicators.forEach(([id, text, tone]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `bdg ${tone}`;
  });
}

function syncBridgeState(state) {
  const nextState = state && typeof state === 'object' ? state : {};
  currentBridgeState = {
    tab: String(nextState.tab || 'emaberto'),
    view: String(nextState.view || 'list'),
    status: String(nextState.status || 'ready'),
    count: Number(nextState.count ?? 0) || 0,
    filtersActive: Number(nextState.filtersActive ?? 0) || 0,
    totalPedidos: Number(nextState.totalPedidos ?? 0) || 0,
    selectedId: String(nextState.selectedId || ''),
    selectedNum: nextState.selectedNum ?? null
  };
  updateBridgeIndicators();
}

function postToReactFrame(type, payload = {}) {
  if (!isReactModeActive()) return false;
  window.postMessage({ source: COMMAND_SOURCE, type, ...payload }, window.location.origin);
  return true;
}

function syncShellModeUi(reactActive) {
  const legacyShell = getLegacyShell();
  const reactShell = getReactShell();
  if (legacyShell) legacyShell.hidden = !!reactActive;
  if (reactShell) reactShell.hidden = !reactActive;
}

function updateToggle() {
  const toggle = getToggle();
  if (!toggle) return;

  if (!bridge?.mount || !isPedidosPageActive()) {
    toggle.hidden = true;
    return;
  }

  toggle.hidden = false;
  toggle.textContent = getMode() === UI_MODES.REACT ? 'Voltar legado' : 'Piloto React';
}

async function applyMode() {
  const reactActive = isReactModeActive();
  syncShellModeUi(reactActive);

  if (!reactActive) {
    if (mounted && bridge?.unmount) bridge.unmount();
    mounted = false;
    syncBridgeState(null);
    updateToggle();
    return;
  }

  const root = getRoot();
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

export function registerPedidosReactBridge(nextBridge) {
  bridge = nextBridge || null;
  void applyMode();
}

export function shouldRenderLegacyPedidos() {
  return !isReactModeActive();
}

export function isPedidosReactPilotActive() {
  return isReactModeActive();
}

export function getPedidosReactBridgeState() {
  return { ...currentBridgeState };
}

export function syncPedidosReactBridge() {
  void applyMode();
}

export function togglePedidosReactBridge() {
  if (!bridge?.mount) return;
  setMode(getMode() === UI_MODES.REACT ? UI_MODES.LEGACY : UI_MODES.REACT);
  void applyMode();
}

export function forcePedidosReactMode() {
  if (!isPedidosReactFeatureEnabled()) return;
  if (getMode() !== UI_MODES.REACT) setMode(UI_MODES.REACT);
  void applyMode();
}

export function setPedidosReactTab(tab) {
  postToReactFrame('pedidos:set-tab', { tab });
}

export function limparFiltrosPedidosReact() {
  postToReactFrame('pedidos:limpar-filtros');
}

export function abrirNovoPedidoReact() {
  postToReactFrame('pedidos:novo');
}

export function editarPedidoReact(pedidoId) {
  if (!pedidoId) return;
  postToReactFrame('pedidos:editar', { id: String(pedidoId) });
}

export function abrirDetalhePedidoReact(pedidoId) {
  if (!pedidoId) return;
  postToReactFrame('pedidos:detalhe', { id: String(pedidoId) });
}

function handleBridgeMessage(event) {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.source !== MESSAGE_SOURCE) return;

  if (data.type === 'pedidos:state') {
    syncBridgeState(data.state);
  }
}

function ensurePageObserver() {
  if (pageObserver || typeof MutationObserver === 'undefined') return;

  const pedidosPage = getPedidosPage();
  if (!pedidosPage) return;

  pageObserver = new MutationObserver(() => {
    void applyMode();
  });
  pageObserver.observe(pedidosPage, { attributes: true, attributeFilter: ['class'] });
}

if (typeof window !== 'undefined') {
  ensurePageObserver();
  registerPedidosReactBridge(createDirectBridgeFromWindow('__SC_PEDIDOS_DIRECT_BRIDGE__'));
  window.addEventListener('message', handleBridgeMessage);
  window.addEventListener('storage', (e) => {
    const flagKey = getPilotFlagStorageKey('pedidos');
    if (e.key === STORAGE_KEYS.PEDIDOS_UI_MODE || e.key === flagKey) void applyMode();
  });
}
