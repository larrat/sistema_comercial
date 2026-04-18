// @ts-check

import { toast } from '../shared/utils.js';
import { removerClienteAction } from './clientes/actions.js';
import { createClientesLegacyOps } from './clientes-legacy-ops.js';

/**
 * @param {{
 *   renderCliMet: () => void;
 *   renderClientes: () => void;
 *   renderCliSegs: () => void;
 *   refreshCliDL: () => void;
 * }} deps
 */
export function createClientesLegacyShell(deps) {
  const { renderCliMet, renderClientes, renderCliSegs, refreshCliDL } = deps;

  /** @type {ReturnType<typeof createClientesLegacyOps> | null} */
  let clientesLegacyOps = null;

  function getLegacyOps() {
    if (clientesLegacyOps) return clientesLegacyOps;
    clientesLegacyOps = createClientesLegacyOps({
      removerClienteAction,
      toast,
      renderCliMet,
      renderClientes,
      renderCliSegs,
      refreshCliDL
    });
    return clientesLegacyOps;
  }

  return {
    removerCli: (id) => getLegacyOps().removerCli(id)
  };
}
