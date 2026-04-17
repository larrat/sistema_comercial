// @ts-check

import { SB } from '../app/api.js';
import { D, State, CR, CRB, PD } from '../app/store.js';
import { abrirModal, fecharModal, fmt, notify, toast, uid } from '../shared/utils.js';
import { esc } from '../shared/sanitize.js';
import { SEVERITY } from '../shared/messages.js';
import {
  shouldRenderLegacyContasReceber,
  setContasReceberReactTab
} from './contas-receber-react-bridge.js';

/** @typedef {import('../types/domain').ContaReceber} ContaReceber */
/** @typedef {import('../types/domain').ContaReceberBaixa} ContaReceberBaixa */

const TAB_CR = {
  pendentes: 'pendentes',
  vencidos: 'vencidos',
  recebidos: 'recebidos'
};

const MODAL_BAIXA_PARCIAL_ID = 'modal-cr-parcial';
let contaReceberSelecionadaId = '';

/** @returns {string} */
function getFilialAtual() {
  return /** @type {string} */ (State.FIL || '');
}

/** @returns {string} YYYY-MM-DD */
function hoje() {
  return new Date().toISOString().split('T')[0];
}

/**
 * @param {number} value
 * @returns {number}
 */
function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

/**
 * @param {ContaReceber} cr
 * @returns {number}
 */
function getValorRecebido(cr) {
  if (Number.isFinite(Number(cr.valor_recebido))) return roundMoney(Number(cr.valor_recebido));
  return cr.status === 'recebido' ? roundMoney(Number(cr.valor || 0)) : 0;
}

/**
 * @param {ContaReceber} cr
 * @returns {number}
 */
function getValorEmAberto(cr) {
  if (Number.isFinite(Number(cr.valor_em_aberto))) return roundMoney(Number(cr.valor_em_aberto));
  return roundMoney(Math.max(0, Number(cr.valor || 0) - getValorRecebido(cr)));
}

/**
 * @param {ContaReceber} cr
 * @returns {string}
 */
function getStatusLabel(cr) {
  const aberto = getValorEmAberto(cr);
  if (aberto <= 0 || cr.status === 'recebido') return 'Recebido';
  if (getValorRecebido(cr) > 0 || cr.status === 'parcial') return 'Parcial';
  return 'Pendente';
}

/**
 * @param {ContaReceber} cr
 * @returns {'pendente_ok' | 'vencido' | 'recebido'}
 */
function getStatusEfetivo(cr) {
  if (getValorEmAberto(cr) <= 0 || cr.status === 'recebido') return 'recebido';
  if (cr.vencimento < hoje()) return 'vencido';
  return 'pendente_ok';
}

/**
 * @param {string | null | undefined} iso
 * @returns {string}
 */
function formatDateTimeLabel(iso) {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso).slice(0, 16).replace('T', ' ');
  return parsed.toLocaleString('pt-BR');
}

/**
 * @param {Date} [date]
 * @returns {string}
 */
function toDateTimeLocalValue(date = new Date()) {
  /** @param {number} value */
  const pad = (value) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function fromDateTimeLocalValue(value) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * @param {string} contaId
 * @returns {ContaReceberBaixa[]}
 */
function getBaixasConta(contaId) {
  return CRB()
    .filter((baixa) => baixa.conta_receber_id === contaId)
    .sort((a, b) => String(b.recebido_em || '').localeCompare(String(a.recebido_em || '')));
}

/**
 * @param {ContaReceber[]} contas
 * @returns {number}
 */
function getRecebidoMes(contas) {
  const mesAtual = hoje().slice(0, 7);
  const baixasDoMes = CRB().filter(
    (baixa) => String(baixa.recebido_em || '').slice(0, 7) === mesAtual
  );
  const contasComBaixaNoMes = new Set(baixasDoMes.map((baixa) => baixa.conta_receber_id));
  const totalBaixas = baixasDoMes.reduce((acc, baixa) => acc + Number(baixa.valor || 0), 0);
  const fallbackRecebidas = contas
    .filter(
      (conta) =>
        getStatusEfetivo(conta) === 'recebido' &&
        String(conta.recebido_em || '').slice(0, 7) === mesAtual &&
        !contasComBaixaNoMes.has(conta.id)
    )
    .reduce((acc, conta) => acc + Number(conta.valor || 0), 0);
  return roundMoney(totalBaixas + fallbackRecebidas);
}

/**
 * @param {ContaReceber} conta
 */
function syncContaReceberAtualizada(conta) {
  if (!D.contasReceber) D.contasReceber = {};
  const filialId = getFilialAtual();
  D.contasReceber[filialId] = CR().map((item) => (item.id === conta.id ? conta : item));
}

/**
 * @param {ContaReceberBaixa} baixa
 */
function syncContaReceberBaixa(baixa) {
  if (!D.contasReceberBaixas) D.contasReceberBaixas = {};
  const filialId = getFilialAtual();
  if (!D.contasReceberBaixas[filialId]) D.contasReceberBaixas[filialId] = [];
  D.contasReceberBaixas[filialId] = [baixa, ...CRB().filter((item) => item.id !== baixa.id)];
}

/**
 * @param {string} baixaId
 */
function removeContaReceberBaixaSync(baixaId) {
  if (!D.contasReceberBaixas) D.contasReceberBaixas = {};
  const filialId = getFilialAtual();
  D.contasReceberBaixas[filialId] = CRB().filter((item) => item.id !== baixaId);
}

/**
 * @param {ContaReceber} conta
 * @param {ContaReceberBaixa[]} baixas
 * @returns {ContaReceber}
 */
function buildContaFromBaixas(conta, baixas) {
  const baixasOrdenadas = [...baixas].sort((a, b) =>
    String(b.recebido_em || '').localeCompare(String(a.recebido_em || ''))
  );
  const valorRecebido = roundMoney(
    baixasOrdenadas.reduce((acc, baixa) => acc + Number(baixa.valor || 0), 0)
  );
  const valorEmAberto = roundMoney(Math.max(0, Number(conta.valor || 0) - valorRecebido));
  const ultimaBaixa = baixasOrdenadas[0] || null;
  const quitado = valorEmAberto <= 0;

  return {
    ...conta,
    valor_recebido: valorRecebido,
    valor_em_aberto: valorEmAberto,
    status: quitado ? 'recebido' : valorRecebido > 0 ? 'parcial' : 'pendente',
    recebido_em: quitado ? (ultimaBaixa?.recebido_em ?? null) : null,
    ultimo_recebimento_em: ultimaBaixa?.recebido_em ?? null
  };
}

function refreshContasReceberUi() {
  renderContasReceberMet();
  renderContasReceber();
  window.dispatchEvent(
    new CustomEvent('sc:contas-receber-sync', {
      detail: {
        filialId: State.FIL,
        contas: CR().length,
        baixas: CRB().length
      }
    })
  );
}

/**
 * @param {ContaReceber} cr
 * @returns {string}
 */
function renderStatusBadge(cr) {
  const label = getStatusLabel(cr);
  const tone = label === 'Recebido' ? 'bg' : label === 'Parcial' ? 'ba' : 'bk';
  return `<span class="bdg ${tone}">${label}</span>`;
}

/**
 * @param {ContaReceber} cr
 * @returns {string}
 */
function renderBaixasResumo(cr) {
  const baixas = getBaixasConta(cr.id);
  if (!baixas.length) return '<span class="table-cell-muted">Sem baixas</span>';
  const ultima = baixas[0];
  return `
    <div class="table-cell-strong">${fmt(ultima.valor)}</div>
    <div class="table-cell-caption table-cell-muted">${formatDateTimeLabel(ultima.recebido_em)}</div>
  `;
}

/**
 * @param {ContaReceber} cr
 * @returns {string}
 */
function renderBaixasHistoricoConteudo(cr) {
  const baixas = getBaixasConta(cr.id);
  if (!baixas.length) {
    return '<div class="empty-inline">Sem baixas registradas para esta conta.</div>';
  }

  return `
    <div class="cr-baixas-list">
      ${baixas
        .map(
          (baixa, index) => `
            <div class="cr-baixas-item">
              <div class="cr-baixas-item__head">
                <span class="table-cell-strong">Baixa ${index + 1}</span>
                <span class="tone-success table-cell-strong">${fmt(baixa.valor)}</span>
              </div>
              <div class="table-cell-caption table-cell-muted">
                ${formatDateTimeLabel(baixa.recebido_em)}
              </div>
              ${
                baixa.observacao
                  ? `<div class="table-cell-caption">${esc(baixa.observacao)}</div>`
                  : ''
              }
              <div class="fg2">
                <button class="btn btn-sm" data-click="estornarBaixaConta('${cr.id}','${baixa.id}')">Estornar</button>
              </div>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

/**
 * @param {ContaReceber} cr
 * @param {string} className
 * @returns {string}
 */
function renderBaixasHistoricoExpansivel(cr, className = '') {
  const baixas = getBaixasConta(cr.id);
  const resumo = baixas.length
    ? `${baixas.length} baixa${baixas.length > 1 ? 's' : ''} registrada${baixas.length > 1 ? 's' : ''}`
    : 'Ver historico de baixas';
  const classes = ['cr-baixas-details', className].filter(Boolean).join(' ');

  return `
    <details class="${classes}">
      <summary class="cr-baixas-summary">
        <span>${resumo}</span>
        <span class="table-cell-caption table-cell-muted">Expandir</span>
      </summary>
      <div class="cr-baixas-body">
        ${renderBaixasHistoricoConteudo(cr)}
      </div>
    </details>
  `;
}

/**
 * @param {ContaReceber} cr
 * @returns {string}
 */
function renderContaActions(cr) {
  if (getStatusEfetivo(cr) === 'recebido') {
    return `<button class="btn btn-sm" data-click="marcarPendente('${cr.id}')">Desfazer</button>`;
  }

  return `
    <div class="fg2">
      <button class="btn btn-sm" data-click="abrirBaixaParcial('${cr.id}')">Baixa parcial</button>
      <button class="btn btn-sm btn-p" data-click="marcarRecebido('${cr.id}')">Receber tudo</button>
    </div>
  `;
}

export function renderContasReceberMet() {
  if (!shouldRenderLegacyContasReceber()) return;
  const el = document.getElementById('cr-met');
  if (!el) return;

  const contas = CR();
  const hj = hoje();

  const totalPendente = contas
    .filter((conta) => getStatusEfetivo(conta) !== 'recebido')
    .reduce((acc, conta) => acc + getValorEmAberto(conta), 0);

  const totalVencido = contas
    .filter((conta) => getStatusEfetivo(conta) !== 'recebido' && conta.vencimento < hj)
    .reduce((acc, conta) => acc + getValorEmAberto(conta), 0);

  const recebidoMes = getRecebidoMes(contas);

  el.innerHTML = `
    <div class="met"><div class="ml">Em aberto</div><div class="mv kpi-value-sm tone-warning">${fmt(totalPendente)}</div></div>
    <div class="met"><div class="ml">Vencido</div><div class="mv kpi-value-sm tone-danger">${fmt(totalVencido)}</div></div>
    <div class="met"><div class="ml">Recebido no mes</div><div class="mv kpi-value-sm tone-success">${fmt(recebidoMes)}</div></div>
  `;
}

export function renderContasReceber() {
  if (!shouldRenderLegacyContasReceber()) return;
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

  const q = String(document.getElementById(buscaId)?.value || '').toLowerCase();
  const contas = [...CR()]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .filter(
      (conta) =>
        getStatusEfetivo(conta) === statusEfetivo &&
        (!q ||
          conta.cliente.toLowerCase().includes(q) ||
          String(conta.pedido_num || '').includes(q) ||
          getStatusLabel(conta).toLowerCase().includes(q))
    );

  if (!contas.length) {
    el.innerHTML = `<div class="empty"><div class="ico">CR</div><p>Nenhum lancamento encontrado.</p></div>`;
    return;
  }

  const isMobile = window.matchMedia('(max-width: 1080px)').matches;
  if (isMobile) {
    el.innerHTML = contas
      .map((conta) => {
        const recebido = getValorRecebido(conta);
        const aberto = getValorEmAberto(conta);
        return `
          <div class="mobile-card">
            <div class="mobile-card-head">
              <div class="mobile-card-grow">
                <div class="mobile-card-title">${esc(conta.cliente)} ${conta.pedido_num ? '- Ped. #' + conta.pedido_num : ''}</div>
                <div class="mobile-card-sub">Vencimento: ${conta.vencimento}</div>
              </div>
              <div>${renderStatusBadge(conta)}</div>
            </div>
            <div class="mobile-card-meta mobile-card-meta-gap">
              <div>Total: <b>${fmt(conta.valor)}</b></div>
              <div>Recebido: <b>${fmt(recebido)}</b></div>
              <div>Em aberto: <b>${fmt(aberto)}</b></div>
              <div>Ultima baixa: <b>${formatDateTimeLabel(conta.ultimo_recebimento_em || conta.recebido_em)}</b></div>
            </div>
            <div class="mobile-card-actions">
              ${renderContaActions(conta)}
            </div>
            ${renderBaixasHistoricoExpansivel(conta, 'cr-baixas-details--mobile')}
          </div>
        `;
      })
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
            <th>Total</th>
            <th>Recebido</th>
            <th>Em aberto</th>
            <th>Vencimento</th>
            <th>Ultima baixa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${contas
            .map((conta) => {
              const recebido = getValorRecebido(conta);
              const aberto = getValorEmAberto(conta);
              return `
                <tr>
                  <td>
                    <div class="table-cell-strong">${esc(conta.cliente)}</div>
                    <div class="table-cell-caption">${renderStatusBadge(conta)}</div>
                  </td>
                  <td class="table-cell-muted">${conta.pedido_num ? '#' + conta.pedido_num : '-'}</td>
                  <td class="table-cell-strong">${fmt(conta.valor)}</td>
                  <td class="table-cell-strong tone-success">${fmt(recebido)}</td>
                  <td class="table-cell-strong ${aberto > 0 ? 'tone-warning' : 'tone-success'}">${fmt(aberto)}</td>
                  <td class="${statusEfetivo === 'vencido' ? 'tone-danger table-cell-strong' : 'table-cell-muted'}">${conta.vencimento}</td>
                  <td>${renderBaixasResumo(conta)}</td>
                  <td>${renderContaActions(conta)}</td>
                </tr>
                <tr class="cr-baixas-row">
                  <td colspan="8">
                    ${renderBaixasHistoricoExpansivel(conta)}
                  </td>
                </tr>
              `;
            })
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
  if (!shouldRenderLegacyContasReceber()) {
    setContasReceberReactTab(tab);
    return;
  }
  Object.keys(TAB_CR).forEach((name) => {
    document.getElementById(`receber-tc-${name}`)?.classList.toggle('on', name === tab);
  });
  const tabBtns = document.querySelectorAll('#cr-legacy-shell .tabs .tb');
  const names = ['pendentes', 'vencidos', 'recebidos'];
  tabBtns.forEach((btn, index) => btn.classList.toggle('on', names[index] === tab));
  renderContasReceber();
}

/**
 * @param {string} contaId
 * @param {number} valor
 * @param {string} recebidoEmIso
 * @param {string | null} observacao
 */
async function registrarBaixa(contaId, valor, recebidoEmIso, observacao) {
  const conta = CR().find((item) => item.id === contaId);
  if (!conta) return false;

  const valorAberto = getValorEmAberto(conta);
  const valorRecebidoAtual = getValorRecebido(conta);
  const valorBaixa = roundMoney(valor);

  if (valorBaixa <= 0) {
    notify('Informe um valor de baixa maior que zero.', SEVERITY.WARNING);
    return false;
  }

  if (valorBaixa > valorAberto) {
    notify(`A baixa parcial nao pode ultrapassar ${fmt(valorAberto)}.`, SEVERITY.WARNING);
    return false;
  }

  const novoValorRecebido = roundMoney(valorRecebidoAtual + valorBaixa);
  const novoValorAberto = roundMoney(Math.max(0, Number(conta.valor || 0) - novoValorRecebido));
  const quitado = novoValorAberto <= 0;

  /** @type {ContaReceberBaixa} */
  const baixa = {
    id: uid(),
    filial_id: /** @type {string} */ (State.FIL),
    conta_receber_id: conta.id,
    pedido_id: conta.pedido_id,
    pedido_num: conta.pedido_num || null,
    cliente_id: conta.cliente_id || null,
    cliente: conta.cliente,
    valor: valorBaixa,
    recebido_em: recebidoEmIso,
    observacao
  };

  /** @type {ContaReceber} */
  const updated = {
    ...conta,
    valor_recebido: novoValorRecebido,
    valor_em_aberto: novoValorAberto,
    status: quitado ? 'recebido' : 'parcial',
    recebido_em: quitado ? recebidoEmIso : null,
    ultimo_recebimento_em: recebidoEmIso
  };

  try {
    await Promise.all([SB.createContaReceberBaixa(baixa), SB.upsertContaReceber(updated)]);
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'erro desconhecido';
    notify(`Erro ao registrar baixa: ${message}`, SEVERITY.ERROR);
    return false;
  }

  syncContaReceberAtualizada(updated);
  syncContaReceberBaixa(baixa);
  refreshContasReceberUi();
  notify(
    quitado
      ? `Recebimento concluido para ${conta.cliente}.`
      : `Baixa parcial registrada: ${fmt(valorBaixa)} para ${conta.cliente}.`,
    SEVERITY.SUCCESS
  );
  return true;
}

/**
 * @param {string} id
 */
export async function marcarRecebido(id) {
  const conta = CR().find((item) => item.id === id);
  if (!conta) return;
  const aberto = getValorEmAberto(conta);
  if (aberto <= 0) {
    notify('Esta conta ja esta quitada.', SEVERITY.INFO);
    return;
  }
  await registrarBaixa(id, aberto, new Date().toISOString(), 'Recebimento total');
}

/**
 * @param {string} id
 */
export function abrirBaixaParcial(id) {
  const conta = CR().find((item) => item.id === id);
  if (!conta) return;

  contaReceberSelecionadaId = id;
  const aberto = getValorEmAberto(conta);
  const historico = getBaixasConta(id)
    .slice(0, 3)
    .map(
      (baixa) => `
        <div class="table-cell-caption">
          ${formatDateTimeLabel(baixa.recebido_em)} - <b>${fmt(baixa.valor)}</b>${baixa.observacao ? ` - ${esc(baixa.observacao)}` : ''}
        </div>
      `
    )
    .join('');

  const title = document.getElementById('cr-parcial-titulo');
  const resumo = document.getElementById('cr-parcial-resumo');
  const valorInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('cr-parcial-valor')
  );
  const dataInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('cr-parcial-data')
  );
  const obsInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('cr-parcial-obs')
  );
  const historicoEl = document.getElementById('cr-parcial-historico');

  if (title) {
    title.textContent = `Baixa parcial - ${conta.cliente}${conta.pedido_num ? ` (#${conta.pedido_num})` : ''}`;
  }
  if (resumo) {
    resumo.innerHTML = `
      <div class="panel-inline-metrics">
        <span>Total: <b>${fmt(conta.valor)}</b></span>
        <span>Recebido: <b>${fmt(getValorRecebido(conta))}</b></span>
        <span>Em aberto: <b>${fmt(aberto)}</b></span>
      </div>
    `;
  }
  if (valorInput) valorInput.value = String(aberto);
  if (dataInput) dataInput.value = toDateTimeLocalValue();
  if (obsInput) obsInput.value = '';
  if (historicoEl) {
    historicoEl.innerHTML =
      historico || '<div class="table-cell-caption table-cell-muted">Sem baixas anteriores.</div>';
  }

  abrirModal(MODAL_BAIXA_PARCIAL_ID);
  valorInput?.focus();
  valorInput?.select();
}

export async function confirmarBaixaParcial() {
  const conta = CR().find((item) => item.id === contaReceberSelecionadaId);
  if (!conta) return;

  const valorInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('cr-parcial-valor')
  );
  const dataInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('cr-parcial-data')
  );
  const obsInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('cr-parcial-obs')
  );

  const valor = Number(valorInput?.value || 0);
  const recebidoEmIso = fromDateTimeLocalValue(String(dataInput?.value || ''));
  const observacao = String(obsInput?.value || '').trim() || null;

  const ok = await registrarBaixa(conta.id, valor, recebidoEmIso, observacao);
  if (!ok) return;

  fecharModal(MODAL_BAIXA_PARCIAL_ID);
  contaReceberSelecionadaId = '';
}

/**
 * @param {string} id
 */
export async function marcarPendente(id) {
  const conta = CR().find((item) => item.id === id);
  if (!conta) return;
  if (!confirm('Desfazer todas as baixas desta conta e voltar para pendente?')) return;

  /** @type {ContaReceber} */
  const updated = {
    ...conta,
    status: 'pendente',
    valor_recebido: 0,
    valor_em_aberto: roundMoney(Number(conta.valor || 0)),
    recebido_em: null,
    ultimo_recebimento_em: null
  };

  try {
    await Promise.all([SB.deleteContaReceberBaixasByConta(id), SB.upsertContaReceber(updated)]);
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'erro desconhecido';
    notify(`Erro ao desfazer recebimento: ${message}`, SEVERITY.ERROR);
    return;
  }

  if (!D.contasReceberBaixas) D.contasReceberBaixas = {};
  D.contasReceberBaixas[getFilialAtual()] = CRB().filter((item) => item.conta_receber_id !== id);
  syncContaReceberAtualizada(updated);
  refreshContasReceberUi();
  toast('Baixas removidas e conta reaberta.');
}

/**
 * @param {string} contaId
 * @param {string} baixaId
 */
export async function estornarBaixaConta(contaId, baixaId) {
  const conta = CR().find((item) => item.id === contaId);
  const baixa = CRB().find((item) => item.id === baixaId && item.conta_receber_id === contaId);
  if (!conta || !baixa) {
    notify('Baixa nao encontrada para estorno.', SEVERITY.WARNING);
    return;
  }

  if (!confirm(`Estornar a baixa de ${fmt(baixa.valor)} para ${conta.cliente}?`)) return;

  const baixasRestantes = getBaixasConta(contaId).filter((item) => item.id !== baixaId);
  const updated = buildContaFromBaixas(conta, baixasRestantes);

  try {
    await Promise.all([SB.deleteContaReceberBaixa(baixaId), SB.upsertContaReceber(updated)]);
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'erro desconhecido';
    notify(`Erro ao estornar baixa: ${message}`, SEVERITY.ERROR);
    return;
  }

  removeContaReceberBaixaSync(baixaId);
  syncContaReceberAtualizada(updated);
  refreshContasReceberUi();
  notify(`Baixa estornada para ${conta.cliente}.`, SEVERITY.SUCCESS);
}

/** @type {Record<string, number>} */
const PRAZO_DIAS_CR = { '7d': 7, '15d': 15, '30d': 30, '60d': 60 };

/**
 * Gera manualmente uma conta a receber para um pedido já entregue.
 * Usado para backfill de pedidos entregues antes da feature existir.
 * @param {string} pedidoId
 */
export async function gerarContaManual(pedidoId) {
  const pedido = PD().find((item) => item.id === pedidoId);
  if (!pedido) return;

  if (CR().some((conta) => conta.pedido_id === pedidoId)) {
    toast('Este pedido ja tem uma conta a receber.');
    return;
  }

  const dias = PRAZO_DIAS_CR[pedido.prazo || ''];
  let vencimento;
  if (dias && pedido.data) {
    const base = new Date(pedido.data + 'T00:00:00');
    base.setDate(base.getDate() + dias);
    vencimento = base.toISOString().split('T')[0];
  } else {
    vencimento = pedido.data || new Date().toISOString().split('T')[0];
  }

  /** @type {ContaReceber} */
  const conta = {
    id: uid(),
    filial_id: /** @type {string} */ (State.FIL),
    pedido_id: pedido.id,
    pedido_num: pedido.num,
    cliente_id: pedido.cliente_id || null,
    cliente: pedido.cli,
    valor: pedido.total,
    valor_recebido: 0,
    valor_em_aberto: pedido.total,
    vencimento,
    status: 'pendente',
    recebido_em: null,
    ultimo_recebimento_em: null
  };

  try {
    await SB.upsertContaReceber(conta);
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'erro desconhecido';
    notify(`Erro ao gerar conta: ${message}`, SEVERITY.ERROR);
    return;
  }

  if (!D.contasReceber) D.contasReceber = {};
  const filialId = getFilialAtual();
  if (!D.contasReceber[filialId]) D.contasReceber[filialId] = [];
  D.contasReceber[filialId].push(conta);
  refreshContasReceberUi();
  notify(`Conta a receber gerada para pedido #${pedido.num}`, SEVERITY.SUCCESS);
}

window.addEventListener(
  'sc:conta-receber-criada',
  /** @type {EventListener} */ (
    (event) => {
      const ev = /** @type {CustomEvent} */ (event);
      const conta = ev.detail;
      if (!conta || !conta.filial_id) return;
      if (!D.contasReceber) D.contasReceber = {};
      if (!D.contasReceber[conta.filial_id]) D.contasReceber[conta.filial_id] = [];

      /** @type {ContaReceber} */
      const normalized = {
        ...conta,
        valor_recebido: Number(conta.valor_recebido || 0),
        valor_em_aberto: Number(conta.valor_em_aberto ?? conta.valor ?? 0),
        status: conta.status || 'pendente',
        recebido_em: conta.recebido_em || null,
        ultimo_recebimento_em: conta.ultimo_recebimento_em || null
      };

      const jaExiste = D.contasReceber[conta.filial_id].some((item) => item.id === conta.id);
      if (!jaExiste) {
        D.contasReceber[conta.filial_id].push(normalized);
      }

      if (conta.filial_id === State.FIL) {
        refreshContasReceberUi();
      }
    }
  )
);
