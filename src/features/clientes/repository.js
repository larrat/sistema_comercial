// @ts-check

import { SB } from '../../app/api.js';
import { D, State, C } from '../../app/store.js';

/** @typedef {import('../../types/domain').Cliente} Cliente */

function ensureClientesList() {
  if (!D.clientes[State.FIL]) D.clientes[State.FIL] = [];
  return D.clientes[State.FIL];
}

export function getClientes() {
  return C();
}

/**
 * @param {string} id
 */
export function getClienteById(id) {
  return C().find((item) => item.id === id) || null;
}

/**
 * @param {Cliente} cliente
 */
export async function upsertClienteRemote(cliente) {
  return SB.upsertCliente(cliente);
}

/**
 * @param {string} id
 */
export async function deleteClienteRemote(id) {
  return SB.deleteCliente(id);
}

/**
 * @param {Cliente} cliente
 * @param {string | null | undefined} editId
 */
export function upsertClienteLocal(cliente, editId) {
  const list = ensureClientesList();
  if (editId) {
    D.clientes[State.FIL] = list.map((item) => (item.id === editId ? cliente : item));
    return cliente;
  }
  list.push(cliente);
  return cliente;
}

/**
 * @param {string} id
 */
export function removeClienteLocal(id) {
  ensureClientesList();
  D.clientes[State.FIL] = C().filter((cliente) => cliente.id !== id);
}
