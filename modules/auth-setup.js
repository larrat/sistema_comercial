import { SB } from '../js/api.js';
import { D, State } from '../js/store.js';
import { uid, norm, toast } from '../core/utils.js';

export const APP_ROLES = ['operador', 'gerente', 'admin'];
export const ROLE_LABEL = {
  operador: 'Operador',
  gerente: 'Gerente',
  admin: 'Admin'
};
export const ROLE_MANAGER_PLUS = ['admin', 'gerente'];
export const ROLE_ADMIN_ONLY = ['admin'];
export const ROLE_PAGE_ACCESS = {
  dashboard: APP_ROLES,
  gerencial: APP_ROLES,
  produtos: APP_ROLES,
  clientes: APP_ROLES,
  pedidos: APP_ROLES,
  cotacao: APP_ROLES,
  estoque: APP_ROLES,
  notificacoes: APP_ROLES,
  campanhas: ROLE_MANAGER_PLUS,
  filiais: ROLE_ADMIN_ONLY,
  acessos: ROLE_ADMIN_ONLY
};
export const ROLE_UI_MANAGER_SELECTORS = [
  '[onclick*="exportarTudo("]',
  '[onclick*="exportCSV("]',
  '[onclick*="removerProd("]',
  '[onclick*="removerCli("]',
  '[onclick*="removerPed("]',
  '[onclick*="remForn("]',
  '[onclick*="excluirMov("]',
  '[onclick*="abrirNovaCampanha("]',
  '[onclick*="salvarCampanha("]',
  '[onclick*="removerCampanha("]',
  '[onclick*="gerarFilaCampanha("]',
  '[onclick*="marcarEnvioEnviado("]',
  '[onclick*="marcarEnvioFalhou("]',
  '[onclick*="abrirSyncJogos("]',
  '[onclick*="sincronizarJogosDashboard("]',
  '[onclick*="salvarJogoDashboard("]',
  '[onclick*="removerJogoDashboard("]'
];
export const ROLE_UI_ADMIN_SELECTORS = [
  '[onclick*="criarPrimeiraFilial("]',
  '[onclick*="salvarFilial("]',
  '[onclick*="removerFilial("]',
  '[onclick*="editarFilial("]',
  '[onclick*="salvarPerfilAcesso("]',
  '[onclick*="removerPerfilAcesso("]',
  '[onclick*="vincularUsuarioFilial("]',
  '[onclick*="desvincularUsuarioFilial("]'
];

let roleUiGuardTimer = null;
let roleUiObserver = null;

let deps = {
  pageAtual: () => 'dashboard',
  ir: () => {},
  filterSidebarNav: () => {},
  resetRuntimeData: () => {},
  showLoading: () => {},
  mostrarTela: () => {},
  buildSkeletonLines: () => '',
  carregarDadosFilial: async () => {},
  refreshProdSel: () => {},
  refreshCliDL: () => {},
  renderFornSel: () => {},
  refreshMovSel: () => {},
  refreshDestSel: () => {},
  renderDashFilSel: () => {},
  renderDash: () => {},
  atualizarBadgeEst: () => {},
  updateNotiBadge: () => {},
  cores: ['#163F80']
};

export function initAuthSetupModule(nextDeps = {}){
  deps = {
    ...deps,
    ...nextDeps,
    cores: Array.isArray(nextDeps.cores) && nextDeps.cores.length ? nextDeps.cores : deps.cores
  };
}

export function normalizeUserRole(role){
  const r = norm(role || '');
  return APP_ROLES.includes(r) ? r : 'operador';
}

export function currentUserRole(){
  return normalizeUserRole(State.userRole);
}

export function hasRole(allowedRoles = []){
  const current = currentUserRole();
  return (allowedRoles || []).map(normalizeUserRole).includes(current);
}

export function canAccessPage(page){
  const p = String(page || 'dashboard');
  const allowed = ROLE_PAGE_ACCESS[p] || APP_ROLES;
  return hasRole(allowed);
}

export function getFirstAllowedPage(preferred = 'dashboard'){
  if(canAccessPage(preferred)) return preferred;
  const order = ['dashboard', 'produtos', 'clientes', 'pedidos', 'cotacao', 'estoque', 'notificacoes'];
  return order.find(canAccessPage) || 'dashboard';
}

export function ensureCurrentPageAccess(){
  const current = deps.pageAtual();
  if(canAccessPage(current)) return;
  deps.ir(getFirstAllowedPage('dashboard'));
}

export function requireRole(allowedRoles = [], denyMessage = 'Voce nao tem permissao para esta acao.'){
  if(hasRole(allowedRoles)) return true;
  toast(denyMessage);
  return false;
}

export function buildRoleGuard(fn, allowedRoles, denyMessage){
  return async (...args) => {
    if(!requireRole(allowedRoles, denyMessage)) return;
    return fn(...args);
  };
}

export function renderRoleBadge(){
  const el = document.getElementById('sb-role');
  if(!el) return;
  const role = currentUserRole();
  el.textContent = ROLE_LABEL[role] || 'Operador';
}

function setRoleUiLock(el, locked){
  if(!el) return;
  if(!locked){
    el.classList.remove('is-role-locked');
    if(el.dataset.rolePrevDisplay != null){
      el.style.display = el.dataset.rolePrevDisplay;
      delete el.dataset.rolePrevDisplay;
    }
    if('disabled' in el){
      el.disabled = false;
    }else{
      el.style.pointerEvents = '';
      el.style.opacity = '';
    }
    if(el.dataset.rolePrevTitle != null){
      el.title = el.dataset.rolePrevTitle;
      delete el.dataset.rolePrevTitle;
    }else if(el.title === 'Sem permissao para esta acao.'){
      el.removeAttribute('title');
    }
    return;
  }

  el.classList.add('is-role-locked');
  if(el.dataset.rolePrevDisplay == null){
    el.dataset.rolePrevDisplay = el.style.display || '';
  }
  el.style.display = 'none';
  if(el.dataset.rolePrevTitle == null){
    el.dataset.rolePrevTitle = el.title || '';
  }
  el.title = 'Sem permissao para esta acao.';
  if('disabled' in el){
    el.disabled = true;
  }else{
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.55';
  }
}

export function applyRoleUiGuards(root = document){
  const allowManagerActions = hasRole(ROLE_MANAGER_PLUS);
  const allowAdminActions = hasRole(ROLE_ADMIN_ONLY);

  root.querySelectorAll(ROLE_UI_MANAGER_SELECTORS.join(','))
    .forEach(el => setRoleUiLock(el, !allowManagerActions));
  root.querySelectorAll(ROLE_UI_ADMIN_SELECTORS.join(','))
    .forEach(el => setRoleUiLock(el, !allowAdminActions));

  root.querySelectorAll('[data-p="campanhas"],#pg-campanhas,#mob-campanhas')
    .forEach(el => setRoleUiLock(el, !allowManagerActions));
  root.querySelectorAll('[data-p="filiais"],#pg-filiais,#mob-filiais,[data-p="acessos"],#pg-acessos,#mob-acessos')
    .forEach(el => setRoleUiLock(el, !allowAdminActions));
  deps.filterSidebarNav(document.getElementById('sb-search')?.value || '');
}

export function scheduleRoleUiGuards(){
  if(roleUiGuardTimer) clearTimeout(roleUiGuardTimer);
  roleUiGuardTimer = setTimeout(() => {
    applyRoleUiGuards(document);
    roleUiGuardTimer = null;
  }, 0);
}

export function startRoleUiObserver(){
  if(roleUiObserver || typeof MutationObserver === 'undefined') return;
  roleUiObserver = new MutationObserver(() => scheduleRoleUiGuards());
  roleUiObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['onclick'] });
}

export async function carregarContextoUsuario(session){
  State.user = session?.user || null;
  let role = 'operador';
  try{
    const perfil = await SB.getMeuPerfil(session?.user?.id || null);
    role = normalizeUserRole(perfil?.papel || '');
  }catch(e){
    console.warn('Perfil nao encontrado em user_perfis. Assumindo operador.', e?.message || e);
  }
  State.userRole = role;
  renderRoleBadge();
  scheduleRoleUiGuards();
  setTimeout(() => ensureCurrentPageAccess(), 0);
}

export function renderAuthGate(session){
  const authBox = document.getElementById('setup-auth');
  const filGrid = document.getElementById('fil-grid');
  const setupForm = document.getElementById('setup-form');
  const setupActions = document.getElementById('setup-actions');
  const sub = document.getElementById('setup-sub');

  if(!authBox || !filGrid || !setupForm || !setupActions || !sub) return false;

  if(!session?.access_token){
    authBox.style.display = 'block';
    filGrid.innerHTML = '';
    setupForm.style.display = 'none';
    setupActions.style.display = 'none';
    sub.textContent = 'Faca login para acessar suas filiais';
    return false;
  }

  authBox.style.display = 'none';
  return true;
}

export async function authEntrar(){
  const emailEl = document.getElementById('auth-email');
  const passEl = document.getElementById('auth-password');
  const btn = document.getElementById('auth-login-btn');
  const email = emailEl?.value.trim() || '';
  const password = passEl?.value || '';

  if(!email || !password){
    toast('Informe e-mail e senha.');
    return;
  }

  if(btn) btn.disabled = true;
  try{
    await SB.signInWithPassword({ email, password });
    toast('Login realizado com sucesso.');
    if(passEl) passEl.value = '';
    await renderSetup();
  }catch(e){
    toast('Falha no login: ' + (e?.message || 'credenciais invalidas'));
  }finally{
    if(btn) btn.disabled = false;
  }
}

export async function sairConta(){
  await SB.signOut();
  deps.resetRuntimeData();
  toast('Sessao encerrada.');
  await renderSetup();
}

export function renderSetupGrid(){
  const grid = document.getElementById('fil-grid');
  const form = document.getElementById('setup-form');
  const actions = document.getElementById('setup-actions');
  const sub = document.getElementById('setup-sub');

  if(!grid || !form || !actions || !sub) return;

  if(!D.filiais.length){
    grid.innerHTML = '';
    form.style.display = 'block';
    actions.style.display = 'none';
    sub.textContent = 'Crie sua primeira filial para comecar';
    scheduleRoleUiGuards();
    return;
  }

  form.style.display = 'none';
  actions.style.display = 'flex';
  sub.textContent = 'Selecione a filial para continuar';

  grid.innerHTML = D.filiais.map(f => `
    <div class="fil-opt ${State.selFil === f.id ? 'sel' : ''}" data-click="selFilial('${f.id}')">
      <div class="fil-dot" style="background:${f.cor}"></div>
      <div>
        <div class="fil-name">${f.nome}</div>
        <div class="fil-city">${f.cidade || ''}${f.estado ? ' - ' + f.estado : ''}</div>
      </div>
    </div>
  `).join('');
  scheduleRoleUiGuards();
}

export async function renderSetup(){
  deps.mostrarTela('screen-setup');
  const session = await SB.getSession();
  if(!renderAuthGate(session)){
    State.user = null;
    State.userRole = 'operador';
    renderRoleBadge();
    return;
  }
  await carregarContextoUsuario(session);

  const grid = document.getElementById('fil-grid');
  const form = document.getElementById('setup-form');
  const actions = document.getElementById('setup-actions');
  const sub = document.getElementById('setup-sub');
  if(grid && form && actions && sub){
    form.style.display = 'none';
    actions.style.display = 'none';
    sub.textContent = 'Carregando filiais...';
    grid.innerHTML = `
      <div class="sk-card" style="grid-column:1/-1">${deps.buildSkeletonLines(3)}</div>
      <div class="sk-card" style="grid-column:1/-1">${deps.buildSkeletonLines(3)}</div>
    `;
  }
  deps.showLoading(true);
  try{
    D.filiais = await SB.getFiliais() || [];
  }catch(e){
    toast('Erro ao buscar filiais: ' + e.message);
  }
  deps.showLoading(false);
  renderSetupGrid();
}

export function selFilial(id){
  State.selFil = id;
  renderSetupGrid();
}

export async function criarPrimeiraFilial(){
  if(!requireRole(ROLE_ADMIN_ONLY, 'Somente admin pode criar filial.')) return;
  const nome = document.getElementById('sf-nome')?.value.trim();
  if(!nome){
    toast('Informe o nome da filial.');
    return;
  }

  const f = {
    id: uid(),
    nome,
    cidade: document.getElementById('sf-cidade')?.value.trim() || '',
    estado: document.getElementById('sf-estado')?.value.trim() || '',
    cor: document.getElementById('sf-cor')?.value || deps.cores[0],
    endereco: ''
  };

  try{
    await SB.upsertFilial(f);
  }catch(e){
    toast('Erro ao criar filial: ' + e.message);
    return;
  }

  D.filiais.push(f);
  State.selFil = f.id;
  await entrar();
}

export async function entrar(){
  const session = await SB.getSession();
  if(!session?.access_token){
    toast('Faca login para continuar.');
    await renderSetup();
    return;
  }
  await carregarContextoUsuario(session);

  if(!State.selFil){
    toast('Selecione uma filial.');
    return;
  }

  try{
    D.filiais = await SB.getFiliais() || [];
  }catch(e){}

  const f = D.filiais.find(x => x.id === State.selFil);
  if(!f){
    toast('Filial nao encontrada.');
    return;
  }

  State.FIL = State.selFil;

  const dot = document.getElementById('sb-dot');
  const fname = document.getElementById('sb-fname');
  if(dot) dot.style.background = f.cor;
  if(fname) fname.textContent = f.nome;

  await deps.carregarDadosFilial(State.FIL);

  deps.mostrarTela('screen-app');

  deps.refreshProdSel();
  deps.refreshCliDL();
  deps.renderFornSel();
  deps.refreshMovSel();
  deps.refreshDestSel();
  deps.renderDashFilSel();
  deps.renderDash();
  deps.atualizarBadgeEst();
  deps.updateNotiBadge();

  deps.ir('dashboard');
}

export function voltarSetup(){
  return renderSetup();
}
