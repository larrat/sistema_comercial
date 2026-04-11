// @ts-check

import { SB } from '../app/api.js';
import { D, State, P, PD, C, CR, invalidatePdCache } from '../app/store.js';
import {
  abrirModal,
  fecharModal,
  uid,
  fmt,
  toast,
  prV,
  notify,
  focusField
} from '../shared/utils.js';
import { esc } from '../shared/sanitize.js';
import { MSG, SEVERITY } from '../shared/messages.js';
import { getRcaNomeById, refreshRcaSelectors } from './rcas.js';

/** @typedef {import('../types/domain').Pedido} Pedido */
/** @typedef {import('../types/domain').PedidoItem} PedidoItem */
/** @typedef {import('../types/domain').PedidosModuleCallbacks} PedidosModuleCallbacks */

let refreshProdSelSafe = () => {};
let refreshCliDLSafe = () => {};

/**
 * @param {PedidosModuleCallbacks} [callbacks]
 */
export function initPedidosModule(callbacks = {}) {
  refreshProdSelSafe = callbacks.refreshProdSel || (() => {});
  refreshCliDLSafe = callbacks.refreshCliDL || (() => {});
}

/**
 * @param {Pedido | undefined} pedido
 * @returns {PedidoItem[]}
 */
function getPedidoItens(pedido) {
  if (!pedido?.itens) return [];
  if (Array.isArray(pedido.itens)) return pedido.itens;
  try {
    const parsed = JSON.parse(pedido.itens || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const ST_PED = {
  orcamento: '<span class="bdg bk">Orcamento</span>',
  confirmado: '<span class="bdg bb">Confirmado</span>',
  em_separacao: '<span class="bdg ba">Em separação</span>',
  entregue: '<span class="bdg bg">Entregue</span>',
  cancelado: '<span class="bdg br">Cancelado</span>'
};

const TAB_STATUSES = {
  emaberto: ['orcamento', 'confirmado', 'em_separacao'],
  entregues: ['entregue'],
  cancelados: ['cancelado']
};

/** @type {Record<string, number>} */
const PRAZO_DIAS = { '7d': 7, '15d': 15, '30d': 30, '60d': 60 };

/** Próximo status na progressão operacional */
const NEXT_STATUS = {
  orcamento: 'confirmado',
  confirmado: 'em_separacao',
  em_separacao: 'entregue'
};

/** Label do botão de avanço por status atual */
const ACAO_LABEL = {
  orcamento: 'Confirmar',
  confirmado: 'Em Separação',
  em_separacao: 'Entregar'
};

/**
 * Calcula a data de vencimento somando dias ao prazo.
 * @param {string | undefined} dataBase - YYYY-MM-DD
 * @param {string | undefined} prazo
 * @returns {string | null} YYYY-MM-DD ou null se imediato
 */
function calcVencimento(dataBase, prazo) {
  const dias = PRAZO_DIAS[prazo || ''];
  if (!dias) return null;
  const base = dataBase ? new Date(dataBase + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString().split('T')[0];
}

/**
 * Gera conta a receber quando pedido vira "entregue" pela primeira vez,
 * se o prazo tiver dias configurados.
 * @param {Pedido} ped
 * @param {string} statusAnterior
 */
async function _gerarContaSeNecessario(ped, statusAnterior) {
  if (ped.status !== 'entregue' || statusAnterior === 'entregue') return;
  const vencimento = calcVencimento(ped.data, ped.prazo);
  if (!vencimento) return;
  if (CR().some((cr) => cr.pedido_id === ped.id)) return;

  /** @type {import('../types/domain').ContaReceber} */
  const conta = {
    id: uid(),
    filial_id: /** @type {string} */ (State.FIL),
    pedido_id: ped.id,
    pedido_num: ped.num,
    cliente_id: ped.cliente_id || null,
    cliente: ped.cli,
    valor: ped.total,
    vencimento,
    status: 'pendente'
  };
  try {
    await SB.upsertContaReceber(conta);
    if (!D.contasReceber) D.contasReceber = {};
    if (!D.contasReceber[State.FIL]) D.contasReceber[State.FIL] = [];
    D.contasReceber[State.FIL].push(conta);
  } catch (e) {
    console.error('Falha ao gerar conta a receber para pedido #' + ped.num, e);
  }
}

/**
 * @param {Pedido | null | undefined} pedido
 */
function getPedidoCliente(pedido) {
  if (pedido?.cliente_id) {
    const byId = C().find((cliente) => cliente.id === pedido.cliente_id);
    if (byId) return byId;
  }

  const nome = String(pedido?.cli || '')
    .trim()
    .toLowerCase();
  if (!nome) return null;
  return (
    C().find(
      (cliente) =>
        String(cliente?.nome || '')
          .trim()
          .toLowerCase() === nome
    ) || null
  );
}

/**
 * @param {Pedido | null | undefined} pedido
 */
function getPedidoClienteLabel(pedido) {
  return String(getPedidoCliente(pedido)?.nome || pedido?.cli || '-').trim() || '-';
}

/**
 * @param {string} raw
 */
function findClienteByPedidoInput(raw) {
  const termo = String(raw || '').trim();
  if (!termo) return null;

  const lower = termo.toLowerCase();
  return (
    C().find(
      (cliente) =>
        cliente.id === termo ||
        String(cliente?.nome || '')
          .trim()
          .toLowerCase() === lower
    ) || null
  );
}

export function syncPedidoRcaComCliente() {
  const cliente = findClienteByPedidoInput(document.getElementById('pd-cli')?.value || '');
  const rcaEl = /** @type {HTMLSelectElement | null} */ (document.getElementById('pd-rca'));
  if (!rcaEl) return;
  rcaEl.value = String(cliente?.rca_id || '').trim();
}

/**
 * @param {'emaberto' | 'entregues' | 'cancelados'} tab
 */
export function switchPedTab(tab) {
  ['emaberto', 'entregues', 'cancelados'].forEach((t) => {
    document.getElementById(`pedidos-tc-${t}`)?.classList.toggle('on', t === tab);
  });
  const tabBtns = document.querySelectorAll('#pg-pedidos .tabs .tb');
  const names = ['emaberto', 'entregues', 'cancelados'];
  tabBtns.forEach((btn, i) => btn.classList.toggle('on', names[i] === tab));
  renderPedidos();
}

export function renderPedMet() {
  const peds = PD();
  const fat = peds.filter((p) => p.status === 'entregue').reduce((a, p) => a + (p.total || 0), 0);
  const lucro = peds
    .filter((p) => p.status === 'entregue')
    .reduce(
      (a, p) =>
        a +
        (Array.isArray(p.itens) ? p.itens : []).reduce(
          (b, i) => b + (i.preco - i.custo) * i.qty,
          0
        ),
      0
    );
  const ab = peds.filter((p) =>
    ['orcamento', 'confirmado', 'em_separacao'].includes(p.status)
  ).length;

  const el = document.getElementById('ped-met');
  if (!el) return;

  el.innerHTML = `
    <div class="met"><div class="ml">Total</div><div class="mv">${peds.length}</div></div>
    <div class="met"><div class="ml">Faturamento</div><div class="mv kpi-value-sm">${fmt(fat)}</div></div>
    <div class="met"><div class="ml">Lucro</div><div class="mv kpi-value-sm tone-success">${fmt(lucro)}</div></div>
    <div class="met"><div class="ml">Em aberto</div><div class="mv tone-warning">${ab}</div></div>
  `;
}

export function renderPedidos() {
  renderPedList('ped-busca', 'ped-fil-st', 'ped-lista', TAB_STATUSES.emaberto, false, true);
  renderPedList(
    'ped-busca-entregues',
    null,
    'ped-lista-entregues',
    TAB_STATUSES.entregues,
    true,
    false
  );
  renderPedList(
    'ped-busca-cancelados',
    null,
    'ped-lista-cancelados',
    TAB_STATUSES.cancelados,
    false,
    false
  );
}

/**
 * @param {string} buscaId
 * @param {string | null} filtroId
 * @param {string} listaId
 * @param {string[]} statuses
 * @param {boolean} showGerarCr - mostra botão "Gerar A Receber" para pedidos sem conta
 * @param {boolean} showAvancar - mostra botão de avanço de status inline
 */
function renderPedList(buscaId, filtroId, listaId, statuses, showGerarCr, showAvancar) {
  const buscaEl = document.getElementById(buscaId);
  const stEl = filtroId ? document.getElementById(filtroId) : null;
  const el = document.getElementById(listaId);
  if (!el) return;

  const q = (buscaEl?.value || '').toLowerCase();
  const st = stEl?.value || '';

  const f = [...PD()]
    .sort((a, b) => (b.num || 0) - (a.num || 0))
    .filter(
      (p) =>
        statuses.includes(p.status) &&
        (!q ||
          getPedidoClienteLabel(p).toLowerCase().includes(q) ||
          String(p.num || '').includes(q)) &&
        (!st || p.status === st)
    );

  if (!f.length) {
    el.innerHTML = `<div class="empty"><div class="ico">PED</div><p>Nenhum pedido encontrado.</p></div>`;
    return;
  }

  const pgtoLbl = {
    a_vista: 'A vista',
    pix: 'PIX',
    boleto: 'Boleto',
    cartao: 'Cartao',
    cheque: 'Cheque'
  };

  const isMobile = window.matchMedia('(max-width: 1080px)').matches;
  if (isMobile) {
    el.innerHTML = f
      .map(
        (p) => `
      <div class="mobile-card">
        <div class="mobile-card-head">
          <div class="mobile-card-grow">
            <div class="mobile-card-title">#${p.num} | ${esc(getPedidoClienteLabel(p))}</div>
            <div class="mobile-card-sub">${p.data || 'Sem data'} | ${(p.itens || []).length} item(ns)</div>
          </div>
          <div>${ST_PED[p.status] || ''}</div>
        </div>

        <div class="mobile-card-tags">
          ${p.tipo === 'atacado' ? '<span class="bdg ba">Atacado</span>' : '<span class="bdg bb">Varejo</span>'}
          <span class="bdg bk">${pgtoLbl[p.pgto] || p.pgto || '-'}</span>
        </div>

        <div class="mobile-card-meta">
          <div>Total: <b class="meta-emphasis">${fmt(p.total || 0)}</b></div>
          <div>Prazo: <b class="meta-emphasis">${p.prazo || '-'}</b></div>
        </div>

        <div class="mobile-card-actions">
          <button class="btn btn-sm" title="Ver pedido" data-click="verPed('${p.id}')">Ver</button>
          <button class="btn btn-sm" title="Editar pedido" data-click="editarPed('${p.id}')">Editar</button>
          <button class="btn btn-sm" title="Excluir pedido" data-click="removerPed('${p.id}')">Excluir</button>
          ${showGerarCr && !CR().some((c) => c.pedido_id === p.id) ? `<button class="btn btn-sm btn-p" title="Gerar conta a receber" data-click="gerarContaManual('${p.id}')">A Receber</button>` : ''}
          ${showAvancar && ACAO_LABEL[p.status] ? `<button class="btn btn-sm ${p.status === 'em_separacao' ? 'btn-p' : ''}" title="${ACAO_LABEL[p.status]}" data-click="avancarStatusPed('${p.id}')">${ACAO_LABEL[p.status]}</button>` : ''}
        </div>
      </div>
    `
      )
      .join('');
    return;
  }

  el.innerHTML = `
    <div class="tw">
      <table class="tbl orders-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Cliente</th>
            <th>Data</th>
            <th>Tipo</th>
            <th>Itens</th>
            <th>Total</th>
            <th>Pgto</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${f
            .map(
              (p) => `
            <tr>
              <td class="table-cell-strong table-cell-muted">#${p.num}</td>
              <td class="table-cell-strong">${esc(getPedidoClienteLabel(p))}</td>
              <td class="table-cell-muted">${p.data || '-'}</td>
              <td>${p.tipo === 'atacado' ? '<span class="bdg ba">Atacado</span>' : '<span class="bdg bb">Varejo</span>'}</td>
              <td class="table-cell-muted">${(p.itens || []).length}</td>
              <td class="table-cell-strong">${fmt(p.total || 0)}</td>
              <td class="table-cell-caption table-cell-muted">${pgtoLbl[p.pgto] || p.pgto || '-'}</td>
              <td>${ST_PED[p.status] || ''}</td>
              <td>
                <div class="fg2 orders-row-actions">
                  <button class="btn btn-sm" title="Ver pedido" data-click="verPed('${p.id}')">Ver</button>
                  <button class="btn btn-sm" title="Editar pedido" data-click="editarPed('${p.id}')">Editar</button>
                  <button class="btn btn-sm" title="Excluir pedido" data-click="removerPed('${p.id}')">Excluir</button>
                  ${showGerarCr && !CR().some((c) => c.pedido_id === p.id) ? `<button class="btn btn-sm btn-p" title="Gerar conta a receber" data-click="gerarContaManual('${p.id}')">A Receber</button>` : ''}
                  ${showAvancar && ACAO_LABEL[p.status] ? `<button class="btn btn-sm ${p.status === 'em_separacao' ? 'btn-p' : ''}" title="${ACAO_LABEL[p.status]}" data-click="avancarStatusPed('${p.id}')">${ACAO_LABEL[p.status]}</button>` : ''}
                </div>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function limparFormPed() {
  State.editIds.ped = null;
  State.pedItens = [];

  const titulo = document.getElementById('ped-modal-titulo');
  if (titulo) titulo.textContent = 'Novo pedido';
  refreshRcaSelectors();

  ['pd-cli', 'pd-obs'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const rcaEl = document.getElementById('pd-rca');
  if (rcaEl) rcaEl.value = '';

  const dataEl = document.getElementById('pd-data');
  if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];

  const statusEl = document.getElementById('pd-status');
  const pgtoEl = document.getElementById('pd-pgto');
  const prazoEl = document.getElementById('pd-prazo');
  const tipoEl = document.getElementById('pd-tipo');
  const prodEl = document.getElementById('pi-prod');
  const qtyEl = document.getElementById('pi-qty');
  const precoEl = document.getElementById('pi-preco');
  const custoEl = document.getElementById('pi-custo');

  if (statusEl) statusEl.value = 'orcamento';
  if (pgtoEl) pgtoEl.value = 'a_vista';
  if (prazoEl) prazoEl.value = 'imediato';
  if (tipoEl) tipoEl.value = 'varejo';
  if (prodEl) prodEl.value = '';
  if (qtyEl) qtyEl.value = '1';
  if (precoEl) precoEl.value = '';
  if (custoEl) custoEl.value = '';

  refreshProdSelSafe();
  refreshCliDLSafe();
  renderItens();
}

/**
 * @param {string} id
 */
export function editarPed(id) {
  /** @type {Pedido | undefined} */
  const p = PD().find((x) => x.id === id);
  if (!p) return;

  State.editIds.ped = id;
  State.pedItens = [...getPedidoItens(p).map((i) => ({ ...i }))];
  refreshRcaSelectors();

  const titulo = document.getElementById('ped-modal-titulo');
  if (titulo) titulo.textContent = 'Editar pedido #' + p.num;

  document.getElementById('pd-cli').value = getPedidoClienteLabel(p);
  const rcaEl = /** @type {HTMLSelectElement | null} */ (document.getElementById('pd-rca'));
  if (rcaEl) rcaEl.value = String(p.rca_id || getPedidoCliente(p)?.rca_id || '');
  document.getElementById('pd-data').value = p.data || '';
  document.getElementById('pd-status').value = p.status || 'orcamento';
  document.getElementById('pd-pgto').value = p.pgto || 'a_vista';
  document.getElementById('pd-prazo').value = p.prazo || 'imediato';
  document.getElementById('pd-tipo').value = p.tipo || 'varejo';
  document.getElementById('pd-obs').value = p.obs || '';

  refreshProdSelSafe();
  refreshCliDLSafe();
  renderItens();
  abrirModal('modal-pedido');
}

export function preencherValoresItemPedido() {
  const prodEl = document.getElementById('pi-prod');
  const tipoEl = document.getElementById('pd-tipo');
  const precoEl = document.getElementById('pi-preco');
  const custoEl = document.getElementById('pi-custo');
  if (!(prodEl instanceof HTMLSelectElement)) return;
  if (!(precoEl instanceof HTMLInputElement)) return;
  if (!(custoEl instanceof HTMLInputElement)) return;

  const pid = prodEl.value;
  if (!pid) {
    precoEl.value = '';
    custoEl.value = '';
    return;
  }

  const prod = P().find((p) => p.id === pid);
  if (!prod) return;

  const tipo = tipoEl instanceof HTMLSelectElement ? tipoEl.value : 'varejo';
  const precoSugerido =
    tipo === 'atacado' && (prod.mka > 0 || prod.pfa > 0)
      ? prod.pfa > 0
        ? prod.pfa
        : prV(prod.custo, prod.mka)
      : prV(prod.custo, prod.mkv);
  const precoBase = !isNaN(precoSugerido) && precoSugerido > 0 ? precoSugerido : prod.custo;

  if (!custoEl.value) custoEl.value = String(prod.custo || '');
  if (!precoEl.value) precoEl.value = String(precoBase || '');
}

export function addItem() {
  const pid = document.getElementById('pi-prod')?.value;
  const qty = parseFloat(document.getElementById('pi-qty')?.value) || 1;
  const pm = parseFloat(document.getElementById('pi-preco')?.value) || 0;
  const cm = parseFloat(document.getElementById('pi-custo')?.value) || 0;
  const orig = document.getElementById('pi-orig')?.value || 'estoque';

  if (!pid) {
    toast('Selecione um produto.');
    return;
  }

  const prod = P().find((p) => p.id === pid);
  if (!prod) return;

  const tipo = document.getElementById('pd-tipo')?.value || 'varejo';
  const pa =
    tipo === 'atacado' && (prod.mka > 0 || prod.pfa > 0)
      ? prod.pfa > 0
        ? prod.pfa
        : prV(prod.custo, prod.mka)
      : prV(prod.custo, prod.mkv);

  const precoBase = isNaN(pa) || pa <= 0 ? prod.custo : pa;
  const pf = pm > 0 ? pm : precoBase;
  const custoAplicado = cm > 0 ? cm : prod.custo || 0;

  if (!State.pedItens) State.pedItens = [];
  State.pedItens.push({
    prodId: pid,
    nome: prod.nome,
    un: prod.un,
    qty,
    preco: pf,
    custo: custoAplicado,
    custo_base: prod.custo,
    preco_base: precoBase,
    orig
  });

  const prodEl = document.getElementById('pi-prod');
  const qtyEl = document.getElementById('pi-qty');
  const precoEl = document.getElementById('pi-preco');
  const custoEl = document.getElementById('pi-custo');

  if (prodEl) prodEl.value = '';
  if (qtyEl) qtyEl.value = '1';
  if (precoEl) precoEl.value = '';
  if (custoEl) custoEl.value = '';

  renderItens();
}

/**
 * @param {number} i
 */
export function remItem(i) {
  if (!State.pedItens) State.pedItens = [];
  State.pedItens.splice(i, 1);
  renderItens();
}

export function renderItens() {
  const el = document.getElementById('ped-itens');
  const tb = document.getElementById('ped-total');
  if (!el || !tb) return;

  if (!State.pedItens || !State.pedItens.length) {
    el.innerHTML = '<div class="empty-inline">Nenhum item.</div>';
    tb.style.display = 'none';
    return;
  }

  const tot = State.pedItens.reduce((a, i) => a + i.qty * i.preco, 0);
  const lucroTotal = State.pedItens.reduce((a, i) => a + (i.preco - i.custo) * i.qty, 0);

  el.innerHTML = `
    <div class="tw ped-items-wrap"><table class="tbl ped-items-table">
      <thead>
        <tr>
          <th>Produto</th>
          <th>Origem</th>
          <th>Qtd</th>
          <th>Custo</th>
          <th>Preco</th>
          <th>Subtotal</th>
          <th>Lucro</th>
          <th>Margem</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${State.pedItens
          .map((it, i) => {
            const subtotal = it.qty * it.preco;
            const lucro = (it.preco - it.custo) * it.qty;
            const margem = it.preco > 0 ? ((it.preco - it.custo) / it.preco) * 100 : 0;
            return `
            <tr>
              <td class="table-cell-strong">${it.nome}</td>
              <td><span class="bdg ${it.orig === 'estoque' ? 'bg' : 'bb'}">${it.orig === 'estoque' ? 'Estoque' : 'Fornecedor'}</span></td>
              <td>${it.qty} ${it.un}</td>
              <td class="table-cell-muted">${fmt(it.custo)}</td>
              <td>${fmt(it.preco)}</td>
              <td class="table-cell-strong">${fmt(subtotal)}</td>
              <td class="table-cell-strong ${lucro >= 0 ? 'table-cell-success' : 'table-cell-danger'}">${fmt(lucro)}</td>
              <td class="table-cell-strong">${margem.toFixed(1)}%</td>
              <td><button class="btn btn-sm" title="Excluir item" data-click="remItem(${i})">Excluir</button></td>
            </tr>
          `;
          })
          .join('')}
      </tbody>
    </table></div>
  `;

  const totalVal = document.getElementById('ped-total-val');
  if (totalVal) totalVal.textContent = `${fmt(tot)} | Lucro ${fmt(lucroTotal)}`;
  tb.style.display = 'block';
}

export async function salvarPedido() {
  const cliRef = document.getElementById('pd-cli')?.value.trim();
  if (!cliRef) {
    notify(MSG.forms.required('Cliente'), SEVERITY.WARNING);
    focusField('pd-cli', { markError: true });
    return;
  }

  const cliente = findClienteByPedidoInput(cliRef);
  if (!cliente) {
    notify(
      'Cliente invalido. Escolha um cliente cadastrado na lista para vincular o pedido corretamente.',
      SEVERITY.WARNING
    );
    focusField('pd-cli', { markError: true });
    return;
  }

  if (!State.pedItens || !State.pedItens.length) {
    notify(
      'Atencao: pedido sem itens. Impacto: o total fica zerado e o pedido nao pode ser salvo. Acao: adicione ao menos 1 item.',
      SEVERITY.WARNING
    );
    return;
  }

  const selectedRcaId = String(
    document.getElementById('pd-rca')?.value || cliente.rca_id || ''
  ).trim();
  const selectedRcaNome = selectedRcaId
    ? getRcaNomeById(selectedRcaId) || String(cliente.rca_nome || '').trim()
    : '';

  const total = State.pedItens.reduce((a, i) => a + i.qty * i.preco, 0);
  const peds = PD();
  const allNums = peds.map((p) => p.num).filter((n) => typeof n === 'number' && !isNaN(n));
  const nextNum = allNums.length ? Math.max(...allNums) + 1 : 1;
  const atual = State.editIds.ped ? peds.find((p) => p.id === State.editIds.ped) || null : null;

  const ped = {
    ...(atual || {}),
    id: State.editIds.ped || uid(),
    filial_id: State.FIL,
    cliente_id: cliente.id,
    rca_id: selectedRcaId || null,
    rca_nome: selectedRcaNome || null,
    num: State.editIds.ped ? atual?.num || nextNum : nextNum,
    cli: cliente.nome,
    data: document.getElementById('pd-data')?.value || '',
    status: document.getElementById('pd-status')?.value || 'orcamento',
    pgto: document.getElementById('pd-pgto')?.value || 'a_vista',
    prazo: document.getElementById('pd-prazo')?.value || 'imediato',
    tipo: document.getElementById('pd-tipo')?.value || 'varejo',
    obs: document.getElementById('pd-obs')?.value.trim() || '',
    itens: State.pedItens,
    total
  };

  const pedSB = { ...ped, itens: JSON.stringify(ped.itens) };

  try {
    await SB.upsertPedido(pedSB);
  } catch (e) {
    notify(
      `Erro: falha ao salvar pedido (${String(e?.message || 'erro desconhecido')}). Impacto: pedido nao foi persistido. Acao: tente novamente.`,
      SEVERITY.ERROR
    );
    return;
  }

  if (State.editIds.ped) {
    D.pedidos[State.FIL] = peds.map((p) => (p.id === State.editIds.ped ? ped : p));
  } else {
    if (!D.pedidos[State.FIL]) D.pedidos[State.FIL] = [];
    D.pedidos[State.FIL].push(ped);
  }
  invalidatePdCache();

  await _gerarContaSeNecessario(ped, atual?.status || '');

  fecharModal('modal-pedido');
  renderPedMet();
  renderPedidos();

  notify(
    State.editIds.ped ? 'Sucesso: pedido atualizado.' : 'Sucesso: pedido #' + ped.num + ' criado.',
    SEVERITY.SUCCESS
  );
}

/**
 * @param {string} id
 */
export async function removerPed(id) {
  if (!confirm('Remover pedido?')) return;

  try {
    await SB.deletePedido(id);
  } catch (e) {
    toast('Erro: ' + e.message);
    return;
  }

  D.pedidos[State.FIL] = PD().filter((p) => p.id !== id);
  invalidatePdCache();
  renderPedMet();
  renderPedidos();
  toast('Removido.');
}

/**
 * Avança o status operacional do pedido um passo:
 * Orçamento → Confirmado → Em Separação → Entregue
 * @param {string} id
 */
export async function avancarStatusPed(id) {
  const peds = PD();
  const p = peds.find((x) => x.id === id);
  if (!p) return;

  const proximoStatus = NEXT_STATUS[p.status];
  if (!proximoStatus) return;

  const atualizado = { ...p, status: proximoStatus, itens: JSON.stringify(p.itens) };

  try {
    await SB.upsertPedido(atualizado);
  } catch (e) {
    notify(
      `Erro ao avançar status do pedido #${p.num}: ${String(e?.message || 'erro desconhecido')}`,
      SEVERITY.ERROR
    );
    return;
  }

  const pedAtualizado = { ...p, status: proximoStatus };
  D.pedidos[State.FIL] = peds.map((x) => (x.id === id ? pedAtualizado : x));
  invalidatePdCache();

  await _gerarContaSeNecessario(pedAtualizado, p.status);

  renderPedMet();
  renderPedidos();
  notify(
    `Pedido #${p.num} → ${proximoStatus === 'em_separacao' ? 'Em Separação' : proximoStatus.charAt(0).toUpperCase() + proximoStatus.slice(1)}.`,
    SEVERITY.SUCCESS
  );
}

/**
 * @param {string} id
 */
export function verPed(id) {
  /** @type {Pedido | undefined} */
  const p = PD().find((x) => x.id === id);
  if (!p) return;

  const itens = getPedidoItens(p);
  const lucro = itens.reduce((a, i) => a + (i.preco - i.custo) * i.qty, 0);

  const pgtoLbl = {
    a_vista: 'A vista',
    pix: 'PIX',
    boleto: 'Boleto',
    cartao: 'Cartao',
    cheque: 'Cheque'
  };

  const prazoLbl = {
    imediato: 'Imediato',
    '7d': '7 dias',
    '15d': '15 dias',
    '30d': '30 dias',
    '60d': '60 dias'
  };

  const box = document.getElementById('ped-det-box');
  if (!box) return;

  box.innerHTML = `
    <div class="ped-detail">
      <div class="ped-detail-head fb">
        <div class="mt ped-detail-title modal-title-reset">Pedido #${p.num}</div>
      ${ST_PED[p.status] || ''}
    </div>

      <div class="ped-detail-grid">
      ${[
        ['Cliente', getPedidoClienteLabel(p)],
        ['RCA', p.rca_nome || getPedidoCliente(p)?.rca_nome || '-'],
        ['Data', p.data || '-'],
        ['Tipo', p.tipo === 'atacado' ? 'Atacado' : 'Varejo'],
        ['Pagamento', pgtoLbl[p.pgto] || p.pgto],
        ['Prazo', prazoLbl[p.prazo] || p.prazo],
        [
          'Lucro estimado',
          `<span class="table-cell-success table-cell-strong">${fmt(lucro)}</span>`
        ]
      ]
        .map(
          ([l, v]) => `
        <div class="ped-detail-kpi">
          <div class="ped-detail-label">${l}</div>
          <div class="ped-detail-value">${v}</div>
        </div>
      `
        )
        .join('')}
    </div>

    ${
      p.obs
        ? `
        <div class="panel ped-detail-section">
        <div class="pt">Observacoes</div>
        <p class="detail-copy">${p.obs}</p>
      </div>
    `
        : ''
    }

      <div class="tw ped-detail-table-wrap">
        <table class="tbl ped-detail-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Orig.</th>
            <th>Qtd</th>
            <th>Custo</th>
            <th>Preco</th>
            <th>Subtotal</th>
            <th>Lucro</th>
            <th>Margem</th>
          </tr>
        </thead>
        <tbody>
          ${itens
            .map((i) => {
              const lucroItem = (i.preco - i.custo) * i.qty;
              const margemItem = i.preco > 0 ? ((i.preco - i.custo) / i.preco) * 100 : 0;
              return `
              <tr>
                <td class="table-cell-strong">${i.nome}</td>
                <td><span class="bdg ${i.orig === 'estoque' ? 'bg' : 'bb'} dash-badge-xs">${i.orig === 'estoque' ? 'Est.' : 'Forn.'}</span></td>
                <td>${i.qty} ${i.un}</td>
                <td class="table-cell-muted">${fmt(i.custo)}</td>
                <td>${fmt(i.preco)}</td>
                <td class="table-cell-strong">${fmt(i.qty * i.preco)}</td>
                <td class="table-cell-success">${fmt(lucroItem)}</td>
                <td>${margemItem.toFixed(1)}%</td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="table-cell-strong ped-detail-total-label">Total</td>
            <td class="table-cell-strong">${fmt(p.total || 0)}</td>
            <td class="table-cell-strong table-cell-success">${fmt(lucro)}</td>
            <td>-</td>
          </tr>
        </tfoot>
      </table>
    </div>

      <div class="ped-detail-actions">
      <button class="btn" data-click="fecharModal('modal-ped-det')">Fechar</button>
      <button class="btn btn-p" data-click="fecharModal('modal-ped-det');editarPed('${p.id}')">Editar</button>
      </div>
    </div>
  `;

  abrirModal('modal-ped-det');
}
