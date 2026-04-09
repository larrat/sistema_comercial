// @ts-check

import { SB } from '../app/api.js';
import { D, State } from '../app/store.js';
import { uid, toast, abrirModal, fecharModal, markFieldState, focusField } from '../shared/utils.js';

/** @typedef {import('../types/domain').FiliaisAcessosModuleDeps} FiliaisAcessosModuleDeps */
/** @typedef {import('../types/domain').AccessAdminReadData} AccessAdminReadData */
/** @typedef {import('../types/domain').AccessAdminUser} AccessAdminUser */
/** @typedef {import('../types/domain').AccessAdminInviteData} AccessAdminInviteData */

/** @type {(allowedRoles?: string[], denyMessage?: string) => boolean} */
let requireRoleSafe = () => true;
/** @type {() => Promise<void>} */
let renderSetupSafe = async () => {};
/** @type {() => Promise<void>} */
let entrarSafe = async () => {};
/** @type {() => void} */
let renderDashFilSelSafe = () => {};
/** @type {() => void} */
let scheduleRoleUiGuardsSafe = () => {};
/** @type {string[]} */
let roleAdminOnlySafe = ['admin'];
/** @type {string[]} */
let appRolesSafe = ['operador', 'gerente', 'admin'];
/** @type {string[]} */
let coresSafe = ['#163F80'];

/** @param {FiliaisAcessosModuleDeps} [deps={}] */
export function initFiliaisAcessosModule(deps = {}){
  requireRoleSafe = typeof deps.requireRole === 'function' ? deps.requireRole : requireRoleSafe;
  renderSetupSafe = typeof deps.renderSetup === 'function' ? deps.renderSetup : renderSetupSafe;
  entrarSafe = typeof deps.entrar === 'function' ? deps.entrar : entrarSafe;
  renderDashFilSelSafe = typeof deps.renderDashFilSel === 'function' ? deps.renderDashFilSel : renderDashFilSelSafe;
  scheduleRoleUiGuardsSafe = typeof deps.scheduleRoleUiGuards === 'function' ? deps.scheduleRoleUiGuards : scheduleRoleUiGuardsSafe;
  roleAdminOnlySafe = Array.isArray(deps.roleAdminOnly) ? deps.roleAdminOnly : roleAdminOnlySafe;
  appRolesSafe = Array.isArray(deps.appRoles) ? deps.appRoles : appRolesSafe;
  coresSafe = Array.isArray(deps.cores) && deps.cores.length ? deps.cores : coresSafe;
}

/** @param {unknown} v */
function isUuid(v){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || '').trim());
}

/** @param {unknown} v */
function normalizeEmail(v){
  return String(v || '').trim().toLowerCase();
}

/** @param {unknown} v */
function isEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(v));
}

/**
 * @param {string} inputId
 * @param {string} hintId
 * @param {string} message
 * @param {'error'|'success'|''} [state='']
 */
function setAccessFieldHelp(inputId, hintId, message, state = ''){
  const hintEl = document.getElementById(hintId);
  if(hintEl) hintEl.textContent = message || '';
  if(state){
    markFieldState(inputId, state);
    return;
  }
  const inputEl = document.getElementById(inputId);
  if(inputEl) inputEl.classList.remove('is-error', 'is-success');
}

/**
 * @param {AccessAdminUser | null | undefined} user
 */
function cacheAccessUser(user){
  if(!user?.user_id) return;
  if(!Array.isArray(D.accessUsers)) D.accessUsers = [];
  const email = normalizeEmail(user.email || '');
  const nome = String(user.nome || '').trim();
  const next = { ...user, email, nome };
  const idx = D.accessUsers.findIndex(
    item => item.user_id === next.user_id || (!!email && normalizeEmail(item.email || '') === email)
  );
  if(idx >= 0) D.accessUsers[idx] = { ...D.accessUsers[idx], ...next };
  else D.accessUsers.unshift(next);
}

/**
 * @param {string} ref
 * @returns {AccessAdminUser | null}
 */
function findAccessUserByRef(ref){
  const raw = String(ref || '').trim();
  if(!raw) return null;
  if(!Array.isArray(D.accessUsers)) return null;
  if(isUuid(raw)) return D.accessUsers.find(item => item.user_id === raw) || null;
  const email = normalizeEmail(raw);
  if(!isEmail(email)) return null;
  return D.accessUsers.find(item => normalizeEmail(item.email || '') === email) || null;
}

/**
 * @param {AccessAdminUser | null | undefined} user
 */
function getAccessUserLabel(user){
  if(!user) return '-';
  const nome = String(user.nome || '').trim();
  const email = normalizeEmail(user.email || '');
  if(nome && email) return `${nome} <${email}>`;
  return nome || email || '-';
}

/**
 * @param {string} ref
 * @param {{ inputId: string, hintId: string, silent?: boolean }} options
 * @returns {Promise<AccessAdminUser | { user_id: string, email?: string | null } | null>}
 */
async function resolveAccessUserRef(ref, { inputId, hintId, silent = false }){
  const raw = String(ref || '').trim();

  if(!raw){
    setAccessFieldHelp(inputId, hintId, 'Digite o e-mail do usuário para resolver automaticamente.');
    return null;
  }

  if(isUuid(raw)){
    const cached = findAccessUserByRef(raw);
    setAccessFieldHelp(
      inputId,
      hintId,
      cached?.email ? `UUID informado. Usuário encontrado: ${cached.email}` : 'UUID informado manualmente.',
      'success'
    );
    return cached || { user_id: raw, email: cached?.email || null };
  }

  if(!isEmail(raw)){
    setAccessFieldHelp(inputId, hintId, 'Informe um e-mail válido ou UUID.', 'error');
    if(!silent) focusField(inputId, { markError: true });
    return null;
  }

  const cached = findAccessUserByRef(raw);
  if(cached){
    setAccessFieldHelp(inputId, hintId, `Usuário encontrado: ${cached.user_id}`, 'success');
    return cached;
  }

  const lookupResult = await SB.toResult(() => SB.lookupAccessUserByEmail(raw));
  if(!lookupResult.ok){
    setAccessFieldHelp(inputId, hintId, 'Não foi possível consultar o e-mail. Verifique se a função SQL de lookup foi aplicada.', 'error');
    if(!silent) toast('Erro ao consultar e-mail de usuário: ' + lookupResult.error.message);
    return null;
  }

  if(!lookupResult.data?.user_id){
    setAccessFieldHelp(inputId, hintId, 'Nenhum usuário do Auth foi encontrado com esse e-mail.', 'error');
    if(!silent) focusField(inputId, { markError: true });
    return null;
  }

  cacheAccessUser(lookupResult.data);
  setAccessFieldHelp(inputId, hintId, `Usuário encontrado: ${lookupResult.data.user_id}`, 'success');
  return lookupResult.data;
}

/**
 * @template T
 * @param {T[]} [items=[]]
 * @param {number} [page=1]
 * @param {number} [perPage=10]
 */
function paginateItems(items = [], page = 1, perPage = 10){
  const safePage = Math.max(1, Number(page || 1));
  const safePerPage = Math.max(1, Number(perPage || 10));
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / safePerPage));
  const clamped = Math.min(safePage, pages);
  const start = (clamped - 1) * safePerPage;
  return {
    page: clamped,
    pages,
    total,
    perPage: safePerPage,
    slice: items.slice(start, start + safePerPage)
  };
}

/**
 * @param {string} elId
 * @param {number} page
 * @param {number} pages
 * @param {string} onPrev
 * @param {string} onNext
 */
function renderPager(elId, page, pages, onPrev, onNext){
  const el = document.getElementById(elId);
  if(!el) return;
  if(pages <= 1){
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <button class="btn btn-sm" ${page <= 1 ? 'disabled' : ''} data-click="${onPrev}">Anterior</button>
    <span class="bdg bk">Página ${page} de ${pages}</span>
    <button class="btn btn-sm" ${page >= pages ? 'disabled' : ''} data-click="${onNext}">Próxima</button>
  `;
}

export function limparFormFilial(){
  State.editIds.filial = null;
  document.getElementById('filial-modal-titulo').textContent = 'Nova filial';
  ['fil-nome', 'fil-cidade', 'fil-estado', 'fil-end'].forEach(i => {
    const el = document.getElementById(i);
    if(el) el.value = '';
  });
  document.getElementById('fil-cor').value = coresSafe[D.filiais.length % coresSafe.length];
}

export function editarFilial(id){
  const f = D.filiais.find(x => x.id === id);
  if(!f) return;

  State.editIds.filial = id;
  document.getElementById('filial-modal-titulo').textContent = 'Editar filial';
  document.getElementById('fil-nome').value = f.nome;
  document.getElementById('fil-cidade').value = f.cidade || '';
  document.getElementById('fil-estado').value = f.estado || '';
  document.getElementById('fil-end').value = f.endereco || '';
  document.getElementById('fil-cor').value = f.cor;
  abrirModal('modal-filial');
}

export async function salvarFilial(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode salvar filial.')) return;
  const nome = document.getElementById('fil-nome')?.value.trim();
  if(!nome){
    toast('Informe o nome.');
    return;
  }

  const f = {
    id: State.editIds.filial || uid(),
    nome,
    cidade: document.getElementById('fil-cidade')?.value.trim() || '',
    estado: document.getElementById('fil-estado')?.value.trim() || '',
    endereco: document.getElementById('fil-end')?.value.trim() || '',
    cor: document.getElementById('fil-cor')?.value || coresSafe[0]
  };

  try{
    await SB.upsertFilial(f);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  fecharModal('modal-filial');
  await renderSetupSafe();
  renderFilLista();
  renderFilMet();
  renderDashFilSelSafe();

  toast(State.editIds.filial ? 'Filial atualizada!' : 'Filial criada!');
}

export async function removerFilial(id){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode remover filial.')) return;
  if(!confirm('Remover filial e dados?')) return;

  try{
    await SB.deleteFilial(id);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  D.filiais = D.filiais.filter(f => f.id !== id);
  renderFilLista();
  renderFilMet();
  await renderSetupSafe();
  renderDashFilSelSafe();
  toast('Filial removida.');
}

export function renderFilMet(){
  const el = document.getElementById('fil-met');
  if(!el) return;

  el.innerHTML = `
    <div class="met"><div class="ml">Filiais</div><div class="mv">${D.filiais.length}</div></div>
    <div class="met"><div class="ml">Total produtos</div><div class="mv">${Object.values(D.produtos).flat().length}</div></div>
    <div class="met"><div class="ml">Total pedidos</div><div class="mv">${Object.values(D.pedidos).flat().length}</div></div>
  `;
}

export function renderFilLista(){
  const el = document.getElementById('fil-lista');
  if(!el) return;

  if(!D.filiais.length){
    el.innerHTML = `<div class="empty"><div class="ico">🏢</div><p>Nenhuma filial cadastrada.</p></div>`;
    return;
  }

  el.innerHTML = D.filiais.map(f => {
    const prods = (D.produtos[f.id] || []).length;
    const clis = (D.clientes[f.id] || []).length;
    const peds = (D.pedidos[f.id] || []).length;
    const ativa = f.id === State.FIL;

    return `
      <div class="card fb filial-card${ativa ? ' filial-card--active' : ''}">
        <div class="filial-card__main">
          <div class="filial-card__dot" style="background:${f.cor}"></div>
          <div>
            <div class="filial-card__title">
              ${f.nome}${ativa ? ` <span class="bdg bb filial-card__badge">Ativa</span>` : ''}
            </div>
            <div class="filial-card__sub">${f.cidade || ''}${f.estado ? ' - ' + f.estado : ''}</div>
            <div class="filial-card__stats">
              <span class="bdg bk">${prods} produto(s)</span>
              <span class="bdg bk">${clis} cliente(s)</span>
              <span class="bdg bk">${peds} pedido(s)</span>
            </div>
          </div>
        </div>
        <div class="fg2">
          ${!ativa ? `<button class="btn btn-sm" data-click="trocarFilial('${f.id}')">Selecionar</button>` : ''}
          <button class="btn btn-sm" data-click="editarFilial('${f.id}')">Editar</button>
          <button class="btn btn-sm" data-click="removerFilial('${f.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

function preencherSelectFiliaisAcesso(){
  const opts = D.filiais || [];

  const vinculoEl = document.getElementById('ac-v-filial');
  if(vinculoEl){
    const current = vinculoEl.value || '';
    vinculoEl.innerHTML = opts.length
      ? opts.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')
      : '<option value="">Sem filiais</option>';
    if(current && opts.some(f => f.id === current)) vinculoEl.value = current;
  }

  const inviteEl = document.getElementById('ac-invite-filial');
  if(inviteEl){
    const current = inviteEl.value || '';
    inviteEl.innerHTML = `
      <option value="">Sem vincular agora</option>
      ${opts.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')}
    `;
    if(current && (current === '' || opts.some(f => f.id === current))) inviteEl.value = current;
    else if(State.FIL && opts.some(f => f.id === State.FIL)) inviteEl.value = State.FIL;
  }
}

export function renderAcessosMet(){
  const el = document.getElementById('ac-met');
  if(!el) return;
  const perfis = D.userPerfis || [];
  const vinculos = D.userFiliais || [];
  const dist = perfis.reduce((acc, p) => {
    const k = String(p.papel || 'operador');
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, { admin: 0, gerente: 0, operador: 0 });

  el.innerHTML = `
    <div class="met"><div class="ml">Perfis</div><div class="mv">${perfis.length}</div></div>
    <div class="met"><div class="ml">Vínculos</div><div class="mv">${vinculos.length}</div></div>
    <div class="met"><div class="ml">Admins</div><div class="mv">${dist.admin || 0}</div></div>
    <div class="met"><div class="ml">Gerentes</div><div class="mv">${dist.gerente || 0}</div></div>
  `;
}

export function renderAcessosPerfis(){
  const el = document.getElementById('ac-perfis-lista');
  if(!el) return;
  const q = String(document.getElementById('ac-busca')?.value || '').trim().toLowerCase();
  const papel = (document.getElementById('ac-fil-papel')?.value || 'todos').trim();
  const userMap = new Map((D.accessUsers || []).map(user => [user.user_id, user]));
  let items = D.userPerfis || [];
  if(q) items = items.filter(x => {
    const user = userMap.get(x.user_id);
    return String(x.user_id || '').toLowerCase().includes(q)
      || normalizeEmail(user?.email || '').includes(q)
      || String(user?.nome || '').trim().toLowerCase().includes(q);
  });
  if(papel !== 'todos') items = items.filter(x => String(x.papel) === papel);

  if(!items.length){
    el.innerHTML = `<div class="empty"><div class="ico">🔐</div><p>Nenhum perfil encontrado.</p></div>`;
    renderPager('ac-perfis-pager', 1, 1, '', '');
    return;
  }
  const p = paginateItems(items, State.acPagePerfis, 8);
  State.acPagePerfis = p.page;

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Usuário</th>
            <th>Papel</th>
            <th>Atualizado</th>
            <th class="table-align-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          ${p.slice.map(pf => `
            <tr>
              <td><code>${pf.user_id}</code></td>
              <td>
                <div class="table-cell-strong">${String(userMap.get(pf.user_id)?.nome || '').trim() || '-'}</div>
                <div class="table-cell-caption table-cell-muted">${userMap.get(pf.user_id)?.email || '-'}</div>
              </td>
              <td><span class="bdg ${pf.papel === 'admin' ? 'br' : pf.papel === 'gerente' ? 'ba' : 'bk'}">${pf.papel}</span></td>
              <td>${pf.atualizado_em ? new Date(pf.atualizado_em).toLocaleString('pt-BR') : '-'}</td>
              <td class="table-align-right">
                <button class="btn btn-sm" data-click="preencherPerfilAcesso('${pf.user_id}','${pf.papel}')">Editar</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  renderPager('ac-perfis-pager', p.page, p.pages, 'changeAcessosPage(\'perfis\',-1)', 'changeAcessosPage(\'perfis\',1)');
}

export function renderAcessosVinculos(){
  const el = document.getElementById('ac-vinculos-lista');
  if(!el) return;
  const perfMap = new Map((D.userPerfis || []).map(p => [p.user_id, p.papel]));
  const filMap = new Map((D.filiais || []).map(f => [f.id, f.nome]));
  const userMap = new Map((D.accessUsers || []).map(user => [user.user_id, user]));
  const filtroFilial = (document.getElementById('ac-fil-filial')?.value || 'todas').trim();
  let items = D.userFiliais || [];
  if(filtroFilial !== 'todas') items = items.filter(v => String(v.filial_id) === filtroFilial);

  if(!items.length){
    el.innerHTML = `<div class="empty"><div class="ico">🏷️</div><p>Nenhum vínculo cadastrado.</p></div>`;
    renderPager('ac-vinculos-pager', 1, 1, '', '');
    return;
  }
  const p = paginateItems(items, State.acPageVinculos, 8);
  State.acPageVinculos = p.page;

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Usuário</th>
            <th>Papel</th>
            <th>Filial</th>
            <th class="table-align-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          ${p.slice.map(v => `
            <tr>
              <td><code>${v.user_id}</code></td>
              <td>
                <div class="table-cell-strong">${String(userMap.get(v.user_id)?.nome || '').trim() || '-'}</div>
                <div class="table-cell-caption table-cell-muted">${userMap.get(v.user_id)?.email || '-'}</div>
              </td>
              <td><span class="bdg bk">${perfMap.get(v.user_id) || 'sem_perfil'}</span></td>
              <td>${filMap.get(v.filial_id) || v.filial_id}</td>
              <td class="table-align-right">
                <button class="btn btn-sm" data-click="preencherVinculoAcesso('${v.user_id}','${v.filial_id}')">Editar</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  renderPager('ac-vinculos-pager', p.page, p.pages, 'changeAcessosPage(\'vinculos\',-1)', 'changeAcessosPage(\'vinculos\',1)');
}

export function renderAcessosAuditoria(){
  const el = document.getElementById('ac-auditoria-lista');
  if(!el) return;
  const items = D.acessosAudit || [];
  if(!items.length){
    el.innerHTML = `<div class="empty"><div class="ico">🧾</div><p>Nenhum evento de auditoria disponível.</p></div>`;
    renderPager('ac-auditoria-pager', 1, 1, '', '');
    return;
  }
  const p = paginateItems(items, State.acPageAuditoria, 10);
  State.acPageAuditoria = p.page;
  const filMap = new Map((D.filiais || []).map(f => [f.id, f.nome]));

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Quando</th>
            <th>Ação</th>
            <th>Recurso</th>
            <th>Ator</th>
            <th>Alvo</th>
          </tr>
        </thead>
        <tbody>
          ${p.slice.map(a => `
            <tr>
              <td>${a.criado_em ? new Date(a.criado_em).toLocaleString('pt-BR') : '-'}</td>
              <td><span class="bdg ba">${a.acao || 'acao'}</span></td>
              <td>${a.recurso || '-'}</td>
              <td><code>${a.ator_user_id || '-'}</code></td>
              <td>
                <div><code>${a.alvo_user_id || '-'}</code></div>
                <div class="table-cell-caption table-cell-muted">${a.alvo_filial_id ? (filMap.get(a.alvo_filial_id) || a.alvo_filial_id) : '-'}</div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  renderPager('ac-auditoria-pager', p.page, p.pages, 'changeAcessosPage(\'auditoria\',-1)', 'changeAcessosPage(\'auditoria\',1)');
}

export function changeAcessosPage(tipo, delta){
  if(tipo === 'perfis'){
    State.acPagePerfis = Math.max(1, Number(State.acPagePerfis || 1) + Number(delta || 0));
    renderAcessosPerfis();
    return;
  }
  if(tipo === 'vinculos'){
    State.acPageVinculos = Math.max(1, Number(State.acPageVinculos || 1) + Number(delta || 0));
    renderAcessosVinculos();
    return;
  }
  State.acPageAuditoria = Math.max(1, Number(State.acPageAuditoria || 1) + Number(delta || 0));
  renderAcessosAuditoria();
}

function preencherFiltroFiliaisAcesso(){
  const el = document.getElementById('ac-fil-filial');
  if(!el) return;
  const current = el.value || 'todas';
  const opts = D.filiais || [];
  el.innerHTML = `
    <option value="todas">Todas filiais</option>
    ${opts.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')}
  `;
  if(current && (current === 'todas' || opts.some(f => f.id === current))) el.value = current;
}

/**
 * @param {string} inputId
 * @param {string} [focusId]
 */
function bringAccessEditorIntoView(inputId, focusId = inputId){
  const inputEl = document.getElementById(inputId);
  if(!(inputEl instanceof HTMLElement)) return;
  const cardEl = inputEl.closest('.card');
  if(cardEl instanceof HTMLElement){
    cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cardEl.classList.add('ring');
    window.setTimeout(() => cardEl.classList.remove('ring'), 1600);
  }else{
    inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  focusField(focusId, { markSuccess: true });
}

export function preencherPerfilAcesso(userId, papel){
  const userEl = document.getElementById('ac-user-id');
  const papelEl = document.getElementById('ac-papel');
  const email = findAccessUserByRef(userId)?.email || '';
  if(userEl) userEl.value = email || userId || '';
  if(papelEl) papelEl.value = papel || 'operador';
  if(userEl) resolveAccessUserRef(userEl.value, { inputId: 'ac-user-id', hintId: 'ac-user-id-help', silent: true });
  bringAccessEditorIntoView('ac-user-id', 'ac-papel');
  toast('Perfil carregado no formulário para edição.');
}

export function preencherVinculoAcesso(userId, filialId){
  const userEl = document.getElementById('ac-v-user-id');
  const filialEl = document.getElementById('ac-v-filial');
  const email = findAccessUserByRef(userId)?.email || '';
  if(userEl) userEl.value = email || userId || '';
  if(filialEl && filialId) filialEl.value = filialId;
  if(userEl) resolveAccessUserRef(userEl.value, { inputId: 'ac-v-user-id', hintId: 'ac-v-user-id-help', silent: true });
  bringAccessEditorIntoView('ac-v-user-id', filialId ? 'ac-v-filial' : 'ac-v-user-id');
  toast('Vínculo carregado no formulário para edição.');
}

export async function renderAcessosAdmin(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode acessar gestão de acessos.')) return;
  const perfisEl = document.getElementById('ac-perfis-lista');
  const vinculosEl = document.getElementById('ac-vinculos-lista');
  if(perfisEl) perfisEl.innerHTML = '<div class="sk-card"><span class="sk-line"></span><span class="sk-line"></span></div>';
  if(vinculosEl) vinculosEl.innerHTML = '<div class="sk-card"><span class="sk-line"></span><span class="sk-line"></span></div>';
  const audEl = document.getElementById('ac-auditoria-lista');
  if(audEl) audEl.innerHTML = '<div class="sk-card"><span class="sk-line"></span><span class="sk-line"></span></div>';

  const readResult = await SB.toResult(() => SB.getAcessosAdminReadEdge({
    auditoria_limit: 100
  }));

  if(!readResult.ok){
    toast('Erro ao carregar acessos: ' + (readResult.error?.message || 'falha inesperada'));
    console.error('Falha em renderAcessosAdmin', readResult.error);
    return;
  }

  /** @type {AccessAdminReadData} */
  const data = readResult.data || {
    ator_user_id: '',
    papel: 'admin',
    perfis: [],
    vinculos: [],
    filiais: [],
    auditoria: [],
    auditoria_limit: 100
  };
  D.userPerfis = data.perfis || [];
  D.userFiliais = data.vinculos || [];
  D.filiais = data.filiais || D.filiais || [];
  D.acessosAudit = data.auditoria || [];
  const usersResult = await SB.toResult(() => SB.getAcessosAdminUsersIndex());
  D.accessUsers = usersResult.ok ? (usersResult.data || []) : [];

  State.acPagePerfis = 1;
  State.acPageVinculos = 1;
  State.acPageAuditoria = 1;
  preencherSelectFiliaisAcesso();
  preencherFiltroFiliaisAcesso();
  renderAcessosMet();
  renderAcessosPerfis();
  renderAcessosVinculos();
  renderAcessosAuditoria();
  scheduleRoleUiGuardsSafe();
}

export async function resolverPerfilAcessoRef(){
  const ref = (document.getElementById('ac-user-id')?.value || '').trim();
  await resolveAccessUserRef(ref, { inputId: 'ac-user-id', hintId: 'ac-user-id-help', silent: true });
}

export async function resolverVinculoAcessoRef(){
  const ref = (document.getElementById('ac-v-user-id')?.value || '').trim();
  await resolveAccessUserRef(ref, { inputId: 'ac-v-user-id', hintId: 'ac-v-user-id-help', silent: true });
}

export async function resolverConviteAcessoEmail(){
  const ref = (document.getElementById('ac-invite-email')?.value || '').trim();
  const resolved = await resolveAccessUserRef(ref, {
    inputId: 'ac-invite-email',
    hintId: 'ac-invite-email-help',
    silent: true
  });
  const resolvedNome = resolved && typeof resolved === 'object' && 'nome' in resolved
    ? String(resolved.nome || '').trim()
    : '';
  if(!resolved?.user_id) return;
  const nomeEl = document.getElementById('ac-invite-nome');
  if(nomeEl && !String(nomeEl.value || '').trim() && resolvedNome){
    nomeEl.value = resolvedNome;
  }
}

export async function salvarPerfilAcesso(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode alterar perfil de acesso.')) return;
  const userRef = (document.getElementById('ac-user-id')?.value || '').trim();
  const papel = (document.getElementById('ac-papel')?.value || 'operador').trim();
  const resolvedUser = await resolveAccessUserRef(userRef, { inputId: 'ac-user-id', hintId: 'ac-user-id-help' });
  const userId = String(resolvedUser?.user_id || '').trim();
  if(!isUuid(userId)){
    toast('Informe um e-mail existente ou user_id valido.');
    return;
  }
  if(!appRolesSafe.includes(papel)){
    toast('Papel inválido.');
    return;
  }
  const saveResult = await SB.toResult(() => SB.upsertUserPerfilEdge({
    user_id: userId,
    papel,
    user_nome: resolvedUser?.nome || null,
    user_email: resolvedUser?.email || null,
    detalhes: { origem: 'ui_acessos', email: resolvedUser?.email || null }
  }));
  if(!saveResult.ok){
    toast('Erro ao salvar perfil: ' + saveResult.error.message);
    return;
  }
  toast('Perfil salvo com sucesso.');
  await renderAcessosAdmin();
}

export async function removerPerfilAcesso(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode remover perfil de acesso.')) return;
  const userRef = (document.getElementById('ac-user-id')?.value || '').trim();
  const resolvedUser = await resolveAccessUserRef(userRef, { inputId: 'ac-user-id', hintId: 'ac-user-id-help' });
  const userId = String(resolvedUser?.user_id || '').trim();
  if(!isUuid(userId)){
    toast('Informe um e-mail existente ou user_id valido.');
    return;
  }
  if(userId === State.user?.id){
    toast('Nao e permitido remover o proprio perfil.');
    return;
  }
  if(!confirm('Remover perfil deste usuario?')) return;
  const deleteResult = await SB.toResult(() => SB.deleteUserPerfilEdge(userId, {
    origem: 'ui_acessos',
    email: resolvedUser?.email || null
  }));
  if(!deleteResult.ok){
    toast('Erro ao remover perfil: ' + deleteResult.error.message);
    return;
  }
  toast('Perfil removido com sucesso.');
  await renderAcessosAdmin();
}

export async function vincularUsuarioFilial(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode vincular usuario a filial.')) return;
  const userRef = (document.getElementById('ac-v-user-id')?.value || '').trim();
  const filialId = (document.getElementById('ac-v-filial')?.value || '').trim();
  const resolvedUser = await resolveAccessUserRef(userRef, { inputId: 'ac-v-user-id', hintId: 'ac-v-user-id-help' });
  const userId = String(resolvedUser?.user_id || '').trim();
  if(!isUuid(userId)){
    toast('Informe um e-mail existente ou user_id valido.');
    return;
  }
  if(!filialId){
    toast('Selecione a filial.');
    return;
  }
  const saveResult = await SB.toResult(() => SB.upsertUserFilialEdge({
    user_id: userId,
    filial_id: filialId,
    user_nome: resolvedUser?.nome || null,
    user_email: resolvedUser?.email || null,
    detalhes: { origem: 'ui_acessos', email: resolvedUser?.email || null }
  }));
  if(!saveResult.ok){
    toast('Erro ao vincular usuario: ' + saveResult.error.message);
    return;
  }
  toast('Vinculo salvo com sucesso.');
  await renderAcessosAdmin();
}

export async function desvincularUsuarioFilial(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode desvincular usuario de filial.')) return;
  const userRef = (document.getElementById('ac-v-user-id')?.value || '').trim();
  const filialId = (document.getElementById('ac-v-filial')?.value || '').trim();
  const resolvedUser = await resolveAccessUserRef(userRef, { inputId: 'ac-v-user-id', hintId: 'ac-v-user-id-help' });
  const userId = String(resolvedUser?.user_id || '').trim();
  if(!isUuid(userId)){
    toast('Informe um e-mail existente ou user_id valido.');
    return;
  }
  if(!filialId){
    toast('Selecione a filial.');
    return;
  }
  if(!confirm('Desvincular usuario desta filial?')) return;
  const deleteResult = await SB.toResult(() => SB.deleteUserFilialEdge(userId, filialId, { origem: 'ui_acessos', email: resolvedUser?.email || null }));
  if(!deleteResult.ok){
    toast('Erro ao desvincular usuario: ' + deleteResult.error.message);
    return;
  }
  toast('Vinculo removido com sucesso.');
  await renderAcessosAdmin();
}

export async function convidarUsuarioAcesso(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode convidar usuario.')) return;
  const email = normalizeEmail(document.getElementById('ac-invite-email')?.value || '');
  const nome = String(document.getElementById('ac-invite-nome')?.value || '').trim();
  const papel = String(document.getElementById('ac-invite-papel')?.value || 'operador').trim();
  const filialId = String(document.getElementById('ac-invite-filial')?.value || '').trim();

  if(!isEmail(email)){
    setAccessFieldHelp('ac-invite-email', 'ac-invite-email-help', 'Informe um e-mail valido para o convite.', 'error');
    focusField('ac-invite-email', { markError: true });
    toast('Informe um e-mail valido.');
    return;
  }
  if(!appRolesSafe.includes(papel)){
    toast('Papel invalido.');
    return;
  }

  const inviteResult = await SB.toResult(() => SB.convidarUsuarioAcessoEdge({
    email,
    nome: nome || null,
    papel,
    filial_id: filialId || null,
    redirect_to: window.location.origin,
    detalhes: {
      origem: 'ui_acessos_convite_v2'
    }
  }));

  if(!inviteResult.ok){
    setAccessFieldHelp('ac-invite-email', 'ac-invite-email-help', inviteResult.error.message || 'Falha ao convidar usuario.', 'error');
    toast('Erro ao convidar usuario: ' + inviteResult.error.message);
    return;
  }

  /** @type {AccessAdminInviteData} */
  const inviteData = inviteResult.data;
  cacheAccessUser({
    user_id: inviteData.alvo_user_id,
    email: inviteData.email,
    nome: inviteData.nome || nome || null
  });
  setAccessFieldHelp(
    'ac-invite-email',
    'ac-invite-email-help',
    inviteData.user_created
      ? 'Convite enviado e acesso configurado com sucesso.'
      : 'Usuário existente reaproveitado e acesso configurado com sucesso.',
    'success'
  );

  const perfilUserEl = document.getElementById('ac-user-id');
  const perfilPapelEl = document.getElementById('ac-papel');
  const vinculoUserEl = document.getElementById('ac-v-user-id');
  const vinculoFilialEl = document.getElementById('ac-v-filial');
  if(perfilUserEl) perfilUserEl.value = email;
  if(perfilPapelEl) perfilPapelEl.value = papel;
  if(vinculoUserEl) vinculoUserEl.value = email;
  if(vinculoFilialEl && filialId) vinculoFilialEl.value = filialId;

  toast(inviteData.user_created ? 'Convite enviado e acesso configurado.' : 'Usuário existente configurado com sucesso.');
  await renderAcessosAdmin();
}

export async function trocarFilial(id){
  State.selFil = id;
  await entrarSafe();
  await renderSetupSafe();
  toast('Filial alterada!');
}

export async function reenviarConviteUsuarioAcesso(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode reenviar convite.')) return;
  const email = normalizeEmail(document.getElementById('ac-invite-email')?.value || '');
  const nome = String(document.getElementById('ac-invite-nome')?.value || '').trim();
  const papel = String(document.getElementById('ac-invite-papel')?.value || 'operador').trim();
  const filialId = String(document.getElementById('ac-invite-filial')?.value || '').trim();

  if(!isEmail(email)){
    setAccessFieldHelp('ac-invite-email', 'ac-invite-email-help', 'Informe um e-mail valido para reenviar o convite.', 'error');
    focusField('ac-invite-email', { markError: true });
    toast('Informe um e-mail valido.');
    return;
  }
  if(!appRolesSafe.includes(papel)){
    toast('Papel invalido.');
    return;
  }
  if(!confirm(`Reenviar o convite de acesso para ${email}?`)) return;

  const resendResult = await SB.toResult(() => SB.reenviarConviteUsuarioAcessoEdge({
    email,
    nome: nome || null,
    papel,
    filial_id: filialId || null,
    redirect_to: window.location.origin,
    detalhes: {
      origem: 'ui_acessos_reenvio_convite_v1'
    }
  }));

  if(!resendResult.ok){
    setAccessFieldHelp('ac-invite-email', 'ac-invite-email-help', resendResult.error.message || 'Falha ao reenviar convite.', 'error');
    toast('Erro ao reenviar convite: ' + resendResult.error.message);
    return;
  }

  /** @type {AccessAdminInviteData} */
  const resendData = resendResult.data;
  cacheAccessUser({
    user_id: resendData.alvo_user_id,
    email: resendData.email,
    nome: resendData.nome || nome || null
  });
  setAccessFieldHelp(
    'ac-invite-email',
    'ac-invite-email-help',
    'Convite reenviado com sucesso. Oriente o usuario a verificar o e-mail.',
    'success'
  );
  toast('Convite reenviado com sucesso.');
  await renderAcessosAdmin();
}
