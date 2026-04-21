// @ts-check

import { STORAGE_KEYS, UI_MODES } from '../legacy/bridges/storage-keys.js';
import {
  isPilotEnabled,
  setPilotEnabled,
  getPilotFlagStorageKey
} from '../legacy/bridges/feature-flags.js';
import { createDirectBridgeFromWindow } from '../legacy/bridges/bridge-contract.js';

/** @typedef {import('../legacy/bridges/bridge-contract.js').BridgeInterface} BridgeInterface */

/** @type {BridgeInterface | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;

function getMode() {
  const stored = localStorage.getItem(STORAGE_KEYS.DASHBOARD_UI_MODE);
  if (stored === UI_MODES.LEGACY || stored === UI_MODES.REACT) return stored;
  return isDashboardReactFeatureEnabled() ? UI_MODES.REACT : UI_MODES.LEGACY;
}

function setMode(mode) {
  localStorage.setItem(STORAGE_KEYS.DASHBOARD_UI_MODE, mode);
}

export function isDashboardReactFeatureEnabled() {
  return isPilotEnabled('dashboard');
}

export function setDashboardReactFeatureEnabled(enabled) {
  setPilotEnabled('dashboard', enabled);
  // Alinha o modo UI com a flag, igualando o comportamento do bridge de Clientes
  if (!localStorage.getItem(STORAGE_KEYS.DASHBOARD_UI_MODE)) {
    setMode(enabled ? UI_MODES.REACT : UI_MODES.LEGACY);
  }
}

function getDashboardPage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('pg-dashboard'));
}

function getLegacyContent() {
  return /** @type {HTMLElement | null} */ (document.getElementById('dash-legacy-content'));
}

function getReactShell() {
  return /** @type {HTMLElement | null} */ (document.getElementById('dash-react-shell'));
}

function getReactRoot() {
  return /** @type {HTMLElement | null} */ (document.getElementById('dash-react-root'));
}

function getToggle() {
  return /** @type {HTMLButtonElement | null} */ (document.getElementById('dash-react-toggle'));
}

function getLegacyControls() {
  return /** @type {HTMLElement | null} */ (document.getElementById('dash-legacy-controls'));
}

function isDashboardPageActive() {
  return getDashboardPage()?.classList.contains('on') || false;
}

function isReactModeActive() {
  return !!(bridge?.mount && getMode() === UI_MODES.REACT && isDashboardPageActive());
}

function updateToggle() {
  const toggle = getToggle();
  if (!toggle) return;
  if (!bridge?.mount || !isDashboardPageActive()) {
    toggle.hidden = true;
    return;
  }
  toggle.hidden = false;
  toggle.textContent = getMode() === UI_MODES.REACT ? 'Visual clássico' : 'Nova interface';
}

async function applyMode() {
  const legacyContent = getLegacyContent();
  const reactShell = getReactShell();
  const root = getReactRoot();
  const legacyControls = getLegacyControls();
  const reactActive = isReactModeActive();

  if (legacyContent) legacyContent.hidden = !!reactActive;
  if (reactShell) reactShell.hidden = !reactActive;
  if (legacyControls) legacyControls.hidden = !!reactActive;

  if (!reactActive) {
    if (mounted && bridge?.unmount) bridge.unmount();
    mounted = false;
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

  updateToggle();
}

export function registerDashboardReactBridge(nextBridge) {
  bridge = nextBridge || null;
  void applyMode();
}

export function isDashboardReactPilotActive() {
  return isReactModeActive();
}

export function syncDashboardReactBridge() {
  void applyMode();
}

export function toggleDashboardReactBridge() {
  if (!bridge?.mount) return;
  setMode(getMode() === UI_MODES.REACT ? UI_MODES.LEGACY : UI_MODES.REACT);
  void applyMode();
}

function ensurePageObserver() {
  if (pageObserver || typeof MutationObserver === 'undefined') return;

  const dashPage = getDashboardPage();
  if (!dashPage) return;

  pageObserver = new MutationObserver(() => {
    void applyMode();
  });
  pageObserver.observe(dashPage, { attributes: true, attributeFilter: ['class'] });
}

if (typeof window !== 'undefined') {
  ensurePageObserver();
  registerDashboardReactBridge(createDirectBridgeFromWindow('__SC_DASHBOARD_DIRECT_BRIDGE__'));
  window.addEventListener('storage', (e) => {
    const flagKey = getPilotFlagStorageKey('dashboard');
    if (e.key === STORAGE_KEYS.DASHBOARD_UI_MODE || e.key === flagKey) void applyMode();
  });
}
