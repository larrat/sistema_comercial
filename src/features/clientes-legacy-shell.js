// @ts-check

import { SB } from '../app/api.js';
import { D, State } from '../app/store.js';
import {
  abrirModal,
  fecharModal,
  toast,
  notify,
  notifyGuided,
  focusField,
  fmt
} from '../shared/utils.js';
import { MSG, SEVERITY } from '../shared/messages.js';
import { renderPedMet, renderPedidos } from './pedidos.js';
import { getRcaNomeById, refreshRcaSelectors } from './rcas.js';
import {
  adicionarLancamentoFidelidadeAction,
  adicionarNotaAction,
  fecharVendaClienteAction,
  removerClienteAction,
  salvarClienteAction
} from './clientes/actions.js';
import { getClienteById, getClientes } from './clientes/repository.js';
import {
  getContatoInfo,
  normalizeDoc,
  normalizeEmail,
  normalizePhone,
  parseTimes,
  PRAZO_DETALHE_LABELS,
  ST_B,
  ST_PED,
  TAB_LABELS
} from './clientes/domain.js';
import { checkClienteIdentity } from '../shared/clientes-pilot-bridge.js';
import {
  avc,
  cliDom,
  esc,
  fmtAniv,
  getDiasParaAniversario,
  ini
} from './clientes-legacy-shared.js';
import { createClientesLegacyDetail } from './clientes-legacy-detail.js';
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

  const clientesLegacyDetail = createClientesLegacyDetail({
    D,
    State,
    SB,
    cliDom,
    esc,
    avc,
    ini,
    fmtAniv,
    fmt,
    notify,
    toast,
    abrirModal,
    getContatoInfo,
    normalizeDoc,
    normalizeEmail,
    normalizePhone,
    parseTimes,
    PRAZO_DETALHE_LABELS,
    ST_B,
    ST_PED,
    TAB_LABELS,
    getClientes,
    getClienteById,
    getDiasParaAniversario,
    adicionarLancamentoFidelidadeAction,
    adicionarNotaAction,
    fecharVendaClienteAction,
    renderPedMet,
    renderPedidos,
    SEVERITY
  });

  const clientesLegacyForm = createClientesLegacyForm({
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

  const clientesLegacyOps = createClientesLegacyOps({
    removerClienteAction,
    toast,
    renderCliMet,
    renderClientes,
    renderCliSegs,
    refreshCliDL
  });

  return {
    switchCliDetTab: clientesLegacyDetail.switchCliDetTab,
    adicionarLancamentoFidelidade: clientesLegacyDetail.adicionarLancamentoFidelidade,
    abrirCliDet: clientesLegacyDetail.abrirCliDet,
    fecharVendaCliente: clientesLegacyDetail.fecharVendaCliente,
    addNota: clientesLegacyDetail.addNota,
    limparFormCli: clientesLegacyForm.limparFormCli,
    editarCli: clientesLegacyForm.editarCli,
    salvarCliente: clientesLegacyForm.salvarCliente,
    removerCli: clientesLegacyOps.removerCli
  };
}
