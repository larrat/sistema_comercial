// @ts-check

import { SB } from '../app/api.js';
import { D, State, CR } from '../app/store.js';
import { fmt, toast, notify } from '../shared/utils.js';
import { esc } from '../shared/sanitize.js';
import { MSG, SEVERITY } from '../shared/messages.js';

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
