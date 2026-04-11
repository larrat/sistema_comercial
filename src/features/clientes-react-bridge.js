const STORAGE_KEY = 'sc_clientes_ui_mode';
const MODE_LEGACY = 'legacy';
const MODE_REACT = 'react';
const REACT_CLIENTES_URL = './react.html?embed=clientes';
const FRAME_ID = 'cli-react-frame';
const MESSAGE_SOURCE = 'clientes-react-pilot';
const DEFAULT_FRAME_HEIGHT = 820;

/** @type {{ mount?: (el: HTMLElement) => void | Promise<void>, unmount?: () => void } | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;

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

function syncBridgeState(state) {
  const reactShell = getReactShell();
  if (!reactShell) return;

  const nextState = state && typeof state === 'object' ? state : {};
  reactShell.dataset.reactView = String(nextState.view || 'list');
  reactShell.dataset.reactStatus = String(nextState.status || 'ready');
  reactShell.dataset.reactCount = String(nextState.count ?? 0);
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
  const reactActive = bridge?.mount && getMode() === MODE_REACT && isClientesPageActive();

  if (legacyShell) legacyShell.hidden = !!reactActive;
  if (reactShell) reactShell.hidden = !reactActive;

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
