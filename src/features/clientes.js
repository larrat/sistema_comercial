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
let legacyListFallbackEnabled = false;
/** @type {ReturnType<typeof createClientesLegacyShell> | null} */
let legacyShell = null;
/** @type {ReturnType<typeof createClientesLegacyFormFallback> | null} */
let legacyFormFallback = null;
/** @type {ReturnType<typeof createClientesLegacyDetailFallback> | null} */
let legacyDetailFallback = null;

function getLegacyShell() {
  if (legacyShell) return legacyShell;
  legacyShell = createClientesLegacyShell({
    renderCliMet: () => legacyList.renderCliMet(),
    renderClientes: () => legacyList.renderClientes(),
    renderCliSegs: () => legacyList.renderCliSegs(),
    refreshCliDL: () => legacyList.refreshCliDL()
  });
  return legacyShell;
}

function getLegacyFormFallback() {
  if (legacyFormFallback) return legacyFormFallback;
  legacyFormFallback = createClientesLegacyFormFallback({
    renderCliMet: () => legacyList.renderCliMet(),
    renderClientes: () => legacyList.renderClientes(),
    renderCliSegs: () => legacyList.renderCliSegs(),
    refreshCliDL: () => legacyList.refreshCliDL()
  });
  return legacyFormFallback;
}

function getLegacyDetailFallback() {
  if (legacyDetailFallback) return legacyDetailFallback;
  legacyDetailFallback = createClientesLegacyDetailFallback();
  return legacyDetailFallback;
}

function shouldUseLegacyListFallback() {
  syncClientesReactBridge();

  if (!isClientesReactFeatureEnabled()) {
    legacyListFallbackEnabled = true;
    return true;
  }

  if (!shouldRenderLegacyClientes()) {
    legacyListFallbackEnabled = false;
    return false;
  }

  return legacyListFallbackEnabled;
}

function useReactClientes() {
  syncClientesReactBridge();
  const reactEnabled = isClientesReactFeatureEnabled();
  if (reactEnabled) {
    legacyListFallbackEnabled = false;
    forceClientesReactMode();
  }
  return reactEnabled;
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

  window.addEventListener('sc:clientes-react-fallback', () => {
    legacyListFallbackEnabled = true;
    legacyList.renderCliMet();
    legacyList.renderClientes();
    legacyList.renderCliSegs();
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
  if (!shouldUseLegacyListFallback()) return;
  return legacyList.renderCliMet();
}

export function renderClientes() {
  if (!shouldUseLegacyListFallback()) return;
  return legacyList.renderClientes();
}

export function renderCliSegs() {
  if (!shouldUseLegacyListFallback()) return;
  return legacyList.renderCliSegs();
}

/**
 * @param {string} clienteId
 * @param {'resumo'|'abertas'|'fechadas'|'fidelidade'|'notas'} tab
 */
export function switchCliDetTab(clienteId, tab) {
  if (useReactClientes()) return abrirDetalheClienteReact(clienteId, tab);
  return getLegacyDetailFallback().switchCliDetTab(clienteId, tab);
}

/**
 * @param {string} clienteId
 */
export async function adicionarLancamentoFidelidade(clienteId) {
  if (useReactClientes()) return abrirFidelidadeClienteReact(clienteId);
  return getLegacyDetailFallback().adicionarLancamentoFidelidade(clienteId);
}

/**
 * @param {string} id
 */
export async function abrirCliDet(id) {
  if (useReactClientes()) return abrirDetalheClienteReact(id, 'resumo');
  return getLegacyDetailFallback().abrirCliDet(id);
}

/**
 * @param {string} pedidoId
 * @param {string} clienteId
 */
export async function fecharVendaCliente(pedidoId, clienteId) {
  if (useReactClientes()) return abrirDetalheClienteReact(clienteId, 'fechadas');
  return getLegacyDetailFallback().fecharVendaCliente(pedidoId, clienteId);
}

/**
 * @param {string} id
 */
export async function addNota(id) {
  if (useReactClientes()) return abrirNotasClienteReact(id);
  return getLegacyDetailFallback().addNota(id);
}

export function limparFormCli() {
  if (useReactClientes()) return abrirNovoClienteReact();
  return getLegacyFormFallback().limparFormCli();
}

/**
 * @param {string} id
 */
export function editarCli(id) {
  if (useReactClientes()) return editarClienteReact(id);
  return getLegacyFormFallback().editarCli(id);
}

export async function salvarCliente() {
  if (useReactClientes()) return abrirNovoClienteReact();
  return getLegacyFormFallback().salvarCliente();
}

/**
 * @param {string} id
 */
export async function removerCli(id) {
  if (useReactClientes()) return excluirClienteReact(id);
  return getLegacyShell().removerCli(id);
}

export function refreshCliDL() {
  return legacyList.refreshCliDL();
}
