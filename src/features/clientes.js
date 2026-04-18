// @ts-check

import { State } from '../app/store.js';
import { getClienteById, removeClienteLocal, upsertClienteLocal } from './clientes/repository.js';
import * as legacyList from './clientes-legacy.js';
import {
  abrirDetalheClienteReact,
  abrirFidelidadeClienteReact,
  abrirNovoClienteReact,
  abrirNotasClienteReact,
  editarClienteReact,
  excluirClienteReact,
  forceClientesReactMode,
  isClientesReactFeatureEnabled,
  setClientesReactFeatureEnabled,
  shouldRenderLegacyClientes,
  syncClientesReactBridge
} from './clientes-react-bridge.js';

let reactClienteSyncRegistered = false;
let legacyListFallbackEnabled = false;

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

function ensureReactClientes() {
  if (!isClientesReactFeatureEnabled()) {
    setClientesReactFeatureEnabled(true);
  }
  syncClientesReactBridge();
  legacyListFallbackEnabled = false;
  forceClientesReactMode();
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

export function initClientesModule() {
  ensureClientesReactSync();
  ensureReactClientes();
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
  ensureReactClientes();
  return abrirDetalheClienteReact(clienteId, tab);
}

/**
 * @param {string} clienteId
 */
export async function adicionarLancamentoFidelidade(clienteId) {
  ensureReactClientes();
  return abrirFidelidadeClienteReact(clienteId);
}

/**
 * @param {string} id
 */
export async function abrirCliDet(id) {
  ensureReactClientes();
  return abrirDetalheClienteReact(id, 'resumo');
}

/**
 * @param {string} pedidoId
 * @param {string} clienteId
 */
export async function fecharVendaCliente(pedidoId, clienteId) {
  void pedidoId;
  ensureReactClientes();
  return abrirDetalheClienteReact(clienteId, 'fechadas');
}

/**
 * @param {string} id
 */
export async function addNota(id) {
  ensureReactClientes();
  return abrirNotasClienteReact(id);
}

export function limparFormCli() {
  ensureReactClientes();
  return abrirNovoClienteReact();
}

/**
 * @param {string} id
 */
export function editarCli(id) {
  ensureReactClientes();
  return editarClienteReact(id);
}

export async function salvarCliente() {
  ensureReactClientes();
  return abrirNovoClienteReact();
}

/**
 * @param {string} id
 */
export async function removerCli(id) {
  ensureReactClientes();
  return excluirClienteReact(id);
}

export function refreshCliDL() {
  return legacyList.refreshCliDL();
}
