// @ts-check

import { createClientesLegacyDetailTabs } from './clientes-legacy-detail-tabs.js';
import { createClientesLegacyDetailSummary } from './clientes-legacy-detail-summary.js';

/**
 * @param {{
 *   D: import('../app/store.js').D;
 *   State: import('../app/store.js').State;
 *   SB: import('../app/api.js').SB;
 *   cliDom: import('../types/domain').ScreenDom;
 *   esc: (value: unknown) => string;
 *   avc: (nome: unknown) => { bg: string; c: string };
 *   ini: (nome: unknown) => string;
 *   fmtAniv: (iso?: string | null) => string;
 *   fmt: (value: number) => string;
 *   notify: (message: string, severity?: string) => void;
 *   toast: (message: string) => void;
 *   abrirModal: (id: string) => void;
 *   getContatoInfo: typeof import('./clientes/domain.js').getContatoInfo;
 *   normalizeDoc: typeof import('./clientes/domain.js').normalizeDoc;
 *   normalizeEmail: typeof import('./clientes/domain.js').normalizeEmail;
 *   normalizePhone: typeof import('./clientes/domain.js').normalizePhone;
 *   parseTimes: typeof import('./clientes/domain.js').parseTimes;
 *   PRAZO_DETALHE_LABELS: typeof import('./clientes/domain.js').PRAZO_DETALHE_LABELS;
 *   ST_B: typeof import('./clientes/domain.js').ST_B;
 *   ST_PED: typeof import('./clientes/domain.js').ST_PED;
 *   TAB_LABELS: typeof import('./clientes/domain.js').TAB_LABELS;
 *   getClientes: typeof import('./clientes/repository.js').getClientes;
 *   getClienteById: typeof import('./clientes/repository.js').getClienteById;
 *   getDiasParaAniversario: (iso?: string | null) => number | null;
 *   adicionarLancamentoFidelidadeAction: typeof import('./clientes/actions.js').adicionarLancamentoFidelidadeAction;
 *   adicionarNotaAction: typeof import('./clientes/actions.js').adicionarNotaAction;
 *   fecharVendaClienteAction: typeof import('./clientes/actions.js').fecharVendaClienteAction;
 *   renderPedMet: () => void;
 *   renderPedidos: () => void;
 *   SEVERITY: typeof import('../shared/messages.js').SEVERITY;
 * }} deps
 */
export function createClientesLegacyDetail(deps) {
  const {
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
    renderPedMet,
    renderPedidos,
    SEVERITY
  } = deps;

  /**
   * @param {import('../types/domain').Cliente} cliente
   * @returns {import('../types/domain').Pedido[]}
   */
  function getPedidosCliente(cliente) {
    return (D.pedidos?.[State.FIL] || [])
      .filter((pedido) => {
        const clienteId = String(cliente.id || '').trim();
        const pedidoClienteId = String(pedido?.cliente_id || '').trim();
        if (clienteId && pedidoClienteId) return pedidoClienteId === clienteId;

        const nome = String(cliente.nome || '')
          .trim()
          .toLowerCase();
        return (
          String(pedido?.cli || '')
            .trim()
            .toLowerCase() === nome
        );
      })
      .map((pedido) => ({
        ...pedido,
        itens: Array.isArray(pedido.itens)
          ? pedido.itens
          : (() => {
              try {
                const parsed = JSON.parse(String(pedido.itens || '[]'));
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
      }))
      .sort((a, b) => (b.num || 0) - (a.num || 0));
  }

  /**
   * @param {import('../types/domain').Pedido} pedido
   */
  function isPedidoFechavel(pedido) {
    return pedido.status === 'entregue' && !pedido.venda_fechada;
  }

  const detailTabs = createClientesLegacyDetailTabs({
    D,
    State,
    cliDom,
    esc,
    fmt,
    notify,
    toast,
    ST_PED,
    adicionarLancamentoFidelidadeAction,
    adicionarNotaAction,
    fecharVendaClienteAction,
    getClienteById,
    getPedidoById: (pedidoId) =>
      (D.pedidos?.[State.FIL] || []).find((item) => item.id === pedidoId),
    isPedidoFechavel,
    renderPedMet,
    renderPedidos,
    reopenDetail: async (clienteId) => abrirCliDet(clienteId),
    SEVERITY
  });

  const detailSummary = createClientesLegacyDetailSummary({
    esc,
    avc,
    ini,
    fmtAniv,
    getContatoInfo,
    normalizeDoc,
    normalizeEmail,
    normalizePhone,
    parseTimes,
    PRAZO_DETALHE_LABELS,
    ST_B,
    TAB_LABELS,
    getClientes,
    getDiasParaAniversario,
    isPedidoFechavel
  });

  /**
   * @param {string} id
   */
  async function abrirCliDet(id) {
    const cliente = getClienteById(id);
    if (!cliente) return;

    let notas = [];

    try {
      notas = (await SB.getNotas(id)) || [];
    } catch (error) {
      console.error('Erro ao carregar notas do cliente', error);
    }

    detailTabs.syncNotasCache(id, notas);

    const [fidelSaldo, fidelLancs] = await Promise.all([
      SB.toResult(() => SB.getClienteFidelidadeSaldo(id)),
      SB.toResult(() => SB.getClienteFidelidadeLancamentos(id))
    ]);

    /** @type {import('../types/domain').ClienteFidelidadeSaldo | null} */
    const saldo = fidelSaldo.ok ? fidelSaldo.data || null : null;
    /** @type {import('../types/domain').ClienteFidelidadeLancamento[]} */
    const lancamentos = fidelLancs.ok ? fidelLancs.data || [] : [];

    const pedidos = getPedidosCliente(cliente);
    const vendasFechadas = pedidos.filter((pedido) => !!pedido.venda_fechada);
    const vendasAbertas = pedidos.filter(
      (pedido) => !pedido.venda_fechada && pedido.status !== 'cancelado'
    );
    cliDom.html(
      'detail',
      'cli-det-box',
      `
      <div class="cli-detail">
        ${detailSummary.renderHeaderContext({
          cliente,
          pedidos
        })}

        <div class="tabs cli-detail-tabs">
          <button class="tb on" type="button" data-cli-tab="${id}" data-tab="resumo" data-click="switchCliDetTab('${id}','resumo')">Resumo</button>
          <button class="tb" type="button" data-cli-tab="${id}" data-tab="abertas" data-click="switchCliDetTab('${id}','abertas')">Vendas abertas <span class="bdg bk">${vendasAbertas.length}</span></button>
          <button class="tb" type="button" data-cli-tab="${id}" data-tab="fechadas" data-click="switchCliDetTab('${id}','fechadas')">Vendas fechadas <span class="bdg bb">${vendasFechadas.length}</span></button>
          <button class="tb" type="button" data-cli-tab="${id}" data-tab="fidelidade" data-click="switchCliDetTab('${id}','fidelidade')">Fidelidade ${saldo ? `<span class="bdg ${saldo.bloqueado ? 'br' : 'bg'}">${Number(saldo.saldo_pontos ?? 0)} pts</span>` : '<span class="bdg bk">-</span>'}</button>
        </div>

        ${detailSummary.renderResumoPanel({
          cliente,
          notasHtml: detailTabs.renderNotasHtml(D.notas?.[id] || [])
        })}

        <div class="tc" data-cli-panel="${id}" data-panel="abertas">
          <div class="cli-detail-label form-gap-bottom-xs">Pedidos em andamento ou entregues aguardando fechamento</div>
          <div class="cli-sales-list">
            ${detailTabs.renderClientePedidosLista(vendasAbertas, id, 'abertas')}
          </div>
        </div>

        <div class="tc" data-cli-panel="${id}" data-panel="fechadas">
          <div class="cli-detail-label form-gap-bottom-xs">Vendas fechadas deste cliente</div>
          <div class="cli-sales-list">
            ${detailTabs.renderClientePedidosLista(vendasFechadas, id, 'fechadas')}
          </div>
        </div>

        <div class="tc" data-cli-panel="${id}" data-panel="fidelidade">
          ${detailTabs.renderFidelidadeTab(id, saldo, lancamentos)}
        </div>

        <div class="cli-detail-actions">
        <button class="btn" data-click="fecharModal('modal-cli-det')">Fechar</button>
        <button class="btn btn-p" data-click="fecharModal('modal-cli-det');editarCli('${id}')">Editar</button>
        </div>
      </div>
    `,
      'clientes:detalhe'
    );

    abrirModal('modal-cli-det');
  }

  /**
   * @param {string} pedidoId
   * @param {string} clienteId
   */
  return {
    switchCliDetTab: detailTabs.switchCliDetTab,
    adicionarLancamentoFidelidade: detailTabs.adicionarLancamentoFidelidade,
    abrirCliDet,
    fecharVendaCliente: detailTabs.fecharVendaCliente,
    addNota: detailTabs.addNota
  };
}
