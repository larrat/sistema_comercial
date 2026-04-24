// @ts-check

/**
 * @typedef {{
 *   mount: (el: HTMLElement) => void | Promise<void>,
 *   unmount: () => void
 * }} BridgeInterface
 */

/**
 * @param {string} windowProp
 * @returns {BridgeInterface | null}
 */
export function createDirectBridgeFromWindow(windowProp) {
  const direct = /** @type {any} */ (window)[windowProp];
  if (!direct || typeof direct.mount !== 'function') return null;
  return {
    mount(el) { return direct.mount(el); },
    unmount() { if (typeof direct.unmount === 'function') direct.unmount(); }
  };
}

/**
 * @param {string} src
 * @param {string} windowProp
 * @returns {Promise<BridgeInterface | null>}
 */
export function loadDirectBridgeScript(src, windowProp) {
  const current = createDirectBridgeFromWindow(windowProp);
  if (current) return Promise.resolve(current);

  const existing = document.querySelector(`script[data-bridge-src="${src}"]`);
  if (existing) {
    if (existing instanceof HTMLScriptElement && existing.dataset.bridgeLoaded === 'true') {
      return Promise.resolve(createDirectBridgeFromWindow(windowProp));
    }
    if (existing instanceof HTMLScriptElement && existing.dataset.bridgeError === 'true') {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      existing.addEventListener('load', () => resolve(createDirectBridgeFromWindow(windowProp)), { once: true });
      existing.addEventListener('error', () => resolve(null), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.dataset.bridgeSrc = src;
    script.addEventListener('load', () => {
      script.dataset.bridgeLoaded = 'true';
      resolve(createDirectBridgeFromWindow(windowProp));
    }, { once: true });
    script.addEventListener('error', () => {
      script.dataset.bridgeError = 'true';
      resolve(null);
    }, { once: true });
    document.head.appendChild(script);
  });
}
