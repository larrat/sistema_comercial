// @ts-check

import { SB } from '../app/api.js';
import { D, State, CR, PD } from '../app/store.js';
import { fmt, toast, notify, uid } from '../shared/utils.js';
import { esc } from '../shared/sanitize.js';
import { SEVERITY } from '../shared/messages.js';

/** @typedef {import('../types/domain').ContaReceber} ContaReceber */

const TAB_CR = {
  pendentes: 'pendentes',
  vencidos: 'vencidos',
  recebidos: 'recebidos'
};

/** @returns {string} YYYY-MM-DD */
function hoje() {
  return new Date().toISOString().split('T')[0];
}

/**
 * @param {ContaReceber} cr
 * @returns {'pendente_ok' | 'vencido' | 'recebido'}
 */
function getStatusEfetivo(cr) {
  if (cr.status === 'recebido') return 'recebido';
  if (cr.vencimento < hoje()) return 'vencido';
  return 'pendente_ok';
}

export function renderContasReceberMet() {
  const el = document.getElementById('cr-met');
  if (!el) return;

  const contas = CR();
  const hj = hoje();

  const totalPendente = contas
    .filter((c) => c.status !== 'recebido')
    .reduce((a, c) => a + (c.valor || 0), 0);

  const totalVencido = contas
    .filter((c) => c.status !== 'recebido' && c.vencimento < hj)
    .reduce((a, c) => a + (c.valor || 0), 0);

  const mesAtual = hj.slice(0, 7); // YYYY-MM
  const recebidoMes = contas
    .filter((c) => c.status === 'recebido' && (c.recebido_em || '').slice(0, 7) === mesAtual)
    .reduce((a, c) => a + (c.valor || 0), 0);

  el.innerHTML = `
    <div class="met"><div class="ml">A receber</div><div class="mv kpi-value-sm tone-warning">${fmt(totalPendente)}</div></div>
    <div class="met"><div class="ml">Vencido</div><div class="mv kpi-value-sm tone-danger">${fmt(totalVencido)}</div></div>
    <div class="met"><div class="ml">Recebido no mês</div><div class="mv kpi-value-sm tone-success">${fmt(recebidoMes)}</div></div>
  `;
}

export function renderContasReceber() {
  renderCrList('cr-busca-pendentes', 'cr-lista-pendentes', 'pendente_ok');
  renderCrList('cr-busca-vencidos', 'cr-lista-vencidos', 'vencido');
  renderCrList('cr-busca-recebidos', 'cr-lista-recebidos', 'recebido');
}

/**
 * @param {string} buscaId
 * @param {string} listaId
 * @param {'pendente_ok' | 'vencido' | 'recebido'} statusEfetivo
 */
function renderCrList(buscaId, listaId, statusEfetivo) {
  const el = document.getElementById(listaId);
  if (!el) return;

  const q = (document.getElementById(buscaId)?.value || '').toLowerCase();

  const f = [...CR()]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .filter(
      (c) =>
        getStatusEfetivo(c) === statusEfetivo &&
        (!q || c.cliente.toLowerCase().includes(q) || String(c.pedido_num || '').includes(q))
    );

  if (!f.length) {
    el.innerHTML = `<div class="empty"><div class="ico">CR</div><p>Nenhum lançamento encontrado.</p></div>`;
    return;
  }

  const isMobile = window.matchMedia('(max-width: 1080px)').matches;
  if (isMobile) {
    el.innerHTML = f
      .map(
        (c) => `
      <div class="mobile-card">
        <div class="mobile-card-head">
          <div class="mobile-card-grow">
            <div class="mobile-card-title">${esc(c.cliente)} ${c.pedido_num ? '— Ped. #' + c.pedido_num : ''}</div>
            <div class="mobile-card-sub">Vencimento: ${c.vencimento}</div>
          </div>
          <div class="table-cell-strong">${fmt(c.valor)}</div>
        </div>
        <div class="mobile-card-actions">
          ${
            statusEfetivo !== 'recebido'
              ? `<button class="btn btn-sm btn-p" data-click="marcarRecebido('${c.id}')">Marcar recebido</button>`
              : `<button class="btn btn-sm" data-click="marcarPendente('${c.id}')">Desfazer</button>`
          }
        </div>
      </div>
    `
      )
      .join('');
    return;
  }

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Pedido</th>
            <th>Valor</th>
            <th>Vencimento</th>
            ${statusEfetivo === 'recebido' ? '<th>Recebido em</th>' : ''}
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${f
            .map(
              (c) => `
            <tr>
              <td class="table-cell-strong">${esc(c.cliente)}</td>
              <td class="table-cell-muted">${c.pedido_num ? '#' + c.pedido_num : '-'}</td>
              <td class="table-cell-strong">${fmt(c.valor)}</td>
              <td class="${statusEfetivo === 'vencido' ? 'tone-danger table-cell-strong' : 'table-cell-muted'}">${c.vencimento}</td>
              ${statusEfetivo === 'recebido' ? `<td class="table-cell-muted">${c.recebido_em ? c.recebido_em.slice(0, 10) : '-'}</td>` : ''}
              <td>
                ${
                  statusEfetivo !== 'recebido'
                    ? `<button class="btn btn-sm btn-p" data-click="marcarRecebido('${c.id}')">Marcar recebido</button>`
                    : `<button class="btn btn-sm" data-click="marcarPendente('${c.id}')">Desfazer</button>`
                }
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

/**
 * @param {'pendentes' | 'vencidos' | 'recebidos'} tab
 */
export function switchCrTab(tab) {
  Object.keys(TAB_CR).forEach((t) => {
    document.getElementById(`receber-tc-${t}`)?.classList.toggle('on', t === tab);
  });
  const tabBtns = document.querySelectorAll('#pg-receber .tabs .tb');
  const names = ['pendentes', 'vencidos', 'recebidos'];
  tabBtns.forEach((btn, i) => btn.classList.toggle('on', names[i] === tab));
  renderContasReceber();
}

/**
 * @param {string} id
 */
export async function marcarRecebido(id) {
  const cr = CR().find((c) => c.id === id);
  if (!cr) return;

  const updated = { ...cr, status: 'recebido', recebido_em: new Date().toISOString() };
  try {
    await SB.upsertContaReceber(updated);
  } catch (e) {
    notify(
      `Erro ao marcar como recebido: ${String(e?.message || 'erro desconhecido')}`,
      SEVERITY.ERROR
    );
    return;
  }

  if (!D.contasReceber) D.contasReceber = {};
  D.contasReceber[State.FIL] = CR().map((c) => (c.id === id ? updated : c));
  renderContasReceberMet();
  renderContasReceber();
  notify('Recebimento registrado.', SEVERITY.SUCCESS);
}

/**
 * @param {string} id
 */
export async function marcarPendente(id) {
  const cr = CR().find((c) => c.id === id);
  if (!cr) return;

  const updated = { ...cr, status: 'pendente', recebido_em: null };
  try {
    await SB.upsertContaReceber(updated);
  } catch (e) {
    notify(
      `Erro ao desfazer recebimento: ${String(e?.message || 'erro desconhecido')}`,
      SEVERITY.ERROR
    );
    return;
  }

  if (!D.contasReceber) D.contasReceber = {};
  D.contasReceber[State.FIL] = CR().map((c) => (c.id === id ? updated : c));
  renderContasReceberMet();
  renderContasReceber();
  toast('Recebimento desfeito.');
}

/** @type {Record<string, number>} */
const PRAZO_DIAS_CR = { '7d': 7, '15d': 15, '30d': 30, '60d': 60 };

/**
 * Gera manualmente uma conta a receber para um pedido já entregue.
 * Usado para backfill de pedidos entregues antes da feature existir.
 * @param {string} pedidoId
 */
export async function gerarContaManual(pedidoId) {
  const p = PD().find((x) => x.id === pedidoId);
  if (!p) return;

  if (CR().some((c) => c.pedido_id === pedidoId)) {
    toast('Este pedido já tem uma conta a receber.');
    return;
  }

  const dias = PRAZO_DIAS_CR[p.prazo || ''];
  let vencimento;
  if (dias && p.data) {
    const base = new Date(p.data + 'T00:00:00');
    base.setDate(base.getDate() + dias);
    vencimento = base.toISOString().split('T')[0];
  } else {
    vencimento = p.data || new Date().toISOString().split('T')[0];
  }

  /** @type {import('../types/domain').ContaReceber} */
  const conta = {
    id: uid(),
    filial_id: /** @type {string} */ (State.FIL),
    pedido_id: p.id,
    pedido_num: p.num,
    cliente_id: p.cliente_id || null,
    cliente: p.cli,
    valor: p.total,
    vencimento,
    status: 'pendente'
  };

  try {
    await SB.upsertContaReceber(conta);
  } catch (e) {
    notify(`Erro ao gerar conta: ${String(e?.message || 'erro desconhecido')}`, SEVERITY.ERROR);
    return;
  }

  if (!D.contasReceber) D.contasReceber = {};
  if (!D.contasReceber[State.FIL]) D.contasReceber[State.FIL] = [];
  D.contasReceber[State.FIL].push(conta);
  renderContasReceberMet();
  renderContasReceber();
  notify('Conta a receber gerada para pedido #' + p.num, SEVERITY.SUCCESS);
}

// ── Bridge: React → Legado ────────────────────────────────────────────────────
// Quando o React (pedidos-bridge) insere uma conta a receber no Supabase,
// ele dispara este evento para que o legado atualize D.contasReceber sem
// precisar de um novo fetch à API.
window.addEventListener('sc:conta-receber-criada', (/** @type {CustomEvent} */ ev) => {
  const conta = ev.detail;
  if (!conta || !conta.filial_id) return;
  if (!D.contasReceber) D.contasReceber = {};
  if (!D.contasReceber[conta.filial_id]) D.contasReceber[conta.filial_id] = [];

  // Evita duplicata se o evento disparar mais de uma vez para o mesmo ID
  const jaExiste = D.contasReceber[conta.filial_id].some((c) => c.id === conta.id);
  if (!jaExiste) {
    D.contasReceber[conta.filial_id].push(conta);
  }

  // Atualiza UI somente se a filial da conta for a filial ativa
  if (conta.filial_id === State.FIL) {
    renderContasReceberMet();
    renderContasReceber();
  }
});
