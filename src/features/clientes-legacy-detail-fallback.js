// @ts-check

import { SB } from '../app/api.js';
import { D, State } from '../app/store.js';
import { abrirModal, fmt, notify, toast } from '../shared/utils.js';
import { SEVERITY } from '../shared/messages.js';
import { renderPedMet, renderPedidos } from './pedidos.js';
import {
  adicionarLancamentoFidelidadeAction,
  adicionarNotaAction,
  fecharVendaClienteAction
} from './clientes/actions.js';
import { getClienteById, getClientes } from './clientes/repository.js';
import {
  getContatoInfo,
  normalizeDoc,
  normalizeEmail,
  normalizePhone,
  parseTimes,
  PRAZO_DETALHE_LABELS,
  ST_B,
  ST_PED,
  TAB_LABELS
} from './clientes/domain.js';
import {
  avc,
  cliDom,
  esc,
  fmtAniv,
  getDiasParaAniversario,
  ini
} from './clientes-legacy-shared.js';
import { createClientesLegacyDetail } from './clientes-legacy-detail.js';

/**
 * @param {{ renderPedMet?: () => void; renderPedidos?: () => void }} [deps]
 */
export function createClientesLegacyDetailFallback(deps = {}) {
  /** @type {ReturnType<typeof createClientesLegacyDetail> | null} */
  let legacyDetail = null;

  function getLegacyDetail() {
    if (legacyDetail) return legacyDetail;
    legacyDetail = createClientesLegacyDetail({
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
      renderPedMet: deps.renderPedMet || renderPedMet,
      renderPedidos: deps.renderPedidos || renderPedidos,
      SEVERITY
    });
    return legacyDetail;
  }

  return {
    switchCliDetTab: (clienteId, tab) => getLegacyDetail().switchCliDetTab(clienteId, tab),
    adicionarLancamentoFidelidade: (clienteId) =>
      getLegacyDetail().adicionarLancamentoFidelidade(clienteId),
    abrirCliDet: (id) => getLegacyDetail().abrirCliDet(id),
    fecharVendaCliente: (pedidoId, clienteId) =>
      getLegacyDetail().fecharVendaCliente(pedidoId, clienteId),
    addNota: (id) => getLegacyDetail().addNota(id)
  };
}
