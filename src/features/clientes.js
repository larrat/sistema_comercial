// @ts-check

import { SB } from '../app/api.js';
import { D, State, C, invalidatePdCache } from '../app/store.js';
import { createScreenDom } from '../shared/dom.js';
import {
  abrirModal,
  fecharModal,
  toast,
  notify,
  notifyGuided,
  focusField,
  fmt,
  uid
} from '../shared/utils.js';
import { measureRender } from '../shared/render-metrics.js';
import { MSG, SEVERITY } from '../shared/messages.js';
import { renderPedMet, renderPedidos } from './pedidos.js';
import { getRcaNomeById, refreshRcaSelectors } from './rcas.js';
import { buildSkeletonLines } from './runtime-loading.js';
import {
  checkClienteIdentity,
  filterClientesFromLegacy,
  getClienteSegmentosFromLegacy
} from '../shared/clientes-pilot-bridge.js';
import { shouldRenderLegacyClientes, syncClientesReactBridge } from './clientes-react-bridge.js';

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

const CLI_FORM_IDS = [
  'c-nome',
  'c-apelido',
  'c-doc',
  'c-tel',
  'c-whatsapp',
  'c-email',
  'c-aniv',
  'c-time',
  'c-resp',
  'c-seg',
  'c-cidade',
  'c-estado',
  'c-obs'
];

const CLI_SELECT_DEFAULTS = {
  'c-tipo': 'PJ',
  'c-status': 'ativo',
  'c-rca': '',
  'c-tab': 'padrao',
  'c-prazo': 'a_vista'
};

const CLI_CHECKBOX_IDS = ['c-optin-marketing', 'c-optin-email', 'c-optin-sms'];

const AVC = [
  { bg: '#E6EEF9', c: '#0F2F5E' },
  { bg: '#E6F4EC', c: '#0D3D22' },
  { bg: '#FAF0D6', c: '#5C3900' },
  { bg: '#FAEBE9', c: '#731F18' }
];

const ST_B = {
  ativo: '<span class="bdg bg">Ativo</span>',
  inativo: '<span class="bdg bk">Inativo</span>',
  prospecto: '<span class="bdg bb">Prospecto</span>'
};

const ST_PED = {
  orcamento: '<span class="bdg bk">Orcamento</span>',
  confirmado: '<span class="bdg bb">Confirmado</span>',
  em_separacao: '<span class="bdg ba">Em separação</span>',
  entregue: '<span class="bdg bg">Entregue</span>',
  cancelado: '<span class="bdg br">Cancelado</span>'
};

const TAB_LABELS = {
  padrao: 'Padrao',
  especial: '<span class="bdg ba">Especial</span>',
  vip: '<span class="bdg br">VIP</span>'
};

const PRAZO_LABELS = {
  a_vista: 'A vista',
  '7d': '7d',
  '15d': '15d',
  '30d': '30d',
  '60d': '60d'
};

const PRAZO_DETALHE_LABELS = {
  a_vista: 'A vista',
  '7d': '7 dias',
  '15d': '15 dias',
  '30d': '30 dias',
  '60d': '60 dias'
};

/**
 * @param {ClientesModuleCallbacks} [callbacks]
 */
export function initClientesModule(callbacks = {}) {
  setFlowStepSafe = callbacks.setFlowStep || (() => {});
  syncClientesReactBridge();
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
 * @param {Cliente | null | undefined} cliente
 */
function getContatoInfo(cliente) {
  const whatsapp = String(cliente?.whatsapp || '').trim();
  const tel = String(cliente?.tel || '').trim();
  const email = String(cliente?.email || '').trim();

  if (whatsapp) {
    return {
      principal: `WhatsApp: ${whatsapp}`,
      secundario: tel && tel !== whatsapp ? `Telefone: ${tel}` : '',
      badge: '<span class="bdg bg">WhatsApp</span>'
    };
  }

  if (tel) {
    return {
      principal: `Telefone: ${tel}`,
      secundario: email,
      badge: '<span class="bdg ba">Telefone</span>'
    };
  }

  if (email) {
    return {
      principal: email,
      secundario: '',
      badge: '<span class="bdg bb">E-mail</span>'
    };
  }

  return {
    principal: 'Sem contato',
    secundario: '',
    badge: '<span class="bdg br">Sem contato</span>'
  };
}

/**
 * @param {unknown} value
 */
function normTxt(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * @param {string | string[] | null | undefined} value
 */
function parseTimes(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,;\n]+/);

  const seen = new Set();
  const out = [];

  raw.forEach((item) => {
    const nome = String(item || '').trim();
    if (!nome) return;
    const key = normTxt(nome);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(nome);
  });

  return out;
}

/**
 * @param {unknown} value
 */
function normalizePhone(value) {
  return String(value || '').replace(/\D+/g, '');
}

/**
 * @param {unknown} value
 */
function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown} value
 */
function normalizeDoc(value) {
  return String(value || '')
    .replace(/[^0-9A-Za-z]+/g, '')
    .trim()
    .toLowerCase();
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
/** @type {Record<string, string>} */
const CLI_FIELD_DOM_IDS = {
  doc: 'c-doc',
  email: 'c-email',
  tel: 'c-tel',
  whatsapp: 'c-whatsapp'
};

function findClienteDuplicadoIdentidade({
  doc = '',
  email = '',
  tel = '',
  whatsapp = '',
  editId = null
} = {}) {
  const conflict = checkClienteIdentity({ id: editId, nome: '', doc, email, tel, whatsapp }, C());
  if (!conflict) return null;
  return {
    key: conflict.field,
    label: conflict.label,
    fieldId: CLI_FIELD_DOM_IDS[conflict.field] ?? `c-${conflict.field}`,
    value: conflict.normalizedValue,
    cliente: conflict.existing
  };
}

/**
 * @param {unknown} err
 */
function extractClienteConstraintName(err) {
  /** @type {{ message?: unknown; details?: unknown } | null} */
  const errObj =
    err && typeof err === 'object'
      ? /** @type {{ message?: unknown; details?: unknown }} */ (err)
      : null;

  /** @type {{ response?: { message?: unknown; details?: unknown; code?: unknown } } | null} */
  const detailsObj =
    errObj?.details && typeof errObj.details === 'object'
      ? /** @type {{ response?: { message?: unknown; details?: unknown; code?: unknown } }} */ (
          errObj.details
        )
      : null;

  const text = [
    errObj?.message,
    detailsObj?.response?.message,
    detailsObj?.response?.details,
    detailsObj?.response?.code
  ]
    .map((value) => String(value || ''))
    .join(' | ');

  const match = text.match(/ux_clientes_[A-Za-z0-9_]+/);
  return match ? match[0] : '';
}

/**
 * @param {unknown} err
 * @param {ReturnType<typeof findClienteDuplicadoIdentidade> | null} [fallbackConflict=null]
 */
function handleClienteDuplicadoError(err, fallbackConflict = null) {
  const constraint = extractClienteConstraintName(err);
  const conflictByConstraint =
    constraint === 'ux_clientes_filial_doc_norm'
      ? { label: 'documento', fieldId: 'c-doc', cliente: null }
      : constraint === 'ux_clientes_filial_email_norm'
        ? { label: 'e-mail', fieldId: 'c-email', cliente: null }
        : constraint === 'ux_clientes_filial_tel_norm' ||
            constraint === 'ux_clientes_filial_tel_identity'
          ? { label: 'telefone', fieldId: 'c-tel', cliente: null }
          : constraint === 'ux_clientes_filial_whatsapp_norm' ||
              constraint === 'ux_clientes_filial_whatsapp_identity'
            ? { label: 'WhatsApp', fieldId: 'c-whatsapp', cliente: null }
            : null;

  const conflict = fallbackConflict || conflictByConstraint;
  if (!conflict) return false;

  notifyGuided({
    severity: SEVERITY.WARNING,
    what: `${conflict.label} ja cadastrado para outro cliente${conflict.cliente?.nome ? ` (${conflict.cliente.nome})` : ''}`,
    impact: 'o cliente nao foi salvo para evitar duplicidade no cadastro',
    next: `revise o campo ${conflict.label} ou edite o cadastro existente`
  });
  focusField(conflict.fieldId, { markError: true });
  return true;
}

function getClienteDuplicidadeSignals(cliente) {
  const checks = [
    { label: 'documento', value: normalizeDoc(cliente?.doc), fieldId: 'c-doc' },
    { label: 'e-mail', value: normalizeEmail(cliente?.email), fieldId: 'c-email' },
    { label: 'telefone', value: normalizePhone(cliente?.tel), fieldId: 'c-tel' },
    { label: 'WhatsApp', value: normalizePhone(cliente?.whatsapp), fieldId: 'c-whatsapp' }
  ];

  return checks
    .filter((check) => check.value)
    .map((check) => {
      const duplicado =
        C().find((item) => {
          if (!item || item.id === cliente?.id) return false;
          if (check.label === 'telefone' || check.label === 'WhatsApp') {
            return [normalizePhone(item.tel), normalizePhone(item.whatsapp)]
              .filter(Boolean)
              .includes(check.value);
          }
          if (check.label === 'documento') return normalizeDoc(item.doc) === check.value;
          return normalizeEmail(item.email) === check.value;
        }) || null;

      return duplicado ? { ...check, cliente: duplicado } : null;
    })
    .filter(Boolean);
}

function buildClienteContextualPanelV2(cliente, pedidos) {
  const duplicidades = getClienteDuplicidadeSignals(cliente);
  const aniversarioDias = getDiasParaAniversario(cliente?.data_aniversario || '');
  const contato = getContatoInfo(cliente);
  const canaisMarketing = [
    cliente?.optin_marketing && (cliente?.whatsapp || cliente?.tel) ? 'WhatsApp' : '',
    cliente?.optin_email && cliente?.email ? 'E-mail' : '',
    cliente?.optin_sms && cliente?.tel ? 'SMS' : ''
  ].filter(Boolean);
  const pedidoFechavel = pedidos.find((pedido) => isPedidoFechavel(pedido)) || null;
  const pedidoAberto =
    pedidos.find((pedido) => !pedido.venda_fechada && pedido.status !== 'cancelado') || null;

  /** @type {string[]} */
  const cadastroERisco = [];
  /** @type {string[]} */
  const momentoComercial = [];

  const renderSection = (title, sub, cards) => {
    if (!cards.length) return '';
    return `
      <section class="context-panel__section">
        <div class="context-panel__section-head">
          <div class="context-panel__section-title">${title}</div>
          <div class="context-panel__section-sub">${sub}</div>
        </div>
        <div class="context-panel__grid">
          ${cards.join('')}
        </div>
      </section>
    `;
  };

  if (duplicidades.length) {
    const duplicidade = duplicidades[0];
    cadastroERisco.push(`
      <article class="context-card context-card--danger">
        <div class="context-card__head">
          <span class="bdg br">Cadastro</span>
          <span class="context-card__kicker">Risco</span>
        </div>
        <div class="context-card__title">Suspeita de duplicidade</div>
        <div class="context-card__copy">${duplicidade.label} tambem aparece em ${esc(duplicidade.cliente?.nome || 'outro cliente')}.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="editarCli('${cliente.id}')">Revisar cadastro</button>
        </div>
      </article>
    `);
  }

  if (
    (typeof aniversarioDias === 'number' && aniversarioDias <= 7) ||
    !canaisMarketing.length ||
    contato.principal === 'Sem contato'
  ) {
    const copy =
      contato.principal === 'Sem contato'
        ? 'Cliente sem canal principal de contato cadastrado.'
        : !canaisMarketing.length
          ? 'Cliente sem opt-in pronto para ativacao comercial.'
          : aniversarioDias === 0
            ? 'Aniversario hoje com canal pronto para relacionamento.'
            : aniversarioDias === 1
              ? 'Aniversario amanha com base pronta para abordagem.'
              : `Aniversario em ${aniversarioDias} dia(s) com canal pronto para campanha.`;

    cadastroERisco.push(`
      <article class="context-card context-card--warning">
        <div class="context-card__head">
          <span class="bdg ba">Relacionamento</span>
          <span class="context-card__kicker">Cadastro</span>
        </div>
        <div class="context-card__title">Proxima acao comercial</div>
        <div class="context-card__copy">${copy}</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="editarCli('${cliente.id}')">Atualizar cadastro</button>
          <button class="btn btn-sm" data-click="ir('campanhas')">Ir para campanhas</button>
        </div>
      </article>
    `);
  }

  if (pedidoFechavel) {
    momentoComercial.push(`
      <article class="context-card context-card--success">
        <div class="context-card__head">
          <span class="bdg bg">Venda</span>
          <span class="context-card__kicker">Fechamento</span>
        </div>
        <div class="context-card__title">Pedido pronto para fechar</div>
        <div class="context-card__copy">Pedido #${pedidoFechavel.num} ja foi entregue e pode virar venda fechada agora.</div>
        <div class="context-card__actions">
          <button class="btn btn-p btn-sm" data-click="fecharVendaCliente('${pedidoFechavel.id}','${cliente.id}')">Fechar venda</button>
        </div>
      </article>
    `);
  } else if (pedidoAberto) {
    momentoComercial.push(`
      <article class="context-card context-card--info">
        <div class="context-card__head">
          <span class="bdg bb">Pipeline</span>
          <span class="context-card__kicker">Pedidos</span>
        </div>
        <div class="context-card__title">Cliente com venda em andamento</div>
        <div class="context-card__copy">Ha pedido(s) aberto(s) para este cliente e vale acompanhar o fechamento.</div>
        <div class="context-card__actions">
          <button class="btn btn-sm" data-click="switchCliDetTab('${cliente.id}','abertas')">Ver vendas abertas</button>
        </div>
      </article>
    `);
  }

  const sections = [
    renderSection(
      'Cadastro e risco',
      'Sinais que pertencem ao cadastro e aos canais deste cliente.',
      cadastroERisco.slice(0, 2)
    ),
    renderSection(
      'Momento comercial',
      'Leitura da jornada do cliente com base nos pedidos e no proximo movimento.',
      momentoComercial.slice(0, 1)
    )
  ].filter(Boolean);

  if (!sections.length) return '';

  return `
    <div class="context-panel context-panel--cliente">
      <div class="context-panel__head">
        <div class="context-panel__title">Contexto do cliente</div>
        <div class="context-panel__sub">Leitura separada entre cadastro, risco e momento comercial</div>
      </div>
      <div class="context-panel__sections">
        ${sections.join('')}
      </div>
    </div>
  `;
}

function getFilteredClientes() {
  const q = cliDom.get('cli-busca')?.value || '';
  const seg = cliDom.get('cli-fil-seg')?.value || '';
  const status = cliDom.get('cli-fil-st')?.value || '';
  const clientes = C();

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
  const clientes = C();
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
  const texto = C().length
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
        <div class="fg2">
          <button class="btn btn-sm" data-click="abrirCliDet('${cliente.id}')">Detalhes</button>
          <button class="btn btn-p btn-sm" data-click="editarCli('${cliente.id}')">Editar</button>
          <button class="btn btn-sm" data-click="removerCli('${cliente.id}')">Excluir</button>
        </div>
      </td>
    </tr>
  `;
}

function renderNotasHtml(notas) {
  if (!notas.length) {
    return '<div class="empty-inline table-cell-muted">Nenhuma nota.</div>';
  }

  return notas
    .map(
      (nota) => `
    <div class="nota">
      <div>${esc(nota.texto)}</div>
      <div class="nota-d">${esc(nota.data)}</div>
    </div>
  `
    )
    .join('');
}

/**
 * @param {Cliente} cliente
 * @returns {Pedido[]}
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
 * @param {Pedido} pedido
 */
function isPedidoFechavel(pedido) {
  return pedido.status === 'entregue' && !pedido.venda_fechada;
}

/**
 * @param {Pedido[]} pedidos
 */
function renderClientePedidosVazios(pedidos) {
  if (pedidos.length) return '';
  return '<div class="empty-inline table-cell-muted">Nenhuma venda neste grupo.</div>';
}

/**
 * @param {Pedido[]} pedidos
 * @param {string} clienteId
 * @param {'abertas'|'fechadas'} tipo
 */
function renderClientePedidosLista(pedidos, clienteId, tipo) {
  if (!pedidos.length) return renderClientePedidosVazios(pedidos);

  return pedidos
    .map((pedido) => {
      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
      const itensTxt = itens.length ? `${itens.length} item(ns)` : 'Sem itens';
      const fechadoEm = pedido.venda_fechada_em
        ? new Date(pedido.venda_fechada_em).toLocaleString('pt-BR')
        : '';

      return `
      <div class="cli-sale-card">
        <div class="cli-sale-card__head">
          <div>
            <div class="cli-sale-card__title">Pedido #${pedido.num}</div>
            <div class="cli-sale-card__sub">${esc(pedido.data || '-')} | ${itensTxt}</div>
          </div>
          <div class="fg2">
            ${ST_PED[pedido.status] || ''}
            ${pedido.venda_fechada ? '<span class="bdg bb">Fechada</span>' : ''}
          </div>
        </div>
        <div class="cli-sale-card__meta">
          <span>Total: <b>${fmt(pedido.total || 0)}</b></span>
          <span>Pagamento: <b>${esc(String(pedido.pgto || '-'))}</b></span>
          <span>Prazo: <b>${esc(String(pedido.prazo || '-'))}</b></span>
          ${fechadoEm ? `<span>Fechada em: <b>${esc(fechadoEm)}</b></span>` : ''}
        </div>
        <div class="cli-sale-card__actions">
          <button class="btn btn-sm" data-click="verPed('${pedido.id}')">Ver pedido</button>
          ${
            tipo === 'abertas' && isPedidoFechavel(pedido)
              ? `<button class="btn btn-p btn-sm" data-click="fecharVendaCliente('${pedido.id}','${clienteId}')">Fechar venda</button>`
              : ''
          }
        </div>
      </div>
    `;
    })
    .join('');
}

/**
 * @param {string} clienteId
 * @param {'resumo'|'abertas'|'fechadas'|'fidelidade'} tab
 */
export function switchCliDetTab(clienteId, tab) {
  const box = cliDom.get('cli-det-box');
  if (!box) return;

  box.querySelectorAll(`[data-cli-tab="${clienteId}"]`).forEach((el) => {
    el.classList.toggle('on', el instanceof HTMLElement && el.dataset.tab === tab);
  });
  box.querySelectorAll(`[data-cli-panel="${clienteId}"]`).forEach((el) => {
    el.classList.toggle('on', el instanceof HTMLElement && el.dataset.panel === tab);
  });
}

/**
 * @param {string} id
 * @returns {{ input: HTMLInputElement | null; list: HTMLElement | null }}
 */
function getDetailElements(id) {
  return {
    input: /** @type {HTMLInputElement | null} */ (document.getElementById(`nota-inp-${id}`)),
    list: /** @type {HTMLElement | null} */ (document.getElementById(`notas-${id}`))
  };
}

function syncNotasCache(id, notas) {
  if (!D.notas) D.notas = {};
  D.notas[id] = Array.isArray(notas) ? [...notas] : [];
}

function renderNotasCliente(id) {
  const { list } = getDetailElements(id);
  if (!list) return;
  list.innerHTML = renderNotasHtml(D.notas?.[id] || []);
}

export function renderCliMet() {
  return measureRender(
    'clientes',
    () => {
      if (!shouldRenderLegacyClientes()) return;
      const clientes = C();
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
      syncClientesReactBridge();
      if (!shouldRenderLegacyClientes()) return;
      const filtrados = getFilteredClientes();
      if (isRuntimeBootstrapping() && !C().length) {
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
      syncClientesReactBridge();
      if (!shouldRenderLegacyClientes()) return;
      const el = cliDom.get('cli-segs-lista');
      if (!el) return;

      const segmentos = getClienteSegmentos();

      cliDom.html(
        'segments',
        'cli-segs-lista',
        segmentos
          .map((seg) => {
            const clientes = C().filter((cliente) => (cliente.seg || 'Sem segmento') === seg);

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
function renderFidelidadeTab(clienteId, saldo, lancamentos) {
  const TIPO_LABEL = {
    credito: 'Crédito',
    debito: 'Débito',
    ajuste: 'Ajuste',
    expiracao: 'Expiração',
    estorno: 'Estorno'
  };
  const STATUS_LABEL = { pendente: 'Pendente', confirmado: 'Confirmado', cancelado: 'Cancelado' };
  const STATUS_BADGE = { pendente: 'ba', confirmado: 'bg', cancelado: 'br' };

  const saldoHtml = saldo
    ? `
      <div class="fid-saldo-grid">
        <div class="met fid-met">
          <div class="ml">Saldo</div>
          <div class="mv ${saldo.bloqueado ? 'tone-danger' : 'tone-success'}">${Number(saldo.saldo_pontos ?? 0)}<span class="mv-unit"> pts</span></div>
          ${saldo.bloqueado ? `<div class="ms tone-danger">Bloqueado${saldo.motivo_bloqueio ? ` — ${esc(saldo.motivo_bloqueio)}` : ''}</div>` : '<div class="ms tone-success">Ativo</div>'}
        </div>
        <div class="met fid-met">
          <div class="ml">Acumulado</div>
          <div class="mv">${Number(saldo.total_acumulado ?? 0)}<span class="mv-unit"> pts</span></div>
          <div class="ms">total creditado</div>
        </div>
        <div class="met fid-met">
          <div class="ml">Resgatado</div>
          <div class="mv">${Number(saldo.total_resgatado ?? 0)}<span class="mv-unit"> pts</span></div>
          <div class="ms">total debitado</div>
        </div>
      </div>
    `
    : `<div class="empty-inline"><p>Nenhum saldo de fidelidade registrado para este cliente.</p></div>`;

  const lancsHtml = lancamentos.length
    ? `
      <div class="tw fid-hist-table">
        <table class="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Pontos</th>
              <th>Status</th>
              <th>Origem</th>
              <th>Obs</th>
            </tr>
          </thead>
          <tbody>
            ${lancamentos
              .slice(0, 30)
              .map(
                (l) => `
              <tr>
                <td class="table-cell-muted">${l.criado_em ? new Date(l.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                <td><span class="bdg ${l.pontos > 0 ? 'bg' : 'br'}">${TIPO_LABEL[l.tipo] || esc(l.tipo || '')}</span></td>
                <td class="table-cell-strong ${l.pontos > 0 ? 'tone-success' : 'tone-danger'}">${l.pontos > 0 ? '+' : ''}${l.pontos}</td>
                <td><span class="bdg ${STATUS_BADGE[l.status] || 'bk'}">${STATUS_LABEL[l.status] || esc(l.status || '')}</span></td>
                <td class="table-cell-muted">${esc(l.origem || '') || '—'}</td>
                <td class="table-cell-caption">${esc(l.observacao || '') || '—'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
    : `<div class="empty-inline"><p>Nenhum lançamento registrado.</p></div>`;

  return `
    <div class="fid-panel">
      <div class="cli-detail-label form-gap-bottom-xs">Saldo de fidelidade</div>
      ${saldoHtml}

      <div class="cli-detail-label form-gap-bottom-xs" style="margin-top:16px">Adicionar lançamento manual</div>
      <div class="fid-form fg2 form-gap-bottom-xs">
        <select class="inp fid-tipo" id="fid-tipo-${clienteId}">
          <option value="credito">Crédito</option>
          <option value="debito">Débito</option>
          <option value="ajuste">Ajuste</option>
          <option value="estorno">Estorno</option>
        </select>
        <input type="number" class="inp fid-pontos" id="fid-pontos-${clienteId}" placeholder="Pontos (ex: 100 ou -50)" step="1">
        <input class="inp fid-obs input-flex" id="fid-obs-${clienteId}" placeholder="Observação (opcional)">
        <button class="btn btn-p btn-sm" data-click="adicionarLancamentoFidelidade('${clienteId}')">Lançar</button>
      </div>

      <div class="cli-detail-label form-gap-bottom-xs">Histórico (últimos 30)</div>
      ${lancsHtml}
    </div>
  `;
}

/**
 * Lança pontos de fidelidade manualmente para um cliente.
 * @param {string} clienteId
 */
export async function adicionarLancamentoFidelidade(clienteId) {
  const tipoEl = /** @type {HTMLSelectElement|null} */ (
    document.getElementById(`fid-tipo-${clienteId}`)
  );
  const pontosEl = /** @type {HTMLInputElement|null} */ (
    document.getElementById(`fid-pontos-${clienteId}`)
  );
  const obsEl = /** @type {HTMLInputElement|null} */ (
    document.getElementById(`fid-obs-${clienteId}`)
  );

  const tipo = tipoEl?.value || 'credito';
  const pontosRaw = Number(pontosEl?.value || 0);
  const obs = obsEl?.value.trim() || null;

  if (!pontosRaw || Number.isNaN(pontosRaw)) {
    notify('Informe a quantidade de pontos para o lançamento.', SEVERITY.WARNING);
    pontosEl?.focus();
    return;
  }

  // Débito e ajuste negativo: o banco espera pontos negativos para debitar
  const pontos = tipo === 'debito' ? -Math.abs(pontosRaw) : pontosRaw;

  const lancamento = {
    id: uid(),
    cliente_id: clienteId,
    filial_id: State.FIL,
    tipo,
    status: 'confirmado',
    pontos,
    origem: 'manual',
    observacao: obs
  };

  const result = await SB.toResult(() => SB.insertClienteFidelidadeLancamento(lancamento));
  if (!result.ok) {
    console.error('Erro ao inserir lançamento de fidelidade', result.error);
    notify(
      `Erro ao lançar pontos: ${String(result.error?.message || 'tente novamente')}.`,
      SEVERITY.ERROR
    );
    return;
  }

  notify(`Sucesso: ${pontos > 0 ? '+' : ''}${pontos} pontos lançados.`, SEVERITY.SUCCESS);
  // Reabrir a ficha com dados atualizados
  await abrirCliDet(clienteId);
  switchCliDetTab(clienteId, 'fidelidade');
}

export async function abrirCliDet(id) {
  const cliente = C().find((item) => item.id === id);
  if (!cliente) return;

  const cor = avc(cliente.nome);
  let notas = [];

  try {
    notas = (await SB.getNotas(id)) || [];
  } catch (error) {
    console.error('Erro ao carregar notas do cliente', error);
  }

  syncNotasCache(id, notas);

  // ── Fidelidade (carregado em paralelo com notas) ──────────────────────────
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
  const contextoCliente = buildClienteContextualPanelV2(cliente, pedidos);

  const times = parseTimes(cliente.time);
  const contato = [
    cliente.resp ? `Resp: ${cliente.resp}` : '',
    cliente.tel || '',
    cliente.whatsapp ? `WhatsApp: ${cliente.whatsapp}` : '',
    cliente.email || '',
    cliente.data_aniversario ? `Aniversario: ${fmtAniv(cliente.data_aniversario)}` : '',
    cliente.cidade ? `${cliente.cidade}${cliente.estado ? ` - ${cliente.estado}` : ''}` : ''
  ].filter(Boolean);

  cliDom.html(
    'detail',
    'cli-det-box',
    `
    <div class="cli-detail">
      <div class="cli-detail-head fb">
        <div class="cli-detail-hero">
          <div class="av cli-detail-avatar" style="background:${cor.bg};color:${cor.c}">
          ${esc(ini(cliente.nome))}
        </div>
          <div>
            <div class="cli-detail-title">${esc(cliente.nome)}</div>
            ${cliente.apelido ? `<div class="cli-detail-sub">${esc(cliente.apelido)}</div>` : ''}
            <div class="cli-detail-status">${ST_B[cliente.status] || ''}</div>
          </div>
        </div>
      </div>

      <div class="cli-detail-grid">
        <div class="cli-detail-panel">
          <div class="cli-detail-label">Contato</div>
        ${contato.length ? contato.map((item) => `<div class="detail-line">${esc(item)}</div>`).join('') : '-'}
        </div>

        <div class="cli-detail-panel">
          <div class="cli-detail-label">Comercial</div>
          <div>Tabela: ${TAB_LABELS[cliente.tab] || '-'}</div>
          <div>Prazo: ${esc(PRAZO_DETALHE_LABELS[cliente.prazo] || '-')}</div>
        ${cliente.rca_nome ? `<div>RCA: ${esc(cliente.rca_nome)}</div>` : ''}
        ${times.length ? `<div>Times: ${esc(times.join(', '))}</div>` : ''}
        ${cliente.seg ? `<div>Segmento: ${esc(cliente.seg)}</div>` : ''}
        </div>
      </div>

      ${contextoCliente}

      <div class="tabs cli-detail-tabs">
        <button class="tb on" type="button" data-cli-tab="${id}" data-tab="resumo" data-click="switchCliDetTab('${id}','resumo')">Resumo</button>
        <button class="tb" type="button" data-cli-tab="${id}" data-tab="abertas" data-click="switchCliDetTab('${id}','abertas')">Vendas abertas <span class="bdg bk">${vendasAbertas.length}</span></button>
        <button class="tb" type="button" data-cli-tab="${id}" data-tab="fechadas" data-click="switchCliDetTab('${id}','fechadas')">Vendas fechadas <span class="bdg bb">${vendasFechadas.length}</span></button>
        <button class="tb" type="button" data-cli-tab="${id}" data-tab="fidelidade" data-click="switchCliDetTab('${id}','fidelidade')">Fidelidade ${saldo ? `<span class="bdg ${saldo.bloqueado ? 'br' : 'bg'}">${Number(saldo.saldo_pontos ?? 0)} pts</span>` : '<span class="bdg bk">—</span>'}</button>
      </div>

      <div class="tc on" data-cli-panel="${id}" data-panel="resumo">
      ${
        cliente.obs
          ? `
        <div class="panel cli-detail-section">
        <div class="pt">Observacoes</div>
          <p class="detail-copy">${esc(cliente.obs)}</p>
      </div>
      `
          : ''
      }

      <div class="cli-detail-label form-gap-bottom-xs">Notas / historico</div>
      <div class="fg2 cli-detail-notes-input form-gap-bottom-xs">
      <input class="inp input-flex" id="nota-inp-${id}" placeholder="Adicionar nota...">
      <button class="btn btn-sm" data-click="addNota('${id}')">+</button>
    </div>

      <div class="cli-detail-notes" id="notas-${id}">${renderNotasHtml(D.notas?.[id] || [])}</div>
      </div>

      <div class="tc" data-cli-panel="${id}" data-panel="abertas">
        <div class="cli-detail-label form-gap-bottom-xs">Pedidos em andamento ou entregues aguardando fechamento</div>
        <div class="cli-sales-list">
          ${renderClientePedidosLista(vendasAbertas, id, 'abertas')}
        </div>
      </div>

      <div class="tc" data-cli-panel="${id}" data-panel="fechadas">
        <div class="cli-detail-label form-gap-bottom-xs">Vendas fechadas deste cliente</div>
        <div class="cli-sales-list">
          ${renderClientePedidosLista(vendasFechadas, id, 'fechadas')}
        </div>
      </div>

      <div class="tc" data-cli-panel="${id}" data-panel="fidelidade">
        ${renderFidelidadeTab(id, saldo, lancamentos)}
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
export async function fecharVendaCliente(pedidoId, clienteId) {
  const cliente = C().find((item) => item.id === clienteId);
  const pedido = (D.pedidos?.[State.FIL] || []).find((item) => item.id === pedidoId);
  if (!cliente || !pedido) return;
  if (!isPedidoFechavel(pedido)) {
    toast('Somente pedidos entregues e ainda abertos podem ser fechados.');
    return;
  }
  if (!confirm(`Fechar a venda do pedido #${pedido.num}?`)) return;

  const atualizado = {
    ...pedido,
    venda_fechada: true,
    venda_fechada_em: new Date().toISOString(),
    venda_fechada_por: String(State.user?.email || State.user?.id || '').trim() || null
  };

  try {
    await SB.upsertPedido({
      ...atualizado,
      itens: JSON.stringify(Array.isArray(atualizado.itens) ? atualizado.itens : [])
    });
  } catch (error) {
    notify(
      `Erro ao fechar venda: ${String(error instanceof Error ? error.message : 'erro desconhecido')}.`,
      SEVERITY.ERROR
    );
    return;
  }

  if (!D.pedidos[State.FIL]) D.pedidos[State.FIL] = [];
  D.pedidos[State.FIL] = D.pedidos[State.FIL].map((item) =>
    item.id === pedidoId ? atualizado : item
  );
  invalidatePdCache();
  renderPedMet();
  renderPedidos();
  toast(`Venda do pedido #${pedido.num} fechada com sucesso.`);
  await abrirCliDet(clienteId);
  switchCliDetTab(clienteId, 'fechadas');
}

export async function addNota(id) {
  const { input } = getDetailElements(id);
  const texto = input?.value.trim() || '';
  if (!texto) return;

  const nota = {
    cliente_id: id,
    texto,
    data: new Date().toLocaleString('pt-BR')
  };

  try {
    await SB.insertNota(nota);
  } catch (error) {
    toast(`Erro: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    return;
  }

  if (!D.notas) D.notas = {};
  if (!Array.isArray(D.notas[id])) D.notas[id] = [];
  D.notas[id].unshift(nota);

  if (input) input.value = '';
  renderNotasCliente(id);
  toast('Nota adicionada!');
}

export function limparFormCli() {
  State.editIds.cli = null;
  refreshRcaSelectors();

  cliDom.text('modal', 'cli-modal-titulo', 'Novo cliente', 'clientes:modal-titulo');
  cliDom.text('modal', 'cli-flow-save', 'Salvar cliente', 'clientes:modal-acao');

  CLI_FORM_IDS.forEach((id) => cliDom.value(id, ''));
  Object.entries(CLI_SELECT_DEFAULTS).forEach(([id, value]) => cliDom.value(id, value));
  CLI_CHECKBOX_IDS.forEach((id) => cliDom.checked(id, false));

  setFlowStepSafe('cli', 1);
}

export function editarCli(id) {
  const cliente = C().find((item) => item.id === id);
  if (!cliente) return;

  State.editIds.cli = id;
  refreshRcaSelectors();

  cliDom.text('modal', 'cli-modal-titulo', 'Editar cliente', 'clientes:modal-titulo');
  cliDom.text('modal', 'cli-flow-save', 'Atualizar cliente', 'clientes:modal-acao');

  cliDom.value('c-nome', cliente.nome || '');
  cliDom.value('c-apelido', cliente.apelido || '');
  cliDom.value('c-doc', cliente.doc || '');
  cliDom.value('c-tipo', cliente.tipo || 'PJ');
  cliDom.value('c-status', cliente.status || 'ativo');
  cliDom.value('c-tel', cliente.tel || '');
  cliDom.value('c-whatsapp', cliente.whatsapp || '');
  cliDom.value('c-email', cliente.email || '');
  cliDom.value('c-aniv', cliente.data_aniversario || '');
  cliDom.value('c-time', parseTimes(cliente.time).join(', '));
  cliDom.value('c-resp', cliente.resp || '');
  cliDom.value('c-rca', cliente.rca_id || '');
  cliDom.value('c-seg', cliente.seg || '');
  cliDom.value('c-tab', cliente.tab || 'padrao');
  cliDom.value('c-prazo', cliente.prazo || 'a_vista');
  cliDom.value('c-cidade', cliente.cidade || '');
  cliDom.value('c-estado', cliente.estado || '');
  cliDom.value('c-obs', cliente.obs || '');
  cliDom.checked('c-optin-marketing', !!cliente.optin_marketing);
  cliDom.checked('c-optin-email', !!cliente.optin_email);
  cliDom.checked('c-optin-sms', !!cliente.optin_sms);

  setFlowStepSafe('cli', 1);
  abrirModal('modal-cliente');
}

export async function salvarCliente() {
  const nome = cliDom.get('c-nome')?.value.trim() || '';
  if (!nome) {
    notify(MSG.forms.required('Nome do cliente'), SEVERITY.WARNING);
    focusField('c-nome', { markError: true });
    return;
  }

  const editId = State.editIds.cli;
  const rcaId = String(cliDom.get('c-rca')?.value || '').trim();
  const rcaNome = rcaId ? getRcaNomeById(rcaId) : '';
  const cliente = {
    id: editId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    filial_id: State.FIL,
    nome,
    rca_id: rcaId || null,
    rca_nome: rcaNome || null,
    apelido: cliDom.get('c-apelido')?.value.trim() || '',
    doc: cliDom.get('c-doc')?.value.trim() || '',
    tipo: cliDom.get('c-tipo')?.value || 'PJ',
    status: cliDom.get('c-status')?.value || 'ativo',
    tel: cliDom.get('c-tel')?.value.trim() || '',
    whatsapp: cliDom.get('c-whatsapp')?.value.trim() || '',
    email: cliDom.get('c-email')?.value.trim() || '',
    data_aniversario: cliDom.get('c-aniv')?.value || null,
    optin_marketing: !!cliDom.get('c-optin-marketing')?.checked,
    optin_email: !!cliDom.get('c-optin-email')?.checked,
    optin_sms: !!cliDom.get('c-optin-sms')?.checked,
    time: parseTimes(cliDom.get('c-time')?.value || '').join(', '),
    resp: cliDom.get('c-resp')?.value.trim() || '',
    seg: cliDom.get('c-seg')?.value.trim() || '',
    tab: cliDom.get('c-tab')?.value || 'padrao',
    prazo: cliDom.get('c-prazo')?.value || 'a_vista',
    cidade: cliDom.get('c-cidade')?.value.trim() || '',
    estado: cliDom.get('c-estado')?.value.trim() || '',
    obs: cliDom.get('c-obs')?.value.trim() || ''
  };

  const clienteDuplicado = findClienteDuplicadoIdentidade({
    doc: cliente.doc,
    email: cliente.email,
    tel: cliente.tel,
    whatsapp: cliente.whatsapp,
    editId
  });

  if (clienteDuplicado) {
    notifyGuided({
      severity: SEVERITY.WARNING,
      what: `${clienteDuplicado.label} ja cadastrado para ${clienteDuplicado.cliente.nome}`,
      impact: 'o cliente nao foi salvo para evitar duplicidade no cadastro',
      next: `revise o campo ${clienteDuplicado.label} ou edite o cadastro existente`
    });
    focusField(clienteDuplicado.fieldId, { markError: true });
    return;
  }

  try {
    await SB.upsertCliente(cliente);
  } catch (error) {
    if (handleClienteDuplicadoError(error, clienteDuplicado)) {
      return;
    }
    notify(
      `Erro ao salvar cliente: ${String(error instanceof Error ? error.message : 'erro desconhecido')}.`,
      SEVERITY.ERROR
    );
    return;
  }

  if (!D.clientes[State.FIL]) D.clientes[State.FIL] = [];

  if (editId) {
    D.clientes[State.FIL] = C().map((item) => (item.id === editId ? cliente : item));
  } else {
    D.clientes[State.FIL].push(cliente);
  }

  fecharModal('modal-cliente');
  renderCliMet();
  renderClientes();
  renderCliSegs();
  refreshCliDL();

  const canais = [
    cliente.whatsapp ? 'WhatsApp' : '',
    cliente.tel ? 'Telefone' : '',
    cliente.email ? 'E-mail' : ''
  ].filter(Boolean);
  const prontoCampanha = cliente.optin_marketing && canais.length > 0;

  notify(
    editId
      ? `Cliente atualizado: ${cliente.nome} - Canais: ${canais.join(', ') || 'nenhum'} - Campanhas: ${prontoCampanha ? 'pronto' : 'parcial'}`
      : `Cliente cadastrado: ${cliente.nome} - Canais: ${canais.join(', ') || 'nenhum'} - Campanhas: ${prontoCampanha ? 'pronto' : 'parcial'}`,
    SEVERITY.SUCCESS
  );
}

export async function removerCli(id) {
  if (!confirm('Remover cliente?')) return;

  try {
    await SB.deleteCliente(id);
  } catch (error) {
    toast(`Erro: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    return;
  }

  D.clientes[State.FIL] = C().filter((cliente) => cliente.id !== id);

  renderCliMet();
  renderClientes();
  renderCliSegs();
  refreshCliDL();

  toast('Cliente removido.');
}

export function refreshCliDL() {
  syncClientesReactBridge();
  if (!shouldRenderLegacyClientes()) return;

  cliDom.html(
    'selectors',
    'cli-dl',
    C()
      .map((cliente) => `<option value="${esc(cliente.nome)}">`)
      .join(''),
    'clientes:datalist'
  );
}
