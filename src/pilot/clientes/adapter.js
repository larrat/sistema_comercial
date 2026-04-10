import { findClienteIdentityConflict } from './identity.js';
import { filterClientes, getClienteSegmentos } from './filter.js';

export function toClientePilotRecord(cliente) {
  return {
    id: String(cliente.id),
    nome: cliente.nome,
    doc: cliente.doc ?? null,
    email: cliente.email ?? null,
    tel: cliente.tel ?? null,
    whatsapp: cliente.whatsapp ?? null
  };
}

export function checkClienteIdentity(input, existingClientes) {
  return findClienteIdentityConflict(
    toClientePilotRecord(input),
    existingClientes.map(toClientePilotRecord)
  );
}

export function filterClientesFromLegacy(clientes, filtro) {
  return filterClientes(clientes, filtro);
}

export function getClienteSegmentosFromLegacy(clientes) {
  return getClienteSegmentos(clientes);
}
