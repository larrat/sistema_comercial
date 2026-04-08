// @ts-check

import { SB } from '../app/api.js';
import { D, State, C } from '../app/store.js';
import { createScreenDom } from '../shared/dom.js';
import { abrirModal, fecharModal, toast, notify, focusField } from '../shared/utils.js';
import { MSG, SEVERITY } from '../shared/messages.js';

/** @typedef {import('../types/domain').Cliente} Cliente */
/** @typedef {import('../types/domain').ClientesModuleCallbacks} ClientesModuleCallbacks */
/** @typedef {import('../types/domain').ScreenDom} ScreenDom */

/** @type {NonNullable<ClientesModuleCallbacks['setFlowStep']>} */
let setFlowStepSafe = () => {};

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
  'cli-det-box'
]);

const CLI_FORM_IDS = [
  'c-nome', 'c-apelido', 'c-doc', 'c-tel', 'c-whatsapp', 'c-email', 'c-aniv',
  'c-time', 'c-resp', 'c-seg', 'c-cidade', 'c-estado', 'c-obs'
];

const CLI_SELECT_DEFAULTS = {
  'c-tipo': 'PJ',
  'c-status': 'ativo',
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
export function initClientesModule(callbacks = {}){
  setFlowStepSafe = callbacks.setFlowStep || (() => {});
}

/**
 * @param {unknown} value
 */
function esc(value){
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
function avc(nome){
  const value = String(nome || 'X');
  return AVC[value.charCodeAt(0) % AVC.length];
}

/**
 * @param {unknown} nome
 */
function ini(nome){
  const parts = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return 'CL';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/**
 * @param {string | null | undefined} iso
 */
function fmtAniv(iso){
  if(!iso) return '';
  const [year, month, day] = String(iso).split('-');
  if(!year || !month || !day) return iso;
  return `${day}/${month}`;
}

/**
 * @param {string | null | undefined} iso
 */
function getDiasParaAniversario(iso){
  if(!iso) return null;

  const [, month, day] = String(iso).split('-').map(Number);
  if(!month || !day) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let alvo = new Date(hoje.getFullYear(), month - 1, day);
  alvo.setHours(0, 0, 0, 0);

  if(alvo < hoje){
    alvo = new Date(hoje.getFullYear() + 1, month - 1, day);
    alvo.setHours(0, 0, 0, 0);
  }

  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/**
 * @param {Cliente | null | undefined} cliente
 */
function getBadgeAniversario(cliente){
  if(!cliente?.data_aniversario) return '';

  const dias = getDiasParaAniversario(cliente.data_aniversario);
  if(dias == null){
    return `<span class="bdg bb">Aniv ${esc(fmtAniv(cliente.data_aniversario))}</span>`;
  }
  if(dias === 0){
    return '<span class="bdg br">Aniv hoje</span>';
  }
  if(dias <= 7){
    return `<span class="bdg ba">Aniv ${dias}d</span>`;
  }
  return `<span class="bdg bb">Aniv ${esc(fmtAniv(cliente.data_aniversario))}</span>`;
}

/**
 * @param {Cliente | null | undefined} cliente
 */
function getContatoInfo(cliente){
  const whatsapp = String(cliente?.whatsapp || '').trim();
  const tel = String(cliente?.tel || '').trim();
  const email = String(cliente?.email || '').trim();

  if(whatsapp){
    return {
      principal: `WhatsApp: ${whatsapp}`,
      secundario: tel && tel !== whatsapp ? `Telefone: ${tel}` : '',
      badge: '<span class="bdg bg">WhatsApp</span>'
    };
  }

  if(tel){
    return {
      principal: `Telefone: ${tel}`,
      secundario: email,
      badge: '<span class="bdg ba">Telefone</span>'
    };
  }

  if(email){
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
function normTxt(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * @param {string | string[] | null | undefined} value
 */
function parseTimes(value){
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(/[,;\n]+/);

  const seen = new Set();
  const out = [];

  raw.forEach(item => {
    const nome = String(item || '').trim();
    if(!nome) return;
    const key = normTxt(nome);
    if(seen.has(key)) return;
    seen.add(key);
    out.push(nome);
  });

  return out;
}

/**
 * @param {unknown} value
 */
function normalizePhone(value){
  return String(value || '').replace(/\D+/g, '');
}

function findClienteDuplicadoPorTelefone({ tel = '', whatsapp = '', editId = null } = {}){
  const numerosInformados = [normalizePhone(tel), normalizePhone(whatsapp)].filter(Boolean);
  if(!numerosInformados.length) return null;

  return C().find(cliente => {
    if(!cliente || cliente.id === editId) return false;
    const numerosCliente = [
      normalizePhone(cliente.tel),
      normalizePhone(cliente.whatsapp)
    ].filter(Boolean);
    return numerosInformados.some(numero => numerosCliente.includes(numero));
  }) || null;
}

function getFilteredClientes(){
  const q = normTxt(cliDom.get('cli-busca')?.value || '');
  const seg = cliDom.get('cli-fil-seg')?.value || '';
  const status = cliDom.get('cli-fil-st')?.value || '';

  return C().filter(cliente => {
    const termos = [
      cliente.nome,
      cliente.apelido,
      cliente.seg,
      cliente.resp,
      cliente.email,
      cliente.tel,
      cliente.whatsapp,
      parseTimes(cliente.time).join(' ')
    ].map(normTxt).join(' ');

    return (!q || termos.includes(q))
      && (!seg || cliente.seg === seg)
      && (!status || cliente.status === status);
  });
}

function renderEstadoVazio(){
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

function renderTagsCliente(cliente, contato, times){
  return [
    getBadgeAniversario(cliente),
    contato.badge,
    cliente.optin_marketing ? '<span class="bdg bg">MKT</span>' : '',
    cliente.optin_email ? '<span class="bdg bk">E-mail</span>' : '',
    cliente.optin_sms ? '<span class="bdg bk">SMS</span>' : '',
    cliente.seg ? `<span class="bdg bk">${esc(cliente.seg)}</span>` : '',
    ...times.map(time => `<span class="bdg bb">${esc(time)}</span>`)
  ].filter(Boolean).join('');
}

function renderClienteMobile(cliente){
  const cor = avc(cliente.nome);
  const contato = getContatoInfo(cliente);
  const times = parseTimes(cliente.time);
  const tabela = TAB_LABELS[cliente.tab] || '-';
  const prazo = PRAZO_LABELS[cliente.prazo] || '-';

  return `
    <div class="card mobile-card">
      <div class="mobile-card-head">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <div class="av" style="background:${cor.bg};color:${cor.c}">${esc(ini(cliente.nome))}</div>
          <div style="min-width:0">
            <div class="mobile-card-title">${esc(cliente.nome)}</div>
            ${cliente.apelido ? `<div class="mobile-card-sub">${esc(cliente.apelido)}</div>` : ''}
          </div>
        </div>
        <div>${ST_B[cliente.status] || ''}</div>
      </div>

      <div class="mobile-card-meta" style="margin-bottom:8px">
        <div>${esc(contato.principal)}</div>
        ${contato.secundario ? `<div>${esc(contato.secundario)}</div>` : ''}
        ${cliente.email && !contato.principal.includes(cliente.email) ? `<div>${esc(cliente.email)}</div>` : ''}
        <div>${tabela} - ${esc(prazo)}</div>
      </div>

      <div class="mobile-card-tags" style="gap:4px">
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

function renderClienteDesktop(cliente){
  const cor = avc(cliente.nome);
  const contato = getContatoInfo(cliente);
  const times = parseTimes(cliente.time);

  return `
    <tr>
      <td><div class="av" style="background:${cor.bg};color:${cor.c}">${esc(ini(cliente.nome))}</div></td>
      <td>
        <div style="font-weight:600">${esc(cliente.nome)}</div>
        ${cliente.apelido ? `<div style="font-size:11px;color:var(--tx3)">${esc(cliente.apelido)}</div>` : ''}
      </td>
      <td>
        <div>${esc(contato.principal)}</div>
        ${contato.secundario ? `<div style="font-size:11px;color:var(--tx3)">${esc(contato.secundario)}</div>` : ''}
        ${cliente.email && !contato.principal.includes(cliente.email) ? `<div style="font-size:11px;color:var(--tx3)">${esc(cliente.email)}</div>` : ''}
      </td>
      <td>
        <div class="fg2" style="gap:4px">
          ${getBadgeAniversario(cliente) || '<span style="color:var(--tx3)">-</span>'}
          ${contato.badge}
          ${cliente.optin_marketing ? '<span class="bdg bg">MKT</span>' : ''}
          ${cliente.optin_email ? '<span class="bdg bk">E-mail</span>' : ''}
          ${cliente.optin_sms ? '<span class="bdg bk">SMS</span>' : ''}
        </div>
      </td>
      <td>
        <div class="fg2" style="gap:4px">
          ${cliente.seg ? `<span class="bdg bk">${esc(cliente.seg)}</span>` : ''}
          ${times.map(time => `<span class="bdg bb">${esc(time)}</span>`).join('')}
          ${!cliente.seg && !times.length ? '-' : ''}
        </div>
      </td>
      <td>${TAB_LABELS[cliente.tab] || '-'}</td>
      <td style="color:var(--tx2)">${esc(PRAZO_LABELS[cliente.prazo] || '-')}</td>
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

function renderNotasHtml(notas){
  if(!notas.length){
    return '<div style="font-size:13px;color:var(--tx3)">Nenhuma nota.</div>';
  }

  return notas.map(nota => `
    <div class="nota">
      <div>${esc(nota.texto)}</div>
      <div class="nota-d">${esc(nota.data)}</div>
    </div>
  `).join('');
}

function getDetailElements(id){
  return {
    input: document.getElementById(`nota-inp-${id}`),
    list: document.getElementById(`notas-${id}`)
  };
}

function syncNotasCache(id, notas){
  if(!D.notas) D.notas = {};
  D.notas[id] = Array.isArray(notas) ? [...notas] : [];
}

function renderNotasCliente(id){
  const { list } = getDetailElements(id);
  if(!list) return;
  list.innerHTML = renderNotasHtml(D.notas?.[id] || []);
}

export function renderCliMet(){
  const clientes = C();
  const ativos = clientes.filter(cliente => cliente.status === 'ativo').length;
  const prospectos = clientes.filter(cliente => cliente.status === 'prospecto').length;
  const segmentos = [...new Set(clientes.map(cliente => cliente.seg).filter(Boolean))].length;
  const currentSeg = cliDom.get('cli-fil-seg')?.value || '';

  cliDom.html('metrics', 'cli-met', `
    <div class="met"><div class="ml">Total</div><div class="mv">${clientes.length}</div></div>
    <div class="met"><div class="ml">Ativos</div><div class="mv">${ativos}</div></div>
    <div class="met"><div class="ml">Prospectos</div><div class="mv">${prospectos}</div></div>
    <div class="met"><div class="ml">Segmentos</div><div class="mv">${segmentos}</div></div>
  `, 'clientes:metrics');

  cliDom.select(
    'filters',
    'cli-fil-seg',
    '<option value="">Todos os segmentos</option>' +
      [...new Set(clientes.map(cliente => cliente.seg).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map(seg => `<option value="${esc(seg)}">${esc(seg)}</option>`)
        .join(''),
    currentSeg,
    'clientes:segmentos'
  );
}

export function renderClientes(){
  const filtrados = getFilteredClientes();
  if(!filtrados.length){
    renderEstadoVazio();
    return;
  }

  if(window.matchMedia('(max-width: 1280px)').matches){
    cliDom.html(
      'list',
      'cli-lista',
      filtrados.map(renderClienteMobile).join(''),
      'clientes:lista-mobile'
    );
    return;
  }

  cliDom.html('list', 'cli-lista', `
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
  `, 'clientes:lista-desktop');
}

export function renderCliSegs(){
  const el = cliDom.get('cli-segs-lista');
  if(!el) return;

  const segmentos = [...new Set(C().map(cliente => cliente.seg || 'Sem segmento'))]
    .sort((a, b) => a.localeCompare(b));

  cliDom.html('segments', 'cli-segs-lista', segmentos.map(seg => {
    const clientes = C().filter(cliente => (cliente.seg || 'Sem segmento') === seg);

    return `
      <div class="card">
        <div class="fb" style="margin-bottom:10px">
          <div style="font-weight:600">${esc(seg)}</div>
          <span class="bdg bb">${clientes.length}</span>
        </div>
        <div class="fg2">
          ${clientes.map(cliente => {
            const cor = avc(cliente.nome);
            return `
              <button
                class="btn"
                type="button"
                data-click="abrirCliDet('${cliente.id}')"
                style="display:flex;align-items:center;gap:8px;padding:7px 10px"
              >
                <div class="av" style="width:26px;height:26px;font-size:11px;background:${cor.bg};color:${cor.c}">
                  ${esc(ini(cliente.nome))}
                </div>
                <span style="font-size:13px;font-weight:500">${esc(cliente.apelido || cliente.nome)}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join(''), 'clientes:segmentos-lista');
}

export async function abrirCliDet(id){
  const cliente = C().find(item => item.id === id);
  if(!cliente) return;

  const cor = avc(cliente.nome);
  let notas = [];

  try{
    notas = await SB.getNotas(id) || [];
  }catch(error){
    console.error('Erro ao carregar notas do cliente', error);
  }

  syncNotasCache(id, notas);

  const times = parseTimes(cliente.time);
  const contato = [
    cliente.resp ? `Resp: ${cliente.resp}` : '',
    cliente.tel || '',
    cliente.whatsapp ? `WhatsApp: ${cliente.whatsapp}` : '',
    cliente.email || '',
    cliente.data_aniversario ? `Aniversario: ${fmtAniv(cliente.data_aniversario)}` : '',
    cliente.cidade ? `${cliente.cidade}${cliente.estado ? ` - ${cliente.estado}` : ''}` : ''
  ].filter(Boolean);

  cliDom.html('detail', 'cli-det-box', `
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
        ${contato.length ? contato.map(item => `<div style="margin-bottom:3px">${esc(item)}</div>`).join('') : '-'}
        </div>

        <div class="cli-detail-panel">
          <div class="cli-detail-label">Comercial</div>
          <div>Tabela: ${TAB_LABELS[cliente.tab] || '-'}</div>
          <div>Prazo: ${esc(PRAZO_DETALHE_LABELS[cliente.prazo] || '-')}</div>
        ${times.length ? `<div>Times: ${esc(times.join(', '))}</div>` : ''}
        ${cliente.seg ? `<div>Segmento: ${esc(cliente.seg)}</div>` : ''}
        </div>
      </div>

    ${cliente.obs ? `
        <div class="panel cli-detail-section">
        <div class="pt">Observacoes</div>
          <p style="font-size:13px">${esc(cliente.obs)}</p>
      </div>
    ` : ''}

      <div class="cli-detail-label" style="margin-bottom:8px">Notas / historico</div>
      <div class="fg2 cli-detail-notes-input" style="margin-bottom:8px">
      <input class="inp" id="nota-inp-${id}" placeholder="Adicionar nota..." style="flex:1">
      <button class="btn btn-sm" data-click="addNota('${id}')">+</button>
    </div>

      <div class="cli-detail-notes" id="notas-${id}">${renderNotasHtml(D.notas?.[id] || [])}</div>

      <div class="cli-detail-actions">
      <button class="btn" data-click="fecharModal('modal-cli-det')">Fechar</button>
      <button class="btn btn-p" data-click="fecharModal('modal-cli-det');editarCli('${id}')">Editar</button>
      </div>
    </div>
  `, 'clientes:detalhe');

  abrirModal('modal-cli-det');
}

export async function addNota(id){
  const { input } = getDetailElements(id);
  const texto = input?.value.trim() || '';
  if(!texto) return;

  const nota = {
    cliente_id: id,
    texto,
    data: new Date().toLocaleString('pt-BR')
  };

  try{
    await SB.insertNota(nota);
  }catch(error){
    toast(`Erro: ${error.message}`);
    return;
  }

  if(!D.notas) D.notas = {};
  if(!Array.isArray(D.notas[id])) D.notas[id] = [];
  D.notas[id].unshift(nota);

  if(input) input.value = '';
  renderNotasCliente(id);
  toast('Nota adicionada!');
}

export function limparFormCli(){
  State.editIds.cli = null;

  cliDom.text('modal', 'cli-modal-titulo', 'Novo cliente', 'clientes:modal-titulo');
  cliDom.text('modal', 'cli-flow-save', 'Salvar cliente', 'clientes:modal-acao');

  CLI_FORM_IDS.forEach(id => cliDom.value(id, ''));
  Object.entries(CLI_SELECT_DEFAULTS).forEach(([id, value]) => cliDom.value(id, value));
  CLI_CHECKBOX_IDS.forEach(id => cliDom.checked(id, false));

  setFlowStepSafe('cli', 1);
}

export function editarCli(id){
  const cliente = C().find(item => item.id === id);
  if(!cliente) return;

  State.editIds.cli = id;

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

export async function salvarCliente(){
  const nome = cliDom.get('c-nome')?.value.trim() || '';
  if(!nome){
    notify(MSG.forms.required('Nome do cliente'), SEVERITY.WARNING);
    focusField('c-nome', { markError: true });
    return;
  }

  const editId = State.editIds.cli;
  const cliente = {
    id: editId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    filial_id: State.FIL,
    nome,
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

  const clienteDuplicado = findClienteDuplicadoPorTelefone({
    tel: cliente.tel,
    whatsapp: cliente.whatsapp,
    editId
  });

  if(clienteDuplicado){
    const numeroDuplicado = cliente.tel && normalizePhone(cliente.tel) === normalizePhone(clienteDuplicado.tel || clienteDuplicado.whatsapp)
      ? cliente.tel
      : (cliente.whatsapp || cliente.tel || clienteDuplicado.whatsapp || clienteDuplicado.tel || '');
    notify(
      `Atenção: telefone/WhatsApp já cadastrado para ${clienteDuplicado.nome}. Impacto: o cliente não foi salvo. Ação: revise o número ${numeroDuplicado || 'informado'} ou edite o cadastro existente.`,
      SEVERITY.WARNING
    );
    focusField(cliente.whatsapp ? 'c-whatsapp' : 'c-tel', { markError: true });
    return;
  }

  try{
    await SB.upsertCliente(cliente);
  }catch(error){
    notify(
      `Erro ao salvar cliente: ${String(error?.message || 'erro desconhecido')}.`,
      SEVERITY.ERROR
    );
    return;
  }

  if(!D.clientes[State.FIL]) D.clientes[State.FIL] = [];

  if(editId){
    D.clientes[State.FIL] = C().map(item => item.id === editId ? cliente : item);
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

export async function removerCli(id){
  if(!confirm('Remover cliente?')) return;

  try{
    await SB.deleteCliente(id);
  }catch(error){
    toast(`Erro: ${error.message}`);
    return;
  }

  D.clientes[State.FIL] = C().filter(cliente => cliente.id !== id);

  renderCliMet();
  renderClientes();
  renderCliSegs();
  refreshCliDL();

  toast('Cliente removido.');
}

export function refreshCliDL(){
  cliDom.html(
    'selectors',
    'cli-dl',
    C().map(cliente => `<option value="${esc(cliente.nome)}">`).join(''),
    'clientes:datalist'
  );
}

