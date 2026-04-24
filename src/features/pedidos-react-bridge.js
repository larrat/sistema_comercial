// @ts-check

import { createDirectBridgeFromWindow, loadDirectBridgeScript } from './bridge-utils.js';

/** @typedef {import('./bridge-utils.js').BridgeInterface} BridgeInterface */

const MESSAGE_SOURCE = 'pedidos-react-pilot';
const COMMAND_SOURCE = 'pedidos-legacy-shell';
const DIRECT_BRIDGE_PROP = '__SC_PEDIDOS_DIRECT_BRIDGE__';
const DIRECT_BRIDGE_SCRIPT = './dist-react/pedidos-bridge.js';

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

function getPedidosPage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('pg-pedidos'));
}

function isPedidosPageActive() {
  return getPedidosPage()?.classList.contains('on') || false;
}

function getRoot() {
  return /** @type {HTMLElement | null} */ (document.getElementById('ped-react-root'));
}

async function ensureBridgeLoaded() {
  if (bridge) return bridge;
  bridge = createDirectBridgeFromWindow(DIRECT_BRIDGE_PROP);
  if (bridge) return bridge;
  bridge = await loadDirectBridgeScript(DIRECT_BRIDGE_SCRIPT, DIRECT_BRIDGE_PROP);
  return bridge;
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
    ['ped-react-indicator-status', toStatusLabel(currentBridgeState.status), toStatusTone(currentBridgeState.status)],
    ['ped-react-indicator-count', `${currentBridgeState.count} pedido${currentBridgeState.count === 1 ? '' : 's'}`, 'bg']
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
  if (!isPedidosPageActive()) return false;
  window.postMessage({ source: COMMAND_SOURCE, type, ...payload }, window.location.origin);
  return true;
}

async function applyMode() {
  if (!isPedidosPageActive()) {
    if (mounted && bridge?.unmount) bridge.unmount();
    mounted = false;
    syncBridgeState(null);
    return;
  }

  const root = getRoot();
  await ensureBridgeLoaded();
  if (!root || !bridge?.mount) return;

  if (!mounted) {
    await bridge.mount(root);
    mounted = true;
  }

  updateBridgeIndicators();
}

export function registerPedidosReactBridge(nextBridge) {
  bridge = nextBridge || null;
  void applyMode();
}

/** Sempre false — legado de pedidos foi removido. */
export function shouldRenderLegacyPedidos() {
  return false;
}

export function isPedidosReactPilotActive() {
  return mounted && isPedidosPageActive();
}

export function getPedidosReactBridgeState() {
  return { ...currentBridgeState };
}

export function syncPedidosReactBridge() {
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
  registerPedidosReactBridge(createDirectBridgeFromWindow(DIRECT_BRIDGE_PROP));
  window.addEventListener('message', handleBridgeMessage);
}
