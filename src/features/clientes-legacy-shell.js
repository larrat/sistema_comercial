// @ts-check

import { State } from '../app/store.js';
import {
  abrirModal,
  fecharModal,
  focusField,
  notify,
  notifyGuided,
  toast
} from '../shared/utils.js';
import { MSG, SEVERITY } from '../shared/messages.js';
import { getRcaNomeById, refreshRcaSelectors } from './rcas.js';
import { removerClienteAction, salvarClienteAction } from './clientes/actions.js';
import { getClienteById, getClientes } from './clientes/repository.js';
import { parseTimes } from './clientes/domain.js';
import { checkClienteIdentity } from '../shared/clientes-pilot-bridge.js';
import { cliDom } from './clientes-legacy-shared.js';
import { createClientesLegacyForm } from './clientes-legacy-form.js';
import { createClientesLegacyOps } from './clientes-legacy-ops.js';

/** @typedef {import('../types/domain').ClientesModuleCallbacks} ClientesModuleCallbacks */

/** @type {NonNullable<ClientesModuleCallbacks['setFlowStep']>} */
let setFlowStepSafe = () => {};

/**
 * @param {ClientesModuleCallbacks} [callbacks]
 */
export function initClientesLegacyShell(callbacks = {}) {
  setFlowStepSafe = callbacks.setFlowStep || (() => {});
}

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

  /** @type {ReturnType<typeof createClientesLegacyForm> | null} */
  let clientesLegacyForm = null;
  /** @type {ReturnType<typeof createClientesLegacyOps> | null} */
  let clientesLegacyOps = null;

  function getLegacyForm() {
    if (clientesLegacyForm) return clientesLegacyForm;
    clientesLegacyForm = createClientesLegacyForm({
      State,
      cliDom,
      MSG,
      SEVERITY,
      notify,
      notifyGuided,
      focusField,
      abrirModal,
      fecharModal,
      refreshRcaSelectors,
      getRcaNomeById,
      parseTimes,
      getClientes,
      getClienteById,
      checkClienteIdentity,
      salvarClienteAction,
      renderCliMet,
      renderClientes,
      renderCliSegs,
      refreshCliDL,
      setFlowStepSafe
    });
    return clientesLegacyForm;
  }

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
    limparFormCli: () => getLegacyForm().limparFormCli(),
    editarCli: (id) => getLegacyForm().editarCli(id),
    salvarCliente: () => getLegacyForm().salvarCliente(),
    removerCli: (id) => getLegacyOps().removerCli(id)
  };
}
