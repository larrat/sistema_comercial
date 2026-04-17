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
import { measureRender } from '../shared/render-metrics.js';
import { MSG, SEVERITY } from '../shared/messages.js';
import { renderPedMet, renderPedidos } from './pedidos.js';
import { getRcaNomeById, refreshRcaSelectors } from './rcas.js';
import { buildSkeletonLines } from './runtime-loading.js';
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
  PRAZO_LABELS,
  ST_B,
  ST_PED,
  TAB_LABELS
} from './clientes/domain.js';
import {
  checkClienteIdentity,
  filterClientesFromLegacy,
  getClienteSegmentosFromLegacy
} from '../shared/clientes-pilot-bridge.js';
import {
  avc,
  cliDom,
  esc,
  fmtAniv,
  getBadgeAniversario,
  getDiasParaAniversario,
  ini,
  isClientesRuntimeBootstrapping
} from './clientes-legacy-shared.js';
import { createClientesLegacyDetail } from './clientes-legacy-detail.js';
import { createClientesLegacyForm } from './clientes-legacy-form.js';
import { createClientesLegacyList } from './clientes-legacy-list.js';
import { createClientesLegacyOps } from './clientes-legacy-ops.js';

/** @typedef {import('../types/domain').Cliente} Cliente */
/** @typedef {import('../types/domain').Pedido} Pedido */
/** @typedef {import('../types/domain').ClientesModuleCallbacks} ClientesModuleCallbacks */
/** @typedef {import('../types/domain').ScreenDom} ScreenDom */

/** @type {NonNullable<ClientesModuleCallbacks['setFlowStep']>} */
let setFlowStepSafe = () => {};

/**
 * @param {ClientesModuleCallbacks} [callbacks]
 */
export function initClientesModule(callbacks = {}) {
  setFlowStepSafe = callbacks.setFlowStep || (() => {});
}

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

const clientesLegacyList = createClientesLegacyList({
  cliDom,
  esc,
  avc,
  ini,
  getBadgeAniversario,
  getClientes,
  getContatoInfo,
  parseTimes,
  TAB_LABELS,
  PRAZO_LABELS,
  ST_B,
  filterClientesFromLegacy,
  getClienteSegmentosFromLegacy,
  measureRender,
  buildSkeletonLines,
  isRuntimeBootstrapping: isClientesRuntimeBootstrapping
});

const clientesLegacyOps = createClientesLegacyOps({
  removerClienteAction,
  toast,
  renderCliMet: () => clientesLegacyList.renderCliMet(),
  renderClientes: () => clientesLegacyList.renderClientes(),
  renderCliSegs: () => clientesLegacyList.renderCliSegs(),
  refreshCliDL: () => clientesLegacyList.refreshCliDL()
});

/**
 * @param {string} clienteId
 * @param {'resumo'|'abertas'|'fechadas'|'fidelidade'} tab
 */
export function switchCliDetTab(clienteId, tab) {
  return clientesLegacyDetail.switchCliDetTab(clienteId, tab);
}

export function renderCliMet() {
  return clientesLegacyList.renderCliMet();
}

export function renderClientes() {
  return clientesLegacyList.renderClientes();
}

export function renderCliSegs() {
  return clientesLegacyList.renderCliSegs();
}

// ── Fidelidade UI ─────────────────────────────────────────────────────────────

/**
 * @param {string} clienteId
 * @param {import('../types/domain').ClienteFidelidadeSaldo | null} saldo
 * @param {import('../types/domain').ClienteFidelidadeLancamento[]} lancamentos
 * @returns {string}
 */

/**
 * Lança pontos de fidelidade manualmente para um cliente.
 * @param {string} clienteId
 */
export async function adicionarLancamentoFidelidade(clienteId) {
  return clientesLegacyDetail.adicionarLancamentoFidelidade(clienteId);
}

export async function abrirCliDet(id) {
  return clientesLegacyDetail.abrirCliDet(id);
}

/**
 * @param {string} pedidoId
 * @param {string} clienteId
 */
export async function fecharVendaCliente(pedidoId, clienteId) {
  return clientesLegacyDetail.fecharVendaCliente(pedidoId, clienteId);
}

export async function addNota(id) {
  return clientesLegacyDetail.addNota(id);
}

export function limparFormCli() {
  return clientesLegacyForm.limparFormCli();
}

export function editarCli(id) {
  return clientesLegacyForm.editarCli(id);
}

export async function salvarCliente() {
  return clientesLegacyForm.salvarCliente();
}

export async function removerCli(id) {
  return clientesLegacyOps.removerCli(id);
}

export function refreshCliDL() {
  return clientesLegacyList.refreshCliDL();
}
