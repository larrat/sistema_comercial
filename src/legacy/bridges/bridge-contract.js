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
