// @ts-check

import { SB } from '../../app/api.js';
import { D, State, invalidatePdCache } from '../../app/store.js';
import {
  deleteClienteRemote,
  removeClienteLocal,
  upsertClienteLocal,
  upsertClienteRemote
} from './repository.js';

/** @typedef {import('../../types/domain').Cliente} Cliente */
/** @typedef {import('../../types/domain').Pedido} Pedido */

/**
 * @param {Cliente} cliente
 * @param {string | null | undefined} editId
 */
export async function salvarClienteAction(cliente, editId) {
  try {
    await upsertClienteRemote(cliente);
  } catch (error) {
    return { ok: false, error };
  }

  upsertClienteLocal(cliente, editId);
  return { ok: true };
}

/**
 * @param {string} id
 */
export async function removerClienteAction(id) {
  try {
    await deleteClienteRemote(id);
  } catch (error) {
    return { ok: false, error };
  }

  removeClienteLocal(id);
  return { ok: true };
}

/**
 * @param {{ cliente_id: string; texto: string; data: string }} nota
 */
export async function adicionarNotaAction(nota) {
  const result = await SB.toResult(() => SB.insertNota(nota));
  if (!result.ok) return { ok: false, error: result.error };

  if (!D.notas) D.notas = {};
  if (!Array.isArray(D.notas[nota.cliente_id])) D.notas[nota.cliente_id] = [];
  D.notas[nota.cliente_id].unshift(nota);

  return { ok: true };
}

/**
 * @param {string} clienteId
 * @param {{ tipo: string; pontos: number; observacao: string | null }} payload
 */
export async function adicionarLancamentoFidelidadeAction(clienteId, payload) {
  const lancamento = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cliente_id: clienteId,
    filial_id: State.FIL,
    tipo: payload.tipo,
    status: 'confirmado',
    pontos: payload.pontos,
    origem: 'manual',
    observacao: payload.observacao
  };

  const result = await SB.toResult(() => SB.insertClienteFidelidadeLancamento(lancamento));
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, lancamento };
}

/**
 * @param {Pedido} pedido
 * @param {{ userEmail?: string | null }} [opts]
 */
export async function fecharVendaClienteAction(pedido, opts = {}) {
  const atualizado = {
    ...pedido,
    venda_fechada: true,
    venda_fechada_em: new Date().toISOString(),
    venda_fechada_por: String(opts.userEmail || '').trim() || null
  };

  try {
    await SB.upsertPedido({
      ...atualizado,
      itens: JSON.stringify(Array.isArray(atualizado.itens) ? atualizado.itens : [])
    });
  } catch (error) {
    return { ok: false, error };
  }

  if (!D.pedidos[State.FIL]) D.pedidos[State.FIL] = [];
  D.pedidos[State.FIL] = D.pedidos[State.FIL].map((item) =>
    item.id === pedido.id ? atualizado : item
  );
  invalidatePdCache();

  return { ok: true, pedido: atualizado };
}
