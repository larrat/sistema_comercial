// @ts-check

import { SB } from '../app/api.js';
import { D, State } from '../app/store.js';
import { createScreenDom } from '../shared/dom.js';
import {
  abrirModal,
  fecharModal,
  toast,
  notify,
  notifyGuided,
  focusField,
  fmt
} from '../shared/utils.js';
import { measureRender } from '../shared/render-metrics.js';
import { MSG, SEVERITY } from '../shared/messages.js';
import { renderPedMet, renderPedidos } from './pedidos.js';
import { getRcaNomeById, refreshRcaSelectors } from './rcas.js';
import { buildSkeletonLines } from './runtime-loading.js';
import {
  adicionarLancamentoFidelidadeAction,
  adicionarNotaAction,
  fecharVendaClienteAction,
  removerClienteAction,
  salvarClienteAction
} from './clientes/actions.js';
import { getClienteById, getClientes } from './clientes/repository.js';
import {
  getContatoInfo,
  normalizeDoc,
  normalizeEmail,
  normalizePhone,
  parseTimes,
  PRAZO_DETALHE_LABELS,
  PRAZO_LABELS,
  ST_B,
  ST_PED,
  TAB_LABELS
} from './clientes/domain.js';
import {
  checkClienteIdentity,
  filterClientesFromLegacy,
  getClienteSegmentosFromLegacy
} from '../shared/clientes-pilot-bridge.js';
import { createClientesLegacyDetail } from './clientes-legacy-detail.js';
import { createClientesLegacyForm } from './clientes-legacy-form.js';

/** @typedef {import('../types/domain').Cliente} Cliente */
/** @typedef {import('../types/domain').Pedido} Pedido */
/** @typedef {import('../types/domain').ClientesModuleCallbacks} ClientesModuleCallbacks */
/** @typedef {import('../types/domain').ScreenDom} ScreenDom */

/** @type {NonNullable<ClientesModuleCallbacks['setFlowStep']>} */
let setFlowStepSafe = () => {};
let clientesFilterCache = null;
let clientesSegCache = null;

function isRuntimeBootstrapping() {
  return document.body.dataset.runtimeBootstrap === 'starting';
}

/** @type {ScreenDom} */
const cliDom = createScreenDom('clientes', [
  'cli-met',
  'cli-fil-seg',
  'cli-busca',
  'cli-fil-st',
  'cli-lista',
  'cli-segs-lista',
  'cli-modal-titulo',
  'cli-flow-save',
  'cli-dl',
  'cli-det-box',
  'c-rca'
]);

const AVC = [
  { bg: '#E6EEF9', c: '#0F2F5E' },
  { bg: '#E6F4EC', c: '#0D3D22' },
  { bg: '#FAF0D6', c: '#5C3900' },
  { bg: '#FAEBE9', c: '#731F18' }
];

/**
 * @param {ClientesModuleCallbacks} [callbacks]
 */
export function initClientesModule(callbacks = {}) {
  setFlowStepSafe = callbacks.setFlowStep || (() => {});
}

/**
 * @param {unknown} value
 */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {unknown} nome
 */
function avc(nome) {
  const value = String(nome || 'X');
  return AVC[value.charCodeAt(0) % AVC.length];
}

/**
 * @param {unknown} nome
 */
function ini(nome) {
  const parts = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'CL';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/**
 * @param {string | null | undefined} iso
 */
function fmtAniv(iso) {
  if (!iso) return '';
  const [year, month, day] = String(iso).split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}`;
}

/**
 * @param {string | null | undefined} iso
 */
function getDiasParaAniversario(iso) {
  if (!iso) return null;

  const [, month, day] = String(iso).split('-').map(Number);
  if (!month || !day) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let alvo = new Date(hoje.getFullYear(), month - 1, day);
  alvo.setHours(0, 0, 0, 0);

  if (alvo < hoje) {
    alvo = new Date(hoje.getFullYear() + 1, month - 1, day);
    alvo.setHours(0, 0, 0, 0);
  }

  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/**
 * @param {Cliente | null | undefined} cliente
 */
function getBadgeAniversario(cliente) {
  if (!cliente?.data_aniversario) return '';

  const dias = getDiasParaAniversario(cliente.data_aniversario);
  if (dias == null) {
    return `<span class="bdg bb">Aniv ${esc(fmtAniv(cliente.data_aniversario))}</span>`;
  }
  if (dias === 0) {
    return '<span class="bdg br">Aniv hoje</span>';
  }
  if (dias <= 7) {
    return `<span class="bdg ba">Aniv ${dias}d</span>`;
  }
  return `<span class="bdg bb">Aniv ${esc(fmtAniv(cliente.data_aniversario))}</span>`;
}

/**
 * @param {{
 *   doc?: string;
 *   email?: string;
 *   tel?: string;
 *   whatsapp?: string;
 *   editId?: string | null;
 * }} [input]
 */
function getFilteredClientes() {
  const q = cliDom.get('cli-busca')?.value || '';
  const seg = cliDom.get('cli-fil-seg')?.value || '';
  const status = cliDom.get('cli-fil-st')?.value || '';
  const clientes = getClientes();

  if (
    clientesFilterCache &&
    clientesFilterCache.ref === clientes &&
    clientesFilterCache.len === clientes.length &&
    clientesFilterCache.q === q &&
    clientesFilterCache.seg === seg &&
    clientesFilterCache.status === status
  ) {
    return clientesFilterCache.result;
  }

  const result = filterClientesFromLegacy(clientes, { q, seg, status });

  clientesFilterCache = { ref: clientes, len: clientes.length, q, seg, status, result };
  return result;
}

function getClienteSegmentos() {
  const clientes = getClientes();
  if (
    clientesSegCache &&
    clientesSegCache.ref === clientes &&
    clientesSegCache.len === clientes.length
  ) {
    return clientesSegCache.result;
  }

  const result = getClienteSegmentosFromLegacy(clientes);

  clientesSegCache = { ref: clientes, len: clientes.length, result };
  return result;
}

function renderEstadoVazio() {
  const texto = getClientes().length
    ? 'Nenhum cliente encontrado com os filtros atuais.'
    : 'Clique em "Novo cliente" para cadastrar o primeiro.';

  cliDom.html(
    'list',
    'cli-lista',
    `<div class="empty"><div class="ico">CL</div><p>${esc(texto)}</p></div>`,
    'clientes:lista-vazia'
  );
}

function renderTagsCliente(cliente, contato, times) {
  return [
    getBadgeAniversario(cliente),
    contato.badge,
    cliente.optin_marketing ? '<span class="bdg bg">MKT</span>' : '',
    cliente.optin_email ? '<span class="bdg bk">E-mail</span>' : '',
    cliente.optin_sms ? '<span class="bdg bk">SMS</span>' : '',
    cliente.seg ? `<span class="bdg bk">${esc(cliente.seg)}</span>` : '',
    ...times.map((time) => `<span class="bdg bb">${esc(time)}</span>`)
  ]
    .filter(Boolean)
    .join('');
}

function renderClienteMobile(cliente) {
  const cor = avc(cliente.nome);
  const contato = getContatoInfo(cliente);
  const times = parseTimes(cliente.time);
  const tabela = TAB_LABELS[cliente.tab] || '-';
  const prazo = PRAZO_LABELS[cliente.prazo] || '-';

  return `
    <div class="mobile-card">
      <div class="mobile-card-head">
        <div class="mobile-card-hero">
          <div class="av" style="background:${cor.bg};color:${cor.c}">${esc(ini(cliente.nome))}</div>
          <div class="mobile-card-grow">
            <div class="mobile-card-title">${esc(cliente.nome)}</div>
            ${cliente.apelido ? `<div class="mobile-card-sub">${esc(cliente.apelido)}</div>` : ''}
          </div>
        </div>
        <div>${ST_B[cliente.status] || ''}</div>
      </div>

      <div class="mobile-card-meta mobile-card-meta-gap">
        <div>${esc(contato.principal)}</div>
        ${contato.secundario ? `<div>${esc(contato.secundario)}</div>` : ''}
        ${cliente.email && !contato.principal.includes(cliente.email) ? `<div>${esc(cliente.email)}</div>` : ''}
        <div>${tabela} - ${esc(prazo)}</div>
      </div>

      <div class="mobile-card-tags mobile-card-tags-tight">
        ${renderTagsCliente(cliente, contato, times)}
      </div>

      <div class="mobile-card-actions">
        <button class="btn btn-sm" data-click="abrirCliDet('${cliente.id}')">Detalhes</button>
        <button class="btn btn-p btn-sm" data-click="editarCli('${cliente.id}')">Editar</button>
        <button class="btn btn-sm" data-click="removerCli('${cliente.id}')">Excluir</button>
      </div>
    </div>
  `;
}

function renderClienteDesktop(cliente) {
  const cor = avc(cliente.nome);
  const contato = getContatoInfo(cliente);
  const times = parseTimes(cliente.time);

  return `
    <tr>
      <td><div class="av" style="background:${cor.bg};color:${cor.c}">${esc(ini(cliente.nome))}</div></td>
      <td>
        <div class="table-cell-strong">${esc(cliente.nome)}</div>
        ${cliente.apelido ? `<div class="table-cell-caption table-cell-muted">${esc(cliente.apelido)}</div>` : ''}
      </td>
      <td>
        <div>${esc(contato.principal)}</div>
        ${contato.secundario ? `<div class="table-cell-caption table-cell-muted">${esc(contato.secundario)}</div>` : ''}
        ${cliente.email && !contato.principal.includes(cliente.email) ? `<div class="table-cell-caption table-cell-muted">${esc(cliente.email)}</div>` : ''}
      </td>
      <td>
        <div class="fg2 gap-4">
          ${getBadgeAniversario(cliente) || '<span class="table-cell-muted">-</span>'}
          ${contato.badge}
          ${cliente.optin_marketing ? '<span class="bdg bg">MKT</span>' : ''}
          ${cliente.optin_email ? '<span class="bdg bk">E-mail</span>' : ''}
          ${cliente.optin_sms ? '<span class="bdg bk">SMS</span>' : ''}
        </div>
      </td>
      <td>
        <div class="fg2 gap-4">
          ${cliente.seg ? `<span class="bdg bk">${esc(cliente.seg)}</span>` : ''}
          ${times.map((time) => `<span class="bdg bb">${esc(time)}</span>`).join('')}
          ${!cliente.seg && !times.length ? '-' : ''}
        </div>
      </td>
      <td>${TAB_LABELS[cliente.tab] || '-'}</td>
      <td class="table-cell-muted">${esc(PRAZO_LABELS[cliente.prazo] || '-')}</td>
      <td>${ST_B[cliente.status] || ''}</td>
      <td>
        <div class="fg2 table-row-actions">
          <button class="btn btn-sm" data-click="abrirCliDet('${cliente.id}')">Detalhes</button>
          <button class="btn btn-p btn-sm" data-click="editarCli('${cliente.id}')">Editar</button>
          <button class="btn btn-sm" data-click="removerCli('${cliente.id}')">Excluir</button>
        </div>
      </td>
    </tr>
  `;
}

const clientesLegacyDetail = createClientesLegacyDetail({
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
});

const clientesLegacyForm = createClientesLegacyForm({
  State,
  cliDom,
  MSG,
  SEVERITY,
  notify,
  notifyGuided,
  focusField,
  abrirModal,
  fecharModal,
  refreshRcaSelectors,
  getRcaNomeById,
  parseTimes,
  getClientes,
  getClienteById,
  checkClienteIdentity,
  salvarClienteAction,
  renderCliMet,
  renderClientes,
  renderCliSegs,
  refreshCliDL,
  setFlowStepSafe
});

/**
 * @param {string} clienteId
 * @param {'resumo'|'abertas'|'fechadas'|'fidelidade'} tab
 */
export function switchCliDetTab(clienteId, tab) {
  return clientesLegacyDetail.switchCliDetTab(clienteId, tab);
}

export function renderCliMet() {
  return measureRender(
    'clientes',
    () => {
      const clientes = getClientes();
      if (isRuntimeBootstrapping() && !clientes.length) {
        cliDom.html(
          'metrics',
          'cli-met',
          `
        <div class="sk-grid sk-grid-4">
          <div class="sk-card">${buildSkeletonLines(2)}</div>
          <div class="sk-card">${buildSkeletonLines(2)}</div>
          <div class="sk-card">${buildSkeletonLines(2)}</div>
          <div class="sk-card">${buildSkeletonLines(2)}</div>
        </div>
      `,
          'clientes:skeleton-metrics'
        );
        return;
      }
      const ativos = clientes.filter((cliente) => cliente.status === 'ativo').length;
      const prospectos = clientes.filter((cliente) => cliente.status === 'prospecto').length;
      const segmentos = [...new Set(clientes.map((cliente) => cliente.seg).filter(Boolean))].length;
      const currentSeg = cliDom.get('cli-fil-seg')?.value || '';

      cliDom.html(
        'metrics',
        'cli-met',
        `
      <div class="met"><div class="ml">Total</div><div class="mv">${clientes.length}</div></div>
      <div class="met"><div class="ml">Ativos</div><div class="mv">${ativos}</div></div>
      <div class="met"><div class="ml">Prospectos</div><div class="mv">${prospectos}</div></div>
      <div class="met"><div class="ml">Segmentos</div><div class="mv">${segmentos}</div></div>
    `,
        'clientes:metrics'
      );

      cliDom.select(
        'filters',
        'cli-fil-seg',
        '<option value="">Todos os segmentos</option>' +
          [...new Set(clientes.map((cliente) => cliente.seg).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b))
            .map((seg) => `<option value="${esc(seg)}">${esc(seg)}</option>`)
            .join(''),
        currentSeg,
        'clientes:segmentos'
      );
    },
    'metrics'
  );
}

export function renderClientes() {
  return measureRender(
    'clientes',
    () => {
      const filtrados = getFilteredClientes();
      if (isRuntimeBootstrapping() && !getClientes().length) {
        cliDom.html(
          'list',
          'cli-lista',
          `<div class="sk-card">${buildSkeletonLines(5)}</div>`,
          'clientes:skeleton-list'
        );
        return;
      }
      if (!filtrados.length) {
        renderEstadoVazio();
        return;
      }

      if (window.matchMedia('(max-width: 1280px)').matches) {
        cliDom.html(
          'list',
          'cli-lista',
          filtrados.map(renderClienteMobile).join(''),
          'clientes:lista-mobile'
        );
        return;
      }

      cliDom.html(
        'list',
        'cli-lista',
        `
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th></th>
              <th>Nome</th>
              <th>Contato</th>
              <th>Marketing</th>
              <th>Segmento</th>
              <th>Tabela</th>
              <th>Prazo</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${filtrados.map(renderClienteDesktop).join('')}</tbody>
        </table>
      </div>
    `,
        'clientes:lista-desktop'
      );
    },
    'list'
  );
}

export function renderCliSegs() {
  return measureRender(
    'clientes',
    () => {
      const el = cliDom.get('cli-segs-lista');
      if (!el) return;

      const segmentos = getClienteSegmentos();

      cliDom.html(
        'segments',
        'cli-segs-lista',
        segmentos
          .map((seg) => {
            const clientes = getClientes().filter(
              (cliente) => (cliente.seg || 'Sem segmento') === seg
            );

            return `
        <div class="card">
          <div class="fb form-gap-bottom-xs">
            <div class="table-cell-strong">${esc(seg)}</div>
            <span class="bdg bb">${clientes.length}</span>
          </div>
          <div class="fg2">
            ${clientes
              .map((cliente) => {
                const cor = avc(cliente.nome);
                return `
                <button
                  class="btn btn-inline-card"
                  type="button"
                  data-click="abrirCliDet('${cliente.id}')"
                >
                  <div class="av av-sm" style="background:${cor.bg};color:${cor.c}">
                    ${esc(ini(cliente.nome))}
                  </div>
                  <span class="btn-inline-card__label">${esc(cliente.apelido || cliente.nome)}</span>
                </button>
              `;
              })
              .join('')}
          </div>
        </div>
      `;
          })
          .join(''),
        'clientes:segmentos-lista'
      );
    },
    'segments'
  );
}

// ── Fidelidade UI ─────────────────────────────────────────────────────────────

/**
 * @param {string} clienteId
 * @param {import('../types/domain').ClienteFidelidadeSaldo | null} saldo
 * @param {import('../types/domain').ClienteFidelidadeLancamento[]} lancamentos
 * @returns {string}
 */

/**
 * Lança pontos de fidelidade manualmente para um cliente.
 * @param {string} clienteId
 */
export async function adicionarLancamentoFidelidade(clienteId) {
  return clientesLegacyDetail.adicionarLancamentoFidelidade(clienteId);
}

export async function abrirCliDet(id) {
  return clientesLegacyDetail.abrirCliDet(id);
}

/**
 * @param {string} pedidoId
 * @param {string} clienteId
 */
export async function fecharVendaCliente(pedidoId, clienteId) {
  return clientesLegacyDetail.fecharVendaCliente(pedidoId, clienteId);
}

export async function addNota(id) {
  return clientesLegacyDetail.addNota(id);
}

export function limparFormCli() {
  return clientesLegacyForm.limparFormCli();
}

export function editarCli(id) {
  return clientesLegacyForm.editarCli(id);
}

export async function salvarCliente() {
  return clientesLegacyForm.salvarCliente();
}

export async function removerCli(id) {
  if (!confirm('Remover cliente?')) return;

  const result = await removerClienteAction(id);
  if (!result.ok) {
    toast(`Erro: ${result.error instanceof Error ? result.error.message : 'erro desconhecido'}`);
    return;
  }

  renderCliMet();
  renderClientes();
  renderCliSegs();
  refreshCliDL();

  toast('Cliente removido.');
}

export function refreshCliDL() {
  cliDom.html(
    'selectors',
    'cli-dl',
    getClientes()
      .map((cliente) => `<option value="${esc(cliente.nome)}">`)
      .join(''),
    'clientes:datalist'
  );
}
