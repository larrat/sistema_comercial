// @ts-check

import { createDirectBridgeFromWindow } from './bridge-utils.js';

/** @typedef {import('./bridge-utils.js').BridgeInterface} BridgeInterface */

const DASHBOARD_UI_MODE_KEY = 'sc_dashboard_ui_mode';

/** @type {BridgeInterface | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;

function getMode() {
  const stored = localStorage.getItem(DASHBOARD_UI_MODE_KEY);
  if (stored === 'legacy' || stored === 'react') return stored;
  return 'react';
}

function setMode(mode) {
  localStorage.setItem(DASHBOARD_UI_MODE_KEY, mode);
}

export function isDashboardReactFeatureEnabled() {
  return true;
}

export function setDashboardReactFeatureEnabled(_enabled) {
  // no-op — React is permanently enabled
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
  return !!(bridge?.mount && getMode() === 'react' && isDashboardPageActive());
}

function updateToggle() {
  const toggle = getToggle();
  if (!toggle) return;
  if (!bridge?.mount || !isDashboardPageActive()) {
    toggle.hidden = true;
    return;
  }
  toggle.hidden = false;
  toggle.textContent = getMode() === 'react' ? 'Visual clássico' : 'Nova interface';
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
  setMode(getMode() === 'react' ? 'legacy' : 'react');
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
    if (e.key === DASHBOARD_UI_MODE_KEY) void applyMode();
  });
}
