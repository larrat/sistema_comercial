import { SB } from '../app/api.js';
import { D, State } from '../app/store.js';
import { uid, toast, abrirModal, fecharModal } from '../shared/utils.js';

let requireRoleSafe = () => true;
let renderSetupSafe = async () => {};
let entrarSafe = async () => {};
let renderDashFilSelSafe = () => {};
let scheduleRoleUiGuardsSafe = () => {};
let roleAdminOnlySafe = ['admin'];
let appRolesSafe = ['operador', 'gerente', 'admin'];
let coresSafe = ['#163F80'];

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

function isUuid(v){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || '').trim());
}

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
      <div class="card fb" style="${ativa ? 'border-color:var(--acc)' : ''}">
        <div style="display:flex;align-items:center;gap:12px;flex:1">
          <div style="width:14px;height:14px;border-radius:50%;background:${f.cor};flex-shrink:0"></div>
          <div>
            <div style="font-weight:600;font-size:15px">
              ${f.nome}${ativa ? ` <span class="bdg bb" style="font-size:10px;vertical-align:middle">Ativa</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--tx3)">${f.cidade || ''}${f.estado ? ' - ' + f.estado : ''}</div>
            <div style="display:flex;gap:6px;margin-top:6px">
              <span class="bdg bk">${prods} produto(s)</span>
              <span class="bdg bk">${clis} cliente(s)</span>
              <span class="bdg bk">${peds} pedido(s)</span>
            </div>
          </div>
        </div>
        <div class="fg2">
          ${!ativa ? `<button class="btn btn-sm" data-click="trocarFilial('${f.id}')">Selecionar</button>` : ''}
          <button class="ib" data-click="editarFilial('${f.id}')">✏</button>
          <button class="ib" data-click="removerFilial('${f.id}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function preencherSelectFiliaisAcesso(){
  const el = document.getElementById('ac-v-filial');
  if(!el) return;
  const current = el.value || '';
  const opts = D.filiais || [];
  el.innerHTML = opts.length
    ? opts.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')
    : '<option value="">Sem filiais</option>';
  if(current && opts.some(f => f.id === current)) el.value = current;
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
  let items = D.userPerfis || [];
  if(q) items = items.filter(x => String(x.user_id || '').toLowerCase().includes(q));
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
            <th>Papel</th>
            <th>Atualizado</th>
            <th style="text-align:right">Ação</th>
          </tr>
        </thead>
        <tbody>
          ${p.slice.map(pf => `
            <tr>
              <td><code>${pf.user_id}</code></td>
              <td><span class="bdg ${pf.papel === 'admin' ? 'br' : pf.papel === 'gerente' ? 'ba' : 'bk'}">${pf.papel}</span></td>
              <td>${pf.atualizado_em ? new Date(pf.atualizado_em).toLocaleString('pt-BR') : '-'}</td>
              <td style="text-align:right">
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
            <th>Papel</th>
            <th>Filial</th>
            <th style="text-align:right">Ação</th>
          </tr>
        </thead>
        <tbody>
          ${p.slice.map(v => `
            <tr>
              <td><code>${v.user_id}</code></td>
              <td><span class="bdg bk">${perfMap.get(v.user_id) || 'sem_perfil'}</span></td>
              <td>${filMap.get(v.filial_id) || v.filial_id}</td>
              <td style="text-align:right">
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
                <div style="font-size:11px;color:var(--tx3)">${a.alvo_filial_id ? (filMap.get(a.alvo_filial_id) || a.alvo_filial_id) : '-'}</div>
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

export function preencherPerfilAcesso(userId, papel){
  const userEl = document.getElementById('ac-user-id');
  const papelEl = document.getElementById('ac-papel');
  if(userEl) userEl.value = userId || '';
  if(papelEl) papelEl.value = papel || 'operador';
}

export function preencherVinculoAcesso(userId, filialId){
  const userEl = document.getElementById('ac-v-user-id');
  const filialEl = document.getElementById('ac-v-filial');
  if(userEl) userEl.value = userId || '';
  if(filialEl && filialId) filialEl.value = filialId;
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

  const data = readResult.data || {};
  D.userPerfis = data.perfis || [];
  D.userFiliais = data.vinculos || [];
  D.filiais = data.filiais || D.filiais || [];
  D.acessosAudit = data.auditoria || [];

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

export async function salvarPerfilAcesso(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode alterar perfil de acesso.')) return;
  const userId = (document.getElementById('ac-user-id')?.value || '').trim();
  const papel = (document.getElementById('ac-papel')?.value || 'operador').trim();
  if(!isUuid(userId)){
    toast('Informe um user_id válido (UUID).');
    return;
  }
  if(!appRolesSafe.includes(papel)){
    toast('Papel inválido.');
    return;
  }
  const saveResult = await SB.toResult(() => SB.upsertUserPerfilEdge({
    user_id: userId,
    papel,
    detalhes: { origem: 'ui_acessos' }
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
  const userId = (document.getElementById('ac-user-id')?.value || '').trim();
  if(!isUuid(userId)){
    toast('Informe um user_id válido (UUID).');
    return;
  }
  if(userId === State.user?.id){
    toast('Não é permitido remover o próprio perfil.');
    return;
  }
  if(!confirm('Remover perfil deste usuário?')) return;
  const deleteResult = await SB.toResult(() => SB.deleteUserPerfilEdge(userId, {
    origem: 'ui_acessos'
  }));
  if(!deleteResult.ok){
    toast('Erro ao remover perfil: ' + deleteResult.error.message);
    return;
  }
  toast('Perfil removido com sucesso.');
  await renderAcessosAdmin();
}

export async function vincularUsuarioFilial(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode vincular usuário a filial.')) return;
  const userId = (document.getElementById('ac-v-user-id')?.value || '').trim();
  const filialId = (document.getElementById('ac-v-filial')?.value || '').trim();
  if(!isUuid(userId)){
    toast('Informe um user_id válido (UUID).');
    return;
  }
  if(!filialId){
    toast('Selecione a filial.');
    return;
  }
  const saveResult = await SB.toResult(() => SB.upsertUserFilialEdge({ user_id: userId, filial_id: filialId, detalhes: { origem: 'ui_acessos' } }));
  if(!saveResult.ok){
    toast('Erro ao vincular usuário: ' + saveResult.error.message);
    return;
  }
  toast('Vínculo salvo com sucesso.');
  await renderAcessosAdmin();
}

export async function desvincularUsuarioFilial(){
  if(!requireRoleSafe(roleAdminOnlySafe, 'Somente admin pode desvincular usuário de filial.')) return;
  const userId = (document.getElementById('ac-v-user-id')?.value || '').trim();
  const filialId = (document.getElementById('ac-v-filial')?.value || '').trim();
  if(!isUuid(userId)){
    toast('Informe um user_id válido (UUID).');
    return;
  }
  if(!filialId){
    toast('Selecione a filial.');
    return;
  }
  if(!confirm('Desvincular usuário desta filial?')) return;
  const deleteResult = await SB.toResult(() => SB.deleteUserFilialEdge(userId, filialId, { origem: 'ui_acessos' }));
  if(!deleteResult.ok){
    toast('Erro ao desvincular usuário: ' + deleteResult.error.message);
    return;
  }
  toast('Vínculo removido com sucesso.');
  await renderAcessosAdmin();
}

export async function trocarFilial(id){
  State.selFil = id;
  await entrarSafe();
  await renderSetupSafe();
  toast('Filial alterada!');
}

