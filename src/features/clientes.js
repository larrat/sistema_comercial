// @ts-check

import { State } from '../app/store.js';
import { getClienteById, removeClienteLocal, upsertClienteLocal } from './clientes/repository.js';
import * as legacyList from './clientes-legacy.js';
import { createClientesLegacyDetailFallback } from './clientes-legacy-detail-fallback.js';
import {
  createClientesLegacyFormFallback,
  initClientesLegacyFormFallback
} from './clientes-legacy-form-fallback.js';
import { createClientesLegacyShell } from './clientes-legacy-shell.js';
import {
  abrirDetalheClienteReact,
  abrirFidelidadeClienteReact,
  abrirNovoClienteReact,
  abrirNotasClienteReact,
  editarClienteReact,
  excluirClienteReact,
  forceClientesReactMode,
  isClientesReactFeatureEnabled,
  shouldRenderLegacyClientes,
  syncClientesReactBridge
} from './clientes-react-bridge.js';

/** @typedef {import('../types/domain').ClientesModuleCallbacks} ClientesModuleCallbacks */

let reactClienteSyncRegistered = false;
const legacyShell = createClientesLegacyShell({
  renderCliMet: () => legacyList.renderCliMet(),
  renderClientes: () => legacyList.renderClientes(),
  renderCliSegs: () => legacyList.renderCliSegs(),
  refreshCliDL: () => legacyList.refreshCliDL()
});
const legacyFormFallback = createClientesLegacyFormFallback({
  renderCliMet: () => legacyList.renderCliMet(),
  renderClientes: () => legacyList.renderClientes(),
  renderCliSegs: () => legacyList.renderCliSegs(),
  refreshCliDL: () => legacyList.refreshCliDL()
});
const legacyDetailFallback = createClientesLegacyDetailFallback();

function useLegacyClientes() {
  syncClientesReactBridge();
  return shouldRenderLegacyClientes();
}

/**
 * @template T
 * @param {() => T} reactAction
 * @param {() => T} legacyAction
 * @returns {T}
 */
function routeClientesAction(reactAction, legacyAction) {
  syncClientesReactBridge();

  if (isClientesReactFeatureEnabled()) {
    forceClientesReactMode();
    const reactResult = reactAction();
    if (reactResult) return reactResult;
  }

  return legacyAction();
}

function ensureClientesReactSync() {
  if (reactClienteSyncRegistered || typeof window === 'undefined') return;
  reactClienteSyncRegistered = true;

  window.addEventListener('sc:cliente-salvo', (/** @type {CustomEvent} */ ev) => {
    const cliente = ev.detail;
    if (!cliente?.id || !cliente?.filial_id) return;

    const editId = getClienteById(cliente.id)?.id ?? null;
    upsertClienteLocal(cliente, editId);

    if (cliente.filial_id === State.FIL) {
      legacyList.refreshCliDL();
    }
  });

  window.addEventListener('sc:cliente-removido', (/** @type {CustomEvent} */ ev) => {
    const { id } = ev.detail ?? {};
    if (!id) return;

    removeClienteLocal(id);
    legacyList.refreshCliDL();
  });
}

/**
 * @param {ClientesModuleCallbacks} [callbacks]
 */
export function initClientesModule(callbacks = {}) {
  ensureClientesReactSync();
  initClientesLegacyFormFallback(callbacks);
}

export function renderCliMet() {
  if (!useLegacyClientes()) return;
  return legacyList.renderCliMet();
}

export function renderClientes() {
  if (!useLegacyClientes()) return;
  return legacyList.renderClientes();
}

export function renderCliSegs() {
  if (!useLegacyClientes()) return;
  return legacyList.renderCliSegs();
}

/**
 * @param {string} clienteId
 * @param {'resumo'|'abertas'|'fechadas'|'fidelidade'|'notas'} tab
 */
export function switchCliDetTab(clienteId, tab) {
  return routeClientesAction(
    () => abrirDetalheClienteReact(clienteId, tab),
    () => legacyDetailFallback.switchCliDetTab(clienteId, tab)
  );
}

/**
 * @param {string} clienteId
 */
export async function adicionarLancamentoFidelidade(clienteId) {
  return routeClientesAction(
    () => abrirFidelidadeClienteReact(clienteId),
    () => legacyDetailFallback.adicionarLancamentoFidelidade(clienteId)
  );
}

/**
 * @param {string} id
 */
export async function abrirCliDet(id) {
  return routeClientesAction(
    () => abrirDetalheClienteReact(id, 'resumo'),
    () => legacyDetailFallback.abrirCliDet(id)
  );
}

/**
 * @param {string} pedidoId
 * @param {string} clienteId
 */
export async function fecharVendaCliente(pedidoId, clienteId) {
  return routeClientesAction(
    () => abrirDetalheClienteReact(clienteId, 'fechadas'),
    () => legacyDetailFallback.fecharVendaCliente(pedidoId, clienteId)
  );
}

/**
 * @param {string} id
 */
export async function addNota(id) {
  return routeClientesAction(
    () => abrirNotasClienteReact(id),
    () => legacyDetailFallback.addNota(id)
  );
}

export function limparFormCli() {
  return routeClientesAction(
    () => abrirNovoClienteReact(),
    () => legacyFormFallback.limparFormCli()
  );
}

/**
 * @param {string} id
 */
export function editarCli(id) {
  return routeClientesAction(
    () => editarClienteReact(id),
    () => legacyFormFallback.editarCli(id)
  );
}

export async function salvarCliente() {
  return routeClientesAction(
    () => abrirNovoClienteReact(),
    () => legacyFormFallback.salvarCliente()
  );
}

/**
 * @param {string} id
 */
export async function removerCli(id) {
  return routeClientesAction(
    () => excluirClienteReact(id),
    () => legacyShell.removerCli(id)
  );
}

export function refreshCliDL() {
  if (!useLegacyClientes()) return;
  return legacyList.refreshCliDL();
}
