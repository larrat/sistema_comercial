// @ts-check

import { State } from '../app/store.js';
import {
  getClienteById,
  getClientes,
  removeClienteLocal,
  upsertClienteLocal
} from './clientes/repository.js';
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
  syncClientesReactBridge
} from './clientes-react-bridge.js';

let reactClienteSyncRegistered = false;

function ensureReactClientes() {
  if (!isClientesReactFeatureEnabled()) {
    setClientesReactFeatureEnabled(true);
  }
  syncClientesReactBridge();
  forceClientesReactMode();
}

function refreshClienteDatalist() {
  const datalist = document.getElementById('cli-dl');
  if (!(datalist instanceof HTMLElement)) return;

  datalist.replaceChildren(
    ...getClientes().map((cliente) => {
      const option = document.createElement('option');
      option.value = String(cliente?.nome || '');
      return option;
    })
  );
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
      refreshClienteDatalist();
    }
  });

  window.addEventListener('sc:cliente-removido', (/** @type {CustomEvent} */ ev) => {
    const { id } = ev.detail ?? {};
    if (!id) return;

    removeClienteLocal(id);
    refreshClienteDatalist();
  });

  window.addEventListener('sc:clientes-react-fallback', () => {
    console.warn(
      '[clientes] bridge React sinalizou fallback, mas a superfície legada foi desativada.'
    );
  });
}

export function initClientesModule() {
  ensureClientesReactSync();
  ensureReactClientes();
}

export function renderCliMet() {
  ensureReactClientes();
}

export function renderClientes() {
  ensureReactClientes();
}

export function renderCliSegs() {
  ensureReactClientes();
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
  return refreshClienteDatalist();
}
