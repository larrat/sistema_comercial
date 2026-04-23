// @ts-check

import { createDirectBridgeFromWindow } from '../legacy/bridges/bridge-contract.js';
import { isPilotEnabled, getPilotFlagStorageKey } from '../legacy/bridges/feature-flags.js';

/** @typedef {import('../legacy/bridges/bridge-contract.js').BridgeInterface} BridgeInterface */

const MESSAGE_SOURCE = 'receber-react-pilot';
const COMMAND_SOURCE = 'receber-legacy-shell';

/** @type {BridgeInterface | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;

const DEFAULT_BRIDGE_STATE = {
  tab: 'pendentes',
  status: 'ready',
  count: 0
};

let currentBridgeState = { ...DEFAULT_BRIDGE_STATE };

function getReceberPage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('pg-receber'));
}

function isReceberPageActive() {
  return getReceberPage()?.classList.contains('on') || false;
}

function getLegacyShell() {
  return /** @type {HTMLElement | null} */ (document.getElementById('cr-legacy-shell'));
}

function getRoot() {
  return /** @type {HTMLElement | null} */ (document.getElementById('cr-react-root'));
}

function isReactEnabled() {
  return isPilotEnabled('receber');
}

function updateBridgeIndicators() {
  const el = document.getElementById('cr-react-indicator-count');
  if (el) {
    const count = Number(currentBridgeState.count || 0);
    el.textContent = `${count} em aberto`;
    el.className = 'bdg bg';
  }
}

function syncBridgeState(state) {
  const nextState = state && typeof state === 'object' ? state : {};
  currentBridgeState = {
    tab: String(nextState.tab || 'pendentes'),
    status: String(nextState.status || 'ready'),
    count: Number(nextState.count ?? 0) || 0
  };
  updateBridgeIndicators();
}

function postToReactFrame(type, payload = {}) {
  if (!isReceberPageActive()) return false;
  window.postMessage({ source: COMMAND_SOURCE, type, ...payload }, window.location.origin);
  return true;
}

async function applyMode() {
  const legacyShell = getLegacyShell();
  const root = getRoot();

  if (!isReceberPageActive() || !isReactEnabled()) {
    // Show legacy, hide React
    if (legacyShell) legacyShell.hidden = false;
    if (root) root.hidden = true;
    if (mounted && bridge?.unmount) bridge.unmount();
    mounted = false;
    syncBridgeState(null);
    return;
  }

  // React mode: hide legacy, show React root
  if (legacyShell) legacyShell.hidden = true;
  if (root) root.hidden = false;

  if (!root || !bridge?.mount) return;

  if (!mounted) {
    await bridge.mount(root);
    mounted = true;
  }

  updateBridgeIndicators();
}

export function registerContasReceberReactBridge(nextBridge) {
  bridge = nextBridge || null;
  void applyMode();
}

export function shouldRenderLegacyContasReceber() {
  return !mounted || !isReceberPageActive() || !isReactEnabled();
}

export function isContasReceberReactPilotActive() {
  return mounted && isReceberPageActive() && isReactEnabled();
}

export function syncContasReceberReactBridge() {
  void applyMode();
}

export function setContasReceberReactTab(tab) {
  postToReactFrame('receber:set-tab', { tab });
}

function handleBridgeMessage(event) {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.source !== MESSAGE_SOURCE) return;
  if (data.type === 'receber:state') {
    syncBridgeState(data.state);
  }
}

function ensurePageObserver() {
  if (pageObserver || typeof MutationObserver === 'undefined') return;

  const receberPage = getReceberPage();
  if (!receberPage) return;

  pageObserver = new MutationObserver(() => {
    void applyMode();
  });
  pageObserver.observe(receberPage, { attributes: true, attributeFilter: ['class'] });
}

if (typeof window !== 'undefined') {
  ensurePageObserver();
  registerContasReceberReactBridge(createDirectBridgeFromWindow('__SC_RECEBER_DIRECT_BRIDGE__'));
  window.addEventListener('message', handleBridgeMessage);
  window.addEventListener('storage', (e) => {
    const flagKey = getPilotFlagStorageKey('receber');
    if (e.key === flagKey) void applyMode();
  });
}
