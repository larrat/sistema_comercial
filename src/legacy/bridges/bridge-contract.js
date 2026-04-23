// @ts-check

/**
 * Contrato oficial de integração entre bridges legacy e pilots React.
 *
 * Todo domínio que implementar um pilot React DEVE obedecer este contrato:
 * - O bundle React expõe window.__SC_<DOMAIN>_DIRECT_BRIDGE__ = { mount, unmount }
 * - O bridge legacy chama createDirectBridgeFromWindow() para obter a interface
 * - O ciclo de vida (mount/unmount) é gerenciado exclusivamente pelo bridge legacy
 *
 * Por que um contrato explícito:
 * - Evita drift entre implementações (Dashboard já divergiu do Clientes)
 * - Documenta o único ponto de acoplamento permitido entre legado e React
 * - Permite testar bridges em isolamento mockando a BridgeInterface
 */

/**
 * Interface mínima que todo pilot React deve expor.
 * O bundle React publica este objeto no window antes de qualquer mount.
 *
 * @typedef {{
 *   mount: (el: HTMLElement) => void | Promise<void>,
 *   unmount: () => void
 * }} BridgeInterface
 */

/**
 * Estado que o pilot React pode sincronizar de volta para o shell legado.
 * Campos são opcionais para manter retrocompatibilidade entre versões.
 * Cada domínio pode estender com campos próprios, mas os campos base são fixos.
 *
 * @typedef {{
 *   view?: string,
 *   status?: string,
 *   count?: number,
 *   filtersActive?: number,
 *   selectedId?: string,
 *   selectedName?: string,
 *   detailTab?: string,
 *   [key: string]: unknown
 * }} BridgeState
 */

/**
 * Cria uma BridgeInterface a partir do objeto direto exposto na window pelo bundle React.
 *
 * Substitui o padrão copy-paste de createClientesDirectBridge() /
 * createDashboardDirectBridge() que existia em cada bridge. Qualquer domínio
 * novo usa esta função — nenhum boilerplate adicional.
 *
 * Retorna null se o bundle ainda não carregou ou se a interface é inválida,
 * o que é esperado durante o boot (o bridge re-tenta via MutationObserver).
 *
 * @param {string} windowProp - Nome exato da propriedade no window.
 *   Ex: '__SC_CLIENTES_DIRECT_BRIDGE__', '__SC_DASHBOARD_DIRECT_BRIDGE__'
 * @returns {BridgeInterface | null}
 */
export function createDirectBridgeFromWindow(windowProp) {
  const direct = /** @type {any} */ (window)[windowProp];
  if (!direct || typeof direct.mount !== 'function') return null;

  return {
    mount(el) {
      return direct.mount(el);
    },
    unmount() {
      if (typeof direct.unmount === 'function') direct.unmount();
    }
  };
}

/**
 * Carrega sob demanda um bundle de bridge e retorna a interface exposta no window.
 *
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
      existing.addEventListener('load', () => resolve(createDirectBridgeFromWindow(windowProp)), {
        once: true
      });
      existing.addEventListener('error', () => resolve(null), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.dataset.bridgeSrc = src;
    script.addEventListener(
      'load',
      () => {
        script.dataset.bridgeLoaded = 'true';
        resolve(createDirectBridgeFromWindow(windowProp));
      },
      { once: true }
    );
    script.addEventListener(
      'error',
      () => {
        script.dataset.bridgeError = 'true';
        resolve(null);
      },
      { once: true }
    );
    document.head.appendChild(script);
  });
}
