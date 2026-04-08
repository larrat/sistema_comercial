import { D, State } from '../js/store.js';
import { norm, toast } from '../core/utils.js';
import { markInvalidation, markRender } from '../core/render-metrics.js';

let deps = {
  hasRole: () => true,
  canAccessPage: () => true,
  getFirstAllowedPage: () => 'dashboard',
  scheduleRoleUiGuards: () => {},
  startPrimaryActionTracking: () => {},
  completePrimaryActionTracking: () => {},
  markConsistencyPage: () => {},
  updateNotiBadge: () => {},
  renderDash: () => {},
  renderMetasNegocio: () => {},
  renderProdMet: () => {},
  renderProdutos: () => {},
  renderCliMet: () => {},
  renderClientes: () => {},
  renderPedMet: () => {},
  renderPedidos: () => {},
  renderFornSel: () => {},
  renderCotForns: () => {},
  renderCotLogs: () => {},
  renderCotTabela: () => {},
  renderEstAlerts: () => {},
  renderEstPosicao: () => {},
  renderEstHist: () => {},
  renderCampanhasMet: () => {},
  renderCampanhas: () => {},
  renderFilaWhatsApp: () => {},
  renderCampanhaEnvios: () => {},
  renderFilMet: () => {},
  renderFilLista: () => {},
  renderAcessosAdmin: () => {},
  renderNotificacoes: () => {},
  limparFormPedTracked: () => {},
  limparFormCliTracked: () => {},
  limparFormProdTracked: () => {},
  abrirNovaCampanhaTracked: () => {},
  gerarFilaCampanhaTracked: () => {},
  abrirModal: () => {},
  exportCSV: () => {},
  resetMov: () => {},
  cotLock: () => {},
  voltarSetup: () => {},
  limparFormFilial: () => {},
  resolverTodasNotificacoesTracked: () => {},
  refreshCampanhasTela: () => {},
  executarAuditoriaVisual: () => {},
  roleManagerPlus: ['admin', 'gerente'],
  roleAdminOnly: ['admin']
};
let pendingPageRender = 0;
let pendingPageName = '';

export function initNavigationModule(nextDeps = {}){
  deps = {
    ...deps,
    ...nextDeps,
    roleManagerPlus: Array.isArray(nextDeps.roleManagerPlus) ? nextDeps.roleManagerPlus : deps.roleManagerPlus,
    roleAdminOnly: Array.isArray(nextDeps.roleAdminOnly) ? nextDeps.roleAdminOnly : deps.roleAdminOnly
  };
}

function getPageRenderers(){
  return {
    dashboard: [deps.renderDash],
    gerencial: [deps.renderMetasNegocio],
    produtos: [deps.renderProdMet, deps.renderProdutos],
    clientes: [deps.renderCliMet, deps.renderClientes],
    pedidos: [deps.renderPedMet, deps.renderPedidos],
    cotacao: [deps.renderFornSel, deps.renderCotForns, deps.renderCotLogs, deps.renderCotTabela],
    estoque: [deps.renderEstAlerts, deps.renderEstPosicao, deps.renderEstHist],
    campanhas: [deps.renderCampanhasMet, deps.renderCampanhas, deps.renderFilaWhatsApp, deps.renderCampanhaEnvios],
    filiais: [deps.renderFilMet, deps.renderFilLista],
    acessos: [deps.renderAcessosAdmin],
    notificacoes: [deps.renderNotificacoes]
  };
}

function runPageRender(page){
  const renderers = getPageRenderers()[page] || [];
  renderers.forEach(render => {
    if(typeof render === 'function') render();
  });
  markRender(page, 'page');
}

function schedulePageRender(page){
  pendingPageName = page;
  markInvalidation(page, 'page', 'navigation');
  if(pendingPageRender) return;
  pendingPageRender = window.requestAnimationFrame(() => {
    const pageToRender = pendingPageName;
    pendingPageRender = 0;
    pendingPageName = '';
    runPageRender(pageToRender);
  });
}

const PAGE_META = {
  dashboard: {
    kicker: 'Resumo',
    title: 'Dashboard',
    sub: 'Visao geral da filial',
    primary: { label: 'Novo pedido', run: () => { deps.limparFormPedTracked(); deps.abrirModal('modal-pedido'); } },
    secondary: { label: 'Novo cliente', run: () => { deps.limparFormCliTracked(); deps.abrirModal('modal-cliente'); } },
    tertiary: { label: 'Novo produto', run: () => { deps.limparFormProdTracked(); deps.abrirModal('modal-produto'); } }
  },
  gerencial: {
    kicker: 'Indicadores',
    title: 'Gerencial',
    sub: 'Metas e desempenho',
    primary: { label: 'Atualizar KPIs', run: () => deps.renderMetasNegocio() },
    secondary: { label: 'Auditoria visual', run: () => deps.executarAuditoriaVisual() },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  },
  produtos: {
    kicker: 'Cadastros',
    title: 'Produtos',
    sub: 'Catalogo e precos',
    primary: { label: 'Novo produto', run: () => { deps.limparFormProdTracked(); deps.abrirModal('modal-produto'); } },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('produtos'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Ir clientes', run: () => ir('clientes') }
  },
  clientes: {
    kicker: 'Cadastros',
    title: 'Clientes',
    sub: 'Relacionamento e segmentos',
    primary: { label: 'Novo cliente', run: () => { deps.limparFormCliTracked(); deps.abrirModal('modal-cliente'); } },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('clientes'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Ver segmentos', run: () => switchTab('cli', 'segs') }
  },
  pedidos: {
    kicker: 'Vendas',
    title: 'Pedidos',
    sub: 'Orcamentos e vendas',
    primary: { label: 'Novo pedido', run: () => { deps.limparFormPedTracked(); deps.abrirModal('modal-pedido'); } },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('pedidos'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Ir estoque', run: () => ir('estoque') }
  },
  cotacao: {
    kicker: 'Compras',
    title: 'Cotacao',
    sub: 'Fornecedores e precos',
    primary: { label: 'Novo fornecedor', run: () => deps.abrirModal('modal-forn') },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('cotacao'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Travar/Destravar', run: () => deps.cotLock() }
  },
  estoque: {
    kicker: 'Operacao',
    title: 'Estoque',
    sub: 'Saldo e movimentacoes',
    primary: { label: 'Nova movimentacao', run: () => { deps.resetMov(); deps.abrirModal('modal-mov'); } },
    secondary: { label: 'Exportar CSV', run: () => deps.exportCSV('estoque'), roles: deps.roleManagerPlus },
    tertiary: { label: 'Ir produtos', run: () => ir('produtos') }
  },
  campanhas: {
    kicker: 'Marketing',
    title: 'Campanhas',
    sub: 'Acoes e envios',
    primary: { label: 'Nova campanha', run: () => deps.abrirNovaCampanhaTracked(), roles: deps.roleManagerPlus },
    secondary: { label: 'Atualizar tela', run: () => deps.refreshCampanhasTela() },
    tertiary: { label: 'Exportar CSV', run: () => deps.exportCSV('campanhas'), roles: deps.roleManagerPlus }
  },
  filiais: {
    kicker: 'Sistema',
    title: 'Filiais',
    sub: 'Unidades e contexto',
    primary: { label: 'Nova filial', run: () => { deps.limparFormFilial(); deps.abrirModal('modal-filial'); }, roles: deps.roleAdminOnly },
    secondary: { label: 'Voltar setup', run: () => deps.voltarSetup() },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  },
  acessos: {
    kicker: 'Sistema',
    title: 'Acessos',
    sub: 'Perfis e permissoes',
    primary: { label: 'Atualizar', run: () => deps.renderAcessosAdmin(), roles: deps.roleAdminOnly },
    secondary: { label: 'Ir filiais', run: () => ir('filiais'), roles: deps.roleAdminOnly },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  },
  notificacoes: {
    kicker: 'Alertas',
    title: 'Notificacoes',
    sub: 'Criticos, atencao e oportunidade',
    primary: { label: 'Resolver todas', run: () => deps.resolverTodasNotificacoesTracked() },
    secondary: { label: 'Atualizar', run: () => deps.renderNotificacoes() },
    tertiary: { label: 'Ir dashboard', run: () => ir('dashboard') }
  }
};

export function pageAtual(){
  const on = document.querySelector('.pg.on');
  if(!on?.id) return 'dashboard';
  return String(on.id).replace(/^pg-/, '') || 'dashboard';
}

function scrollToCampSection(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function getContextualPageMeta(page){
  const base = PAGE_META[page] || PAGE_META.dashboard;
  const meta = {
    ...base,
    primary: base.primary ? { ...base.primary } : null,
    secondary: base.secondary ? { ...base.secondary } : null,
    tertiary: base.tertiary ? { ...base.tertiary } : null
  };

  if(page === 'clientes'){
    const segTabAtiva = !!document.getElementById('cli-tc-segs')?.classList.contains('on');
    meta.tertiary = segTabAtiva
      ? { label: 'Voltar lista', run: () => switchTab('cli', 'lista') }
      : { label: 'Ver segmentos', run: () => switchTab('cli', 'segs') };
  }

  if(page === 'campanhas'){
    const envios = D.campanhaEnvios?.[State.FIL] || [];
    const campanhas = D.campanhas?.[State.FIL] || [];
    const pendentes = envios.filter(e => e.canal === 'whatsapp_manual' && (e.status === 'manual' || e.status === 'pendente'));
    const primeiraAtiva = campanhas.find(c => c.ativo);

    meta.secondary = pendentes.length
      ? { label: `Fila WhatsApp (${pendentes.length})`, run: () => scrollToCampSection('camp-wa-fila') }
      : { label: 'Atualizar tela', run: () => deps.refreshCampanhasTela() };

    meta.tertiary = primeiraAtiva
      ? { label: 'Rodar 1a ativa', run: () => deps.gerarFilaCampanhaTracked(primeiraAtiva.id), roles: deps.roleManagerPlus }
      : { label: 'Exportar CSV', run: () => deps.exportCSV('campanhas'), roles: deps.roleManagerPlus };
  }

  return meta;
}

function bindTopbarAction(id, action){
  const el = document.getElementById(id);
  if(!el) return;
  if(!action || (action.roles && !deps.hasRole(action.roles))){
    el.style.display = 'none';
    el.onclick = null;
    return;
  }
  el.style.display = 'inline-flex';
  el.textContent = action.label;
  el.onclick = () => {
    if(id === 'app-act-primary'){
      deps.completePrimaryActionTracking(pageAtual());
    }
    action.run();
  };
}

export function syncTopbar(page){
  const meta = getContextualPageMeta(page);
  const kicker = document.getElementById('app-kicker');
  const title = document.getElementById('app-title');
  const sub = document.getElementById('app-sub');

  if(kicker) kicker.textContent = meta.kicker;
  if(title) title.textContent = meta.title;
  if(sub) sub.textContent = meta.sub;

  bindTopbarAction('app-act-primary', meta.primary);
  bindTopbarAction('app-act-secondary', meta.secondary);
  bindTopbarAction('app-act-tertiary', meta.tertiary);
  renderQuickLinks(meta);
  syncSidebarContext(meta);
}

export function syncSidebarContext(meta){
  const kicker = document.getElementById('sb-context-kicker');
  const title = document.getElementById('sb-context-title');
  const sub = document.getElementById('sb-context-sub');
  if(kicker) kicker.textContent = meta?.kicker || 'Resumo';
  if(title) title.textContent = meta?.title || 'Dashboard';
  if(sub) sub.textContent = meta?.sub || 'Visao geral';
}

export function filterSidebarNav(raw = ''){
  const query = norm(raw || '');
  const items = Array.from(document.querySelectorAll('.sb-nav .ni'));
  const groups = Array.from(document.querySelectorAll('.sb-nav .sb-group'));
  let visibleItems = 0;

  items.forEach(item => {
    const haystack = norm(item.dataset.label || item.textContent || '');
    const match = !query || haystack.includes(query);
    item.hidden = !match;
    if(match && item.style.display !== 'none') visibleItems += 1;
  });

  groups.forEach(group => {
    const hasVisibleItems = Array.from(group.querySelectorAll('.ni'))
      .some(item => !item.hidden && item.style.display !== 'none');
    group.hidden = !hasVisibleItems;
  });

  const empty = document.getElementById('sb-empty');
  if(empty) empty.style.display = visibleItems ? 'none' : 'block';
}

export function initSidebarEnhancements(){
  const input = document.getElementById('sb-search');
  if(input && !input.dataset.bound){
    input.dataset.bound = '1';
    input.addEventListener('input', e => filterSidebarNav(e.target.value));
    input.addEventListener('keydown', e => {
      if(e.key === 'Escape'){
        input.value = '';
        filterSidebarNav('');
        input.blur();
      }
    });
  }
  filterSidebarNav(input?.value || '');
  syncSidebarContext(getContextualPageMeta(pageAtual()));
}

export function renderQuickLinks(meta){
  const el = document.getElementById('quick-links');
  if(!el) return;
  const actions = [meta?.primary, meta?.secondary, meta?.tertiary]
    .filter(a => a && (!a.roles || deps.hasRole(a.roles)))
    .slice(0, 2);
  el.innerHTML = actions
    .map(a => `<button class="qk" type="button">${a.label}</button>`)
    .join('');
  Array.from(el.querySelectorAll('.qk')).forEach((btn, idx) => {
    btn.onclick = actions[idx].run;
  });
}

export function ir(page){
  let nextPage = page;
  if(!deps.canAccessPage(nextPage)){
    toast('Voce nao tem permissao para acessar esta area.');
    nextPage = deps.getFirstAllowedPage('dashboard');
  }
  fecharSb();

  document.querySelectorAll('.ni').forEach(n => n.classList.toggle('on', n.dataset.p === nextPage));
  document.querySelectorAll('.pg').forEach(x => x.classList.remove('on'));
  document.getElementById('pg-' + nextPage)?.classList.add('on');
  document.querySelectorAll('.mob-btn').forEach(b => b.classList.toggle('on', b.id === 'mob-' + nextPage));

  schedulePageRender(nextPage);
  deps.startPrimaryActionTracking(nextPage);
  deps.markConsistencyPage(nextPage);
  deps.updateNotiBadge();
  syncTopbar(nextPage);
  deps.scheduleRoleUiGuards();
  filterSidebarNav(document.getElementById('sb-search')?.value || '');
  window.scrollTo(0, 0);
}

export function switchTab(grp, name){
  const prefix = grp + '-tc-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(t => t.classList.remove('on'));
  document.getElementById(prefix + name)?.classList.add('on');

  document.querySelectorAll(`#pg-${grp} .tb`).forEach((b, i) => {
    const ids = Array.from(document.querySelectorAll(`[id^="${prefix}"]`)).map(t => t.id.replace(prefix, ''));
    b.classList.toggle('on', ids[i] === name);
  });

  const atual = pageAtual();
  if(atual === grp){
    syncTopbar(atual);
  }
}

export function abrirSb(){
  document.getElementById('sb')?.classList.add('on');
  document.getElementById('sb-overlay')?.classList.add('on');
  const close = document.getElementById('sb-close');
  if(close) close.style.display = 'flex';
  document.getElementById('sb-search')?.focus();
}

export function fecharSb(){
  document.getElementById('sb')?.classList.remove('on');
  document.getElementById('sb-overlay')?.classList.remove('on');
  const close = document.getElementById('sb-close');
  if(close) close.style.display = 'none';
}
