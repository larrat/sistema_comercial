// @ts-check

import { SB } from '../app/api.js';
import { D, State } from '../app/store.js';
import { createScreenDom } from '../shared/dom.js';
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
function isRuntimeBootstrapping() {
  return document.body.dataset.runtimeBootstrap === 'starting';
}

/** @type {ScreenDom} */
const cliDom = createScreenDom('clientes', [
  'cli-met',
  'cli-fil-seg',
  'cli-busca',
  'cli-fil-st',
  'cli-lista',
  'cli-segs-lista',
  'cli-modal-titulo',
  'cli-flow-save',
  'cli-dl',
  'cli-det-box',
  'c-rca'
]);

const AVC = [
  { bg: '#E6EEF9', c: '#0F2F5E' },
  { bg: '#E6F4EC', c: '#0D3D22' },
  { bg: '#FAF0D6', c: '#5C3900' },
  { bg: '#FAEBE9', c: '#731F18' }
];

/**
 * @param {ClientesModuleCallbacks} [callbacks]
 */
export function initClientesModule(callbacks = {}) {
  setFlowStepSafe = callbacks.setFlowStep || (() => {});
}

/**
 * @param {unknown} value
 */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {unknown} nome
 */
function avc(nome) {
  const value = String(nome || 'X');
  return AVC[value.charCodeAt(0) % AVC.length];
}

/**
 * @param {unknown} nome
 */
function ini(nome) {
  const parts = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'CL';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/**
 * @param {string | null | undefined} iso
 */
function fmtAniv(iso) {
  if (!iso) return '';
  const [year, month, day] = String(iso).split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}`;
}

/**
 * @param {string | null | undefined} iso
 */
function getDiasParaAniversario(iso) {
  if (!iso) return null;

  const [, month, day] = String(iso).split('-').map(Number);
  if (!month || !day) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let alvo = new Date(hoje.getFullYear(), month - 1, day);
  alvo.setHours(0, 0, 0, 0);

  if (alvo < hoje) {
    alvo = new Date(hoje.getFullYear() + 1, month - 1, day);
    alvo.setHours(0, 0, 0, 0);
  }

  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/**
 * @param {Cliente | null | undefined} cliente
 */
function getBadgeAniversario(cliente) {
  if (!cliente?.data_aniversario) return '';

  const dias = getDiasParaAniversario(cliente.data_aniversario);
  if (dias == null) {
    return `<span class="bdg bb">Aniv ${esc(fmtAniv(cliente.data_aniversario))}</span>`;
  }
  if (dias === 0) {
    return '<span class="bdg br">Aniv hoje</span>';
  }
  if (dias <= 7) {
    return `<span class="bdg ba">Aniv ${dias}d</span>`;
  }
  return `<span class="bdg bb">Aniv ${esc(fmtAniv(cliente.data_aniversario))}</span>`;
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
  isRuntimeBootstrapping
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
