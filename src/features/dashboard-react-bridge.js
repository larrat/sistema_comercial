// @ts-check

const STORAGE_KEY = 'sc_dashboard_ui_mode';
const FEATURE_FLAG_KEY = 'sc_dashboard_react_enabled';
const MODE_LEGACY = 'legacy';
const MODE_REACT = 'react';

/** @type {{ mount?: (el: HTMLElement) => void | Promise<void>, unmount?: () => void } | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;

function getMode() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === MODE_LEGACY || stored === MODE_REACT) return stored;
  return isDashboardReactFeatureEnabled() ? MODE_REACT : MODE_LEGACY;
}

function setMode(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function isDashboardReactFeatureEnabled() {
  const stored = localStorage.getItem(FEATURE_FLAG_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return window.__SC_DASHBOARD_REACT_ENABLED__ === true;
}

export function setDashboardReactFeatureEnabled(enabled) {
  localStorage.setItem(FEATURE_FLAG_KEY, enabled ? 'true' : 'false');
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
  return !!(bridge?.mount && getMode() === MODE_REACT && isDashboardPageActive());
}

function updateToggle() {
  const toggle = getToggle();
  if (!toggle) return;
  if (!bridge?.mount || !isDashboardPageActive()) {
    toggle.hidden = true;
    return;
  }
  toggle.hidden = false;
  toggle.textContent = getMode() === MODE_REACT ? 'Voltar legado' : 'Piloto React';
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
  setMode(getMode() === MODE_REACT ? MODE_LEGACY : MODE_REACT);
  void applyMode();
}

function createDashboardDirectBridge() {
  const directBridge = window.__SC_DASHBOARD_DIRECT_BRIDGE__;
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

  const dashPage = getDashboardPage();
  if (!dashPage) return;

  pageObserver = new MutationObserver(() => {
    void applyMode();
  });
  pageObserver.observe(dashPage, { attributes: true, attributeFilter: ['class'] });
}

if (typeof window !== 'undefined') {
  ensurePageObserver();
  registerDashboardReactBridge(createDashboardDirectBridge());
  window.addEventListener('storage', () => {
    void applyMode();
  });
}
