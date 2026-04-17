// @ts-check

import { State } from '../app/store.js';
import { getClienteById, removeClienteLocal, upsertClienteLocal } from './clientes/repository.js';
import * as legacy from './clientes-legacy.js';
import {
  abrirDetalheClienteReact,
  abrirFidelidadeClienteReact,
  abrirNovoClienteReact,
  abrirNotasClienteReact,
  editarClienteReact,
  excluirClienteReact,
  shouldRenderLegacyClientes,
  syncClientesReactBridge
} from './clientes-react-bridge.js';

/** @typedef {import('../types/domain').ClientesModuleCallbacks} ClientesModuleCallbacks */

let reactClienteSyncRegistered = false;

function useLegacyClientes() {
  syncClientesReactBridge();
  return shouldRenderLegacyClientes();
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
      legacy.refreshCliDL();
    }
  });

  window.addEventListener('sc:cliente-removido', (/** @type {CustomEvent} */ ev) => {
    const { id } = ev.detail ?? {};
    if (!id) return;

    removeClienteLocal(id);
    legacy.refreshCliDL();
  });
}

/**
 * @param {ClientesModuleCallbacks} [callbacks]
 */
export function initClientesModule(callbacks = {}) {
  ensureClientesReactSync();
  legacy.initClientesModule(callbacks);
}

export function renderCliMet() {
  if (!useLegacyClientes()) return;
  return legacy.renderCliMet();
}

export function renderClientes() {
  if (!useLegacyClientes()) return;
  return legacy.renderClientes();
}

export function renderCliSegs() {
  if (!useLegacyClientes()) return;
  return legacy.renderCliSegs();
}

/**
 * @param {string} clienteId
 * @param {'resumo'|'abertas'|'fechadas'|'fidelidade'|'notas'} tab
 */
export function switchCliDetTab(clienteId, tab) {
  if (!useLegacyClientes()) {
    abrirDetalheClienteReact(clienteId, tab);
    return;
  }
  return legacy.switchCliDetTab(clienteId, tab);
}

/**
 * @param {string} clienteId
 */
export async function adicionarLancamentoFidelidade(clienteId) {
  if (!useLegacyClientes()) {
    abrirFidelidadeClienteReact(clienteId);
    return;
  }
  return legacy.adicionarLancamentoFidelidade(clienteId);
}

/**
 * @param {string} id
 */
export async function abrirCliDet(id) {
  if (!useLegacyClientes()) {
    abrirDetalheClienteReact(id, 'resumo');
    return;
  }
  return legacy.abrirCliDet(id);
}

/**
 * @param {string} pedidoId
 * @param {string} clienteId
 */
export async function fecharVendaCliente(pedidoId, clienteId) {
  if (!useLegacyClientes()) {
    abrirDetalheClienteReact(clienteId, 'fechadas');
    return;
  }
  return legacy.fecharVendaCliente(pedidoId, clienteId);
}

/**
 * @param {string} id
 */
export async function addNota(id) {
  if (!useLegacyClientes()) {
    abrirNotasClienteReact(id);
    return;
  }
  return legacy.addNota(id);
}

export function limparFormCli() {
  if (!useLegacyClientes()) {
    abrirNovoClienteReact();
    return;
  }
  return legacy.limparFormCli();
}

/**
 * @param {string} id
 */
export function editarCli(id) {
  if (!useLegacyClientes()) {
    editarClienteReact(id);
    return;
  }
  return legacy.editarCli(id);
}

export async function salvarCliente() {
  if (!useLegacyClientes()) {
    abrirNovoClienteReact();
    return;
  }
  return legacy.salvarCliente();
}

/**
 * @param {string} id
 */
export async function removerCli(id) {
  if (!useLegacyClientes()) {
    excluirClienteReact(id);
    return;
  }
  return legacy.removerCli(id);
}

export function refreshCliDL() {
  if (!useLegacyClientes()) return;
  return legacy.refreshCliDL();
}
