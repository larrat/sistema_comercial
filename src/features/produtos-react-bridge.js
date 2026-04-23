// @ts-check

import {
  createDirectBridgeFromWindow,
  loadDirectBridgeScript
} from '../legacy/bridges/bridge-contract.js';
import { isPilotEnabled, getPilotFlagStorageKey } from '../legacy/bridges/feature-flags.js';

/** @typedef {import('../legacy/bridges/bridge-contract.js').BridgeInterface} BridgeInterface */

const DIRECT_BRIDGE_PROP = '__SC_PRODUTOS_DIRECT_BRIDGE__';
const DIRECT_BRIDGE_SCRIPT = './dist-react/produtos-bridge.js';

/** @type {BridgeInterface | null} */
let bridge = null;
let mounted = false;
/** @type {MutationObserver | null} */
let pageObserver = null;

function getProdutosPage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('pg-produtos'));
}

function isProdutosPageActive() {
  return getProdutosPage()?.classList.contains('on') || false;
}

function getLegacyShell() {
  return /** @type {HTMLElement | null} */ (document.getElementById('prod-legacy-shell'));
}

function getRoot() {
  return /** @type {HTMLElement | null} */ (document.getElementById('prod-react-root'));
}

async function ensureBridgeLoaded() {
  if (bridge) return bridge;
  bridge = createDirectBridgeFromWindow(DIRECT_BRIDGE_PROP);
  if (bridge) return bridge;
  bridge = await loadDirectBridgeScript(DIRECT_BRIDGE_SCRIPT, DIRECT_BRIDGE_PROP);
  return bridge;
}

function isReactEnabled() {
  return isPilotEnabled('produtos');
}

async function applyMode() {
  const legacyShell = getLegacyShell();
  const root = getRoot();

  if (!isProdutosPageActive() || !isReactEnabled()) {
    if (legacyShell) legacyShell.hidden = false;
    if (root) root.hidden = true;
    if (mounted && bridge?.unmount) bridge.unmount();
    mounted = false;
    return;
  }

  if (legacyShell) legacyShell.hidden = true;
  if (root) root.hidden = false;

  await ensureBridgeLoaded();
  if (!root || !bridge?.mount) return;

  if (!mounted) {
    await bridge.mount(root);
    mounted = true;
  }
}

export function registerProdutosReactBridge(nextBridge) {
  bridge = nextBridge || null;
  void applyMode();
}

export function isProdutosReactPilotActive() {
  return mounted && isProdutosPageActive() && isReactEnabled();
}

export function syncProdutosReactBridge() {
  void applyMode();
}

export function abrirNovoProdutoReact() {
  window.dispatchEvent(new CustomEvent('sc:abrir-novo-produto'));
}

function ensurePageObserver() {
  if (pageObserver || typeof MutationObserver === 'undefined') return;

  const produtosPage = getProdutosPage();
  if (!produtosPage) return;

  pageObserver = new MutationObserver(() => {
    void applyMode();
  });
  pageObserver.observe(produtosPage, { attributes: true, attributeFilter: ['class'] });
}

if (typeof window !== 'undefined') {
  ensurePageObserver();
  registerProdutosReactBridge(createDirectBridgeFromWindow(DIRECT_BRIDGE_PROP));
  window.addEventListener('storage', (e) => {
    const flagKey = getPilotFlagStorageKey('produtos');
    if (e.key === flagKey) void applyMode();
  });
  // Sincroniza D.produtos quando o React salva/remove um produto
  window.addEventListener('sc:produto-salvo', () => {
    if (!isProdutosReactPilotActive()) return;
    // O legado pode reagir a este evento se precisar atualizar outros módulos (ex: pedidos)
  });
}
