/**
 * Adapter entre o domínio legado (Cliente de domain.d.ts) e o piloto.
 *
 * O legado chama este adapter; o piloto não sabe do legado.
 * Propósito: desacoplar o código procedural de clientes.js das
 * funções puras do piloto sem reescrever o legado de uma vez.
 */

import type { Cliente } from '../../types/domain';
import type { ClienteFiltro } from './filter';
import type { ClienteIdentityConflict, ClientePilotRecord } from './types';
import { findClienteIdentityConflict } from './identity';
import { filterClientes, getClienteSegmentos } from './filter';

// ---------------------------------------------------------------------------
// Mapeamento de tipos
// ---------------------------------------------------------------------------

export function toClientePilotRecord(cliente: Cliente): ClientePilotRecord {
  return {
    id: String(cliente.id),
    nome: cliente.nome,
    doc: cliente.doc ?? null,
    email: cliente.email ?? null,
    tel: cliente.tel ?? null,
    whatsapp: cliente.whatsapp ?? null
  };
}

// ---------------------------------------------------------------------------
// Identidade
// ---------------------------------------------------------------------------

/**
 * Verifica duplicidade usando as regras do piloto.
 * Aceita registros do domínio legado diretamente.
 */
export function checkClienteIdentity(
  input: Cliente,
  existingClientes: Cliente[]
): ClienteIdentityConflict | null {
  return findClienteIdentityConflict(
    toClientePilotRecord(input),
    existingClientes.map(toClientePilotRecord)
  );
}

// ---------------------------------------------------------------------------
// Filtro
// ---------------------------------------------------------------------------

/**
 * Filtra a lista de clientes usando as regras puras do piloto.
 * Drop-in replacement para getFilteredClientes() do legado, mas sem
 * acesso a DOM ou estado global — recebe dados como argumentos.
 */
export function filterClientesFromLegacy(clientes: Cliente[], filtro: ClienteFiltro): Cliente[] {
  return filterClientes(clientes, filtro);
}

/**
 * Retorna segmentos únicos ordenados.
 * Drop-in replacement para getClienteSegmentos() do legado.
 */
export function getClienteSegmentosFromLegacy(clientes: Cliente[]): string[] {
  return getClienteSegmentos(clientes);
}
