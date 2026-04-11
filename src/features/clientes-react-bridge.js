const STORAGE_KEY = 'sc_clientes_ui_mode';
const MODE_LEGACY = 'legacy';
const MODE_REACT = 'react';
const REACT_CLIENTES_URL = './react.html?embed=clientes';
const FRAME_ID = 'cli-react-frame';

/** @type {{ mount?: (el: HTMLElement) => void | Promise<void>, unmount?: () => void } | null} */
let bridge = null;
let mounted = false;

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

function isClientesPageActive() {
  return document.getElementById('pg-clientes')?.classList.contains('on') || false;
}

function updateToggle() {
  const toggle = getToggle();
  if (!toggle) return;

  if (!bridge?.mount) {
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
      if (existing) return;

      root.innerHTML = '';
      const frame = document.createElement('iframe');
      frame.id = FRAME_ID;
      frame.src = REACT_CLIENTES_URL;
      frame.title = 'Piloto React de clientes';
      frame.loading = 'lazy';
      frame.className = 'cli-react-frame';
      root.appendChild(frame);
    },
    unmount() {
      const root = getRoot();
      if (!root) return;
      root.innerHTML = '';
    }
  };
}

if (typeof window !== 'undefined') {
  registerClientesReactBridge(createClientesIframeBridge());
  window.addEventListener('storage', () => {
    void applyMode();
  });
}
