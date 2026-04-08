import { SB } from './api.js';
import { D, State, P, C, PD, FORNS, CPRECOS, CCFG } from './store.js';
import { createAppContext } from '../core/app-context.js';
import { createModuleRegistry } from '../core/module-registry.js';

import {
  toast,
  abrirModal,
  fecharModal,
  uid,
  norm,
  fmt,
  fmtN,
  mk2mg,
  prV
} from '../core/utils.js';

import {
  initCotacaoModule,
  renderFornSel,
  renderCotLogs,
  renderCotForns,
  renderCotTabela,
  salvarForn,
  remForn,
  cotLock,
  updPreco,
  cotFile,
  confirmarMapa,
  renderMapaBody
} from '../modules/cotacao.js';

import {
  initProdutosModule,
  renderProdMet,
  renderProdutos,
  limparFormProd,
  editarProd,
  syncV,
  syncA,
  calcProdPreview,
  salvarProduto,
  removerProd,
  refreshProdSel
} from '../modules/produtos.js';

import {
  renderCliMet,
  renderClientes,
  renderCliSegs,
  abrirCliDet,
  addNota,
  limparFormCli,
  editarCli,
  salvarCliente,
  removerCli,
  refreshCliDL
} from '../modules/clientes.js';

import {
  initPedidosModule,
  renderPedMet,
  renderPedidos,
  limparFormPed,
  editarPed,
  addItem,
  remItem,
  renderItens,
  salvarPedido,
  removerPed,
  verPed
} from '../modules/pedidos.js';

import {
  calcSaldos,
  calcSaldosMulti,
  atualizarBadgeEst,
  renderEstAlerts,
  renderEstPosicao,
  renderEstHist,
  refreshMovSel,
  refreshDestSel,
  resetMov,
  abrirMovProd,
  setTipo,
  movLoadProd,
  movCalc,
  movCalcAjuste,
  salvarMov,
  excluirMov
} from '../modules/estoque.js';

import {
  initDashboardModule,
  renderDashFilSel,
  renderDash,
  setP,
  renderDashJogos,
  abrirNovoJogo,
  limparFormJogo,
  salvarJogoDashboard,
  removerJogoDashboard,
  abrirSyncJogos,
  sincronizarJogosDashboard,
  usarExemploSyncJogos
} from '../modules/dashboard.js';

import {
  carregarCampanhas,
  carregarCampanhaEnvios,
  refreshCampanhasTela,
  limparFormCampanha,
  abrirNovaCampanha,
  adotarCampanhasParaFilialAtiva,
  editarCampanha,
  salvarCampanha,
  removerCampanha,
  renderCampanhasMet,
  renderCampanhas,
  gerarFilaCampanha,
  renderFilaWhatsApp,
  renderCampanhaEnvios,
  abrirWhatsAppEnvio,
  marcarEnvioEnviado,
  marcarEnvioFalhou
} from '../modules/campanhas.js';

import {
  initNotificacoesModule,
  getNotificacoesResumo,
  renderNotificacoes,
  updateNotiBadge,
  setFiltroNotificacoes,
  executarNotificacao,
  resolverNotificacao,
  reabrirNotificacao,
  resolverTodasNotificacoes
} from '../modules/notificacoes.js';

import {
  initTelemetriaModule,
  startCriticalTask,
  completeCriticalTask,
  abandonCriticalTask,
  registerJourneyRework,
  startPrimaryActionTracking,
  completePrimaryActionTracking,
  registerNotificationKpi,
  logStrategicAction,
  markConsistencyPage,
  renderMetasNegocio,
  initGoalTracking,
  resetUxKpis,
  executarAcaoGerencial
} from '../modules/telemetria.js';

import {
  initAuthSetupModule,
  APP_ROLES,
  ROLE_MANAGER_PLUS,
  ROLE_ADMIN_ONLY,
  hasRole,
  canAccessPage,
  getFirstAllowedPage,
  requireRole,
  buildRoleGuard,
  scheduleRoleUiGuards,
  startRoleUiObserver,
  authEntrar,
  sairConta,
  renderSetup,
  selFilial,
  criarPrimeiraFilial,
  entrar,
  voltarSetup
} from '../modules/auth-setup.js';

import {
  initFiliaisAcessosModule,
  limparFormFilial,
  editarFilial,
  salvarFilial,
  removerFilial,
  trocarFilial,
  renderFilMet,
  renderFilLista,
  renderAcessosMet,
  renderAcessosPerfis,
  renderAcessosVinculos,
  renderAcessosAuditoria,
  changeAcessosPage,
  preencherPerfilAcesso,
  preencherVinculoAcesso,
  renderAcessosAdmin,
  salvarPerfilAcesso,
  removerPerfilAcesso,
  vincularUsuarioFilial,
  desvincularUsuarioFilial
} from '../modules/filiais-acessos.js';

import {
  initNavigationModule,
  pageAtual,
  filterSidebarNav,
  initSidebarEnhancements,
  ir,
  switchTab,
  abrirSb,
  fecharSb
} from '../modules/navigation.js';

const CORES = ['#163F80', '#156038', '#7A4E00', '#9B2D24', '#5B3F99', '#1A6B7A'];

const AppContext = createAppContext({
  services: {
    SB,
    D,
    State
  },
  config: {
    appName: 'sistema_comercial'
  }
});

const AppModules = createModuleRegistry();

function resetRuntimeData(){
  D.filiais = [];
  D.produtos = {};
  D.clientes = {};
  D.pedidos = {};
  D.fornecedores = {};
  D.cotPrecos = {};
  D.cotConfig = {};
  D.movs = {};
  D.jogos = {};
  D.campanhas = {};
  D.campanhaEnvios = {};
  D.notas = {};
  D.userPerfis = [];
  D.userFiliais = [];
  D.acessosAudit = [];

  State.FIL = null;
  State.selFil = null;
  State.user = null;
  State.userRole = 'operador';
  State.acPagePerfis = 1;
  State.acPageVinculos = 1;
  State.acPageAuditoria = 1;
  State.editIds = {};
  State.pedItens = [];
}

function limparFormProdTracked(){
  startCriticalTask('produto');
  return limparFormProd();
}
function limparFormCliTracked(){
  startCriticalTask('cliente');
  return limparFormCli();
}
function limparFormPedTracked(){
  startCriticalTask('pedido');
  return limparFormPed();
}
function abrirNovaCampanhaTracked(){
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode criar campanha.')) return;
  startCriticalTask('campanha');
  logStrategicAction('campanhas');
  return abrirNovaCampanha();
}
async function salvarProdutoTracked(){
  if(State.editIds.prod) registerJourneyRework('produto');
  await salvarProduto();
  const open = document.getElementById('modal-produto')?.classList.contains('on');
  if(!open) completeCriticalTask('produto');
  renderMetasNegocio();
}
async function salvarClienteTracked(){
  if(State.editIds.cli) registerJourneyRework('cliente');
  await salvarCliente();
  const open = document.getElementById('modal-cliente')?.classList.contains('on');
  if(!open) completeCriticalTask('cliente');
  renderMetasNegocio();
}
async function salvarPedidoTracked(){
  if(State.editIds.ped) registerJourneyRework('pedido');
  await salvarPedido();
  const open = document.getElementById('modal-pedido')?.classList.contains('on');
  if(!open) completeCriticalTask('pedido');
  renderMetasNegocio();
}
async function salvarCampanhaTracked(){
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode salvar campanha.')) return;
  if(State.editIds?.campanha) registerJourneyRework('campanha');
  await salvarCampanha();
  const open = document.getElementById('modal-campanha')?.classList.contains('on');
  if(!open){
    completeCriticalTask('campanha');
    logStrategicAction('campanhas');
  }
  renderMetasNegocio();
}
async function gerarFilaCampanhaTracked(id){
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode gerar fila de campanha.')) return;
  logStrategicAction('campanhas');
  await gerarFilaCampanha(id);
  renderMetasNegocio();
}

function executarAuditoriaVisual(){
  const checks = [];
  const add = (ok, item, detalhe = '') => checks.push({ ok, item, detalhe });
  const has = id => !!document.getElementById(id);
  add(has('app-title') && has('app-sub') && has('app-act-primary'), 'Topbar global');
  add(has('pg-clientes') && has('cli-lista') && has('modal-cliente'), 'Fluxo Clientes');
  add(has('pg-campanhas') && has('camp-lista') && has('camp-wa-fila') && has('modal-campanha'), 'Fluxo Campanhas');
  const btnPrimario = document.getElementById('app-act-primary');
  add(!!String(btnPrimario?.textContent || '').trim(), 'CTA primario com rotulo');
  const falhas = checks.filter(c => !c.ok);
  const ok = checks.length - falhas.length;
  console.table(checks.map(c => ({ status: c.ok ? 'OK' : 'FALHA', item: c.item, detalhe: c.detalhe || '' })));
  toast(falhas.length ? `Auditoria visual: ${ok}/${checks.length} OK (${falhas.length} falha(s)).` : `Auditoria visual: ${ok}/${checks.length} OK.`);
}

function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function executarAuditoriaAceite(){
  const checks = [];
  const add = (frente, ok, item, detalhe = '') => checks.push({ frente, ok, item, detalhe });
  const btn = document.querySelector('.btn');
  const card = document.querySelector('.card');
  const panel = document.querySelector('.panel');
  const radiusMd = cssVar('--radius-md');
  const radiusLg = cssVar('--radius-lg');
  const shadowMd = cssVar('--shadow-md');
  add('Consistencia visual', !!radiusMd && !!radiusLg && !!shadowMd, 'Tokens base de radius/sombra');
  if(btn){
    const s = getComputedStyle(btn);
    add('Consistencia visual', s.borderRadius === radiusMd, 'Botao usa radius padronizado', `button radius: ${s.borderRadius}`);
  }
  if(card && panel){
    const sc = getComputedStyle(card);
    const sp = getComputedStyle(panel);
    add('Consistencia visual', sc.borderRadius === sp.borderRadius, 'Card e Panel com raio consistente', `card:${sc.borderRadius} panel:${sp.borderRadius}`);
  }
  const total = checks.length;
  const ok = checks.filter(c => c.ok).length;
  const falhas = checks.filter(c => !c.ok);
  console.table(checks.map(c => ({ frente: c.frente, status: c.ok ? 'OK' : 'FALHA', item: c.item, detalhe: c.detalhe || '' })));
  toast(falhas.length ? `Aceite por frente: ${ok}/${total} OK (${falhas.length} pendencia(s)).` : `Aceite por frente: ${ok}/${total} OK.`);
}

const QUICK_COMMANDS = [
  { cmd: '/ dashboard', label: 'Abrir Dashboard', run: () => ir('dashboard') },
  { cmd: '/ gerencial', label: 'Abrir Gerencial', run: () => ir('gerencial') },
  { cmd: '/ produtos', label: 'Abrir Produtos', run: () => ir('produtos') },
  { cmd: '/ clientes', label: 'Abrir Clientes', run: () => ir('clientes') },
  { cmd: '/ pedidos', label: 'Abrir Pedidos', run: () => ir('pedidos') },
  { cmd: '/ cotacao', label: 'Abrir Cotacao', run: () => ir('cotacao') },
  { cmd: '/ estoque', label: 'Abrir Estoque', run: () => ir('estoque') },
  { cmd: '/ campanhas', label: 'Abrir Campanhas', run: () => ir('campanhas') },
  { cmd: '/ acessos', label: 'Abrir Acessos', run: () => ir('acessos') },
  { cmd: '/ notificacoes', label: 'Abrir Notificacoes', run: () => ir('notificacoes') },
  { cmd: '/ filiais', label: 'Abrir Filiais', run: () => ir('filiais') },
  { cmd: '/ novo pedido', label: 'Novo Pedido', run: () => { limparFormPedTracked(); abrirModal('modal-pedido'); } },
  { cmd: '/ novo cliente', label: 'Novo Cliente', run: () => { limparFormCliTracked(); abrirModal('modal-cliente'); } },
  { cmd: '/ novo produto', label: 'Novo Produto', run: () => { limparFormProdTracked(); abrirModal('modal-produto'); } },
  { cmd: '/ nova campanha', label: 'Nova Campanha', run: () => abrirNovaCampanhaTracked() },
  { cmd: '/ nova mov', label: 'Nova Movimentacao', run: () => { resetMov(); abrirModal('modal-mov'); } },
  { cmd: '/ sync jogos', label: 'Sincronizar Jogos', run: () => abrirSyncJogos() },
  { cmd: '/ auditoria visual', label: 'Auditoria Visual', run: () => executarAuditoriaVisual() },
  { cmd: '/ auditoria aceite', label: 'Auditoria de Aceite', run: () => executarAuditoriaAceite() }
];

function findQuickCommand(raw){
  const v = norm(raw).replace(/^\/\s*/, '');
  if(!v) return null;
  return QUICK_COMMANDS.find(c => norm(c.cmd).replace(/^\/\s*/, '') === v) ||
    QUICK_COMMANDS.find(c => norm(c.cmd).replace(/^\/\s*/, '').includes(v));
}

function executeQuickCommand(raw){
  const found = findQuickCommand(raw);
  if(!found){
    toast('Comando não encontrado. Ex: / clientes, / nova campanha');
    return false;
  }
  found.run();
  return true;
}

function initQuickCommand(){
  const input = document.getElementById('quick-cmd');
  const dl = document.getElementById('quick-cmd-list');
  if(!input || !dl) return;

  dl.innerHTML = QUICK_COMMANDS
    .map(c => `<option value="${c.cmd}">${c.label}</option>`)
    .join('');

  input.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const ok = executeQuickCommand(input.value);
    if(ok) input.value = '';
  });

  document.addEventListener('keydown', e => {
    if(e.key !== '/') return;
    const target = e.target;
    const editing = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
    if(editing) return;
    e.preventDefault();
    input.focus();
    input.select();
  });
}

const FLOW_MAX = { prod: 4, cli: 4 };
window.__flowSteps = { prod: 1, cli: 1 };

function flowVal(id, fallback = '—'){
  const el = document.getElementById(id);
  if(!el) return fallback;
  const raw = ('value' in el ? el.value : el.textContent) ?? '';
  const v = String(raw).trim();
  return v || fallback;
}

function focusField(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.focus();
  if(typeof el.select === 'function') el.select();
}

function validateFlowStep(flow, step){
  if(flow === 'prod'){
    if(step === 1){
      const nome = flowVal('p-nome', '');
      const custo = parseFloat(document.getElementById('p-custo')?.value || 0) || 0;
      if(!nome){
        toast('Produto: informe o nome para continuar.');
        focusField('p-nome');
        return false;
      }
      if(custo <= 0){
        toast('Produto: informe um custo maior que zero.');
        focusField('p-custo');
        return false;
      }
    }
    if(step === 2){
      const mkv = parseFloat(document.getElementById('p-mkv')?.value || 0) || 0;
      const pfa = parseFloat(document.getElementById('p-pfa')?.value || 0) || 0;
      const mka = parseFloat(document.getElementById('p-mka')?.value || 0) || 0;
      if(mkv <= 0 && pfa <= 0 && mka <= 0){
        toast('Produto: defina markup varejo ou preço/markup de atacado.');
        focusField('p-mkv');
        return false;
      }
    }
    return true;
  }

  if(flow === 'cli'){
    if(step === 1){
      const nome = flowVal('c-nome', '');
      if(!nome){
        toast('Cliente: informe o nome para continuar.');
        focusField('c-nome');
        return false;
      }
    }
    if(step === 2){
      const tab = flowVal('c-tab', '');
      const prazo = flowVal('c-prazo', '');
      if(!tab || !prazo){
        toast('Cliente: complete os dados comerciais (tabela e prazo).');
        focusField(!tab ? 'c-tab' : 'c-prazo');
        return false;
      }
    }
    return true;
  }

  return true;
}

function renderFlowSummary(flow){
  if(flow === 'prod'){
    const el = document.getElementById('prod-flow-resumo');
    if(!el) return;
    const custo = parseFloat(document.getElementById('p-custo')?.value || 0) || 0;
    const mkv = parseFloat(document.getElementById('p-mkv')?.value || 0) || 0;
    const mka = parseFloat(document.getElementById('p-mka')?.value || 0) || 0;
    const pfa = parseFloat(document.getElementById('p-pfa')?.value || 0) || 0;
    const un = flowVal('p-un', '');
    const nome = flowVal('p-nome', '');
    const sku = flowVal('p-sku', '—');
    const cat = flowVal('p-cat', '—');
    const pv = custo > 0 && mkv > 0 ? prV(custo, mkv) : 0;
    const pa = pfa > 0 ? pfa : (custo > 0 && mka > 0 ? prV(custo, mka) : 0);
    const margemV = pv > 0 ? ((pv - custo) / pv) * 100 : 0;
    const margemA = pa > 0 ? ((pa - custo) / pa) * 100 : 0;
    const inconsistencias = [];
    if(pv > 0 && pv <= custo) inconsistencias.push('Preço varejo está menor/igual ao custo.');
    if(pa > 0 && pa <= custo) inconsistencias.push('Preço atacado está menor/igual ao custo.');
    if(pa > 0 && pv > 0 && pa > pv) inconsistencias.push('Preço atacado está acima do varejo.');
    if((parseFloat(document.getElementById('p-emin')?.value || 0) || 0) < 0) inconsistencias.push('Estoque mínimo negativo.');

    const checks = [
      { ok: !!nome, label: 'Nome do produto' },
      { ok: !!un, label: 'Unidade' },
      { ok: custo > 0, label: 'Custo válido' },
      { ok: mkv > 0 || mka > 0 || pfa > 0, label: 'Regra de preço definida' }
    ];

    const checkHtml = checks.map(c => `<span class="bdg ${c.ok ? 'bg' : 'br'}">${c.ok ? 'OK' : 'Pendente'} • ${c.label}</span>`).join('');
    const incHtml = inconsistencias.length
      ? `<div class="panel" style="margin-top:10px"><div class="pt">Inconsistências</div>${inconsistencias.map(i => `<div style="margin-bottom:4px">- ${i}</div>`).join('')}</div>`
      : `<div class="panel" style="margin-top:10px"><div class="pt">Inconsistências</div><div>Nenhuma inconsistência crítica detectada.</div></div>`;

    el.innerHTML = `
      <div class="fg2" style="margin-bottom:10px;gap:6px">${checkHtml}</div>
      <div class="fg c2">
        <div><div class="fl">Produto</div><div><b>${nome || '—'}</b></div></div>
        <div><div class="fl">SKU</div><div>${sku}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Unidade / Categoria</div><div>${un || '—'} • ${cat}</div></div>
        <div><div class="fl">Custo</div><div>${custo > 0 ? fmt(custo) : '—'}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Preço Varejo</div><div>${pv > 0 ? `${fmt(pv)} (${margemV.toFixed(1)}% margem)` : '—'}</div></div>
        <div><div class="fl">Preço Atacado</div><div>${pa > 0 ? `${fmt(pa)} (${margemA.toFixed(1)}% margem)` : '—'}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Estoque inicial</div><div>${flowVal('p-esal')}</div></div>
        <div><div class="fl">Estoque mínimo</div><div>${flowVal('p-emin')}</div></div>
      </div>
      ${incHtml}
    `;
    return;
  }

  if(flow === 'cli'){
    const el = document.getElementById('cli-flow-resumo');
    if(!el) return;
    const optins = [
      document.getElementById('c-optin-marketing')?.checked ? 'Marketing' : '',
      document.getElementById('c-optin-email')?.checked ? 'E-mail' : '',
      document.getElementById('c-optin-sms')?.checked ? 'SMS' : ''
    ].filter(Boolean).join(', ');
    const nome = flowVal('c-nome', '');
    const whatsapp = flowVal('c-whatsapp', '');
    const tel = flowVal('c-tel', '');
    const email = flowVal('c-email', '');
    const contatoCount = [whatsapp, tel, email].filter(Boolean).length;
    const optinEmail = !!document.getElementById('c-optin-email')?.checked;
    const optinSms = !!document.getElementById('c-optin-sms')?.checked;
    const optinMkt = !!document.getElementById('c-optin-marketing')?.checked;
    const inconsistencias = [];
    if(optinEmail && !email) inconsistencias.push('Opt-in de e-mail marcado sem e-mail cadastrado.');
    if(optinSms && !tel) inconsistencias.push('Opt-in de SMS marcado sem telefone.');
    if(optinMkt && !whatsapp && !tel && !email) inconsistencias.push('Opt-in de marketing marcado sem canal de contato.');

    const checks = [
      { ok: !!nome, label: 'Nome do cliente' },
      { ok: contatoCount > 0, label: 'Pelo menos 1 canal de contato' },
      { ok: !!flowVal('c-tab', ''), label: 'Tabela comercial' },
      { ok: !!flowVal('c-prazo', ''), label: 'Prazo comercial' }
    ];
    const checkHtml = checks.map(c => `<span class="bdg ${c.ok ? 'bg' : 'br'}">${c.ok ? 'OK' : 'Pendente'} • ${c.label}</span>`).join('');
    const canais = [
      whatsapp ? 'WhatsApp' : '',
      tel ? 'Telefone' : '',
      email ? 'E-mail' : ''
    ].filter(Boolean).join(', ') || 'Nenhum';
    const incHtml = inconsistencias.length
      ? `<div class="panel" style="margin-top:10px"><div class="pt">Inconsistências</div>${inconsistencias.map(i => `<div style="margin-bottom:4px">- ${i}</div>`).join('')}</div>`
      : `<div class="panel" style="margin-top:10px"><div class="pt">Inconsistências</div><div>Nenhuma inconsistência crítica detectada.</div></div>`;
    el.innerHTML = `
      <div class="fg2" style="margin-bottom:10px;gap:6px">${checkHtml}</div>
      <div class="fg c2">
        <div><div class="fl">Cliente</div><div><b>${nome || '—'}</b></div></div>
        <div><div class="fl">Apelido</div><div>${flowVal('c-apelido')}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Documento / Tipo</div><div>${flowVal('c-doc')} • ${flowVal('c-tipo')}</div></div>
        <div><div class="fl">Status</div><div>${flowVal('c-status')}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Contato</div><div>${flowVal('c-tel')} • ${flowVal('c-whatsapp')} • ${flowVal('c-email')}</div></div>
        <div><div class="fl">Aniversário</div><div>${flowVal('c-aniv')}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Comercial</div><div>${flowVal('c-seg')} • ${flowVal('c-tab')} • ${flowVal('c-prazo')}</div></div>
        <div><div class="fl">Time(s)</div><div>${flowVal('c-time')}</div></div>
      </div>
      <div class="fg c2">
        <div><div class="fl">Cidade / Estado</div><div>${flowVal('c-cidade')} • ${flowVal('c-estado')}</div></div>
        <div><div class="fl">Opt-ins</div><div>${optins || 'Nenhum'}</div></div>
      </div>
      <div class="panel" style="margin-top:10px">
        <div class="pt">Impacto comercial</div>
        <div>Canal(is) disponível(is): <b>${canais}</b></div>
        <div style="margin-top:4px">Pronto para campanhas: <b>${(optinMkt && contatoCount > 0) ? 'Sim' : 'Parcial'}</b></div>
      </div>
      ${incHtml}
    `;
  }
}

function setFlowStep(flow, rawStep){
  const max = FLOW_MAX[flow];
  if(!max) return;
  const current = window.__flowSteps[flow] || 1;
  let step = Math.max(1, Math.min(max, Number(rawStep) || 1));

  if(step > current){
    for(let s = current; s < step; s += 1){
      if(!validateFlowStep(flow, s)){
        step = current;
        break;
      }
    }
  }

  window.__flowSteps[flow] = step;

  document.querySelectorAll(`.flow-step[data-flow-id="${flow}"]`).forEach(el => {
    el.classList.toggle('on', Number(el.dataset.step) === step);
  });
  document.querySelectorAll(`.flow-chip[data-flow-chip="${flow}"]`).forEach(el => {
    el.classList.toggle('on', Number(el.dataset.step) === step);
  });

  const prev = document.getElementById(`${flow}-flow-prev`);
  const next = document.getElementById(`${flow}-flow-next`);
  const save = document.getElementById(`${flow}-flow-save`);
  if(prev) prev.disabled = step <= 1;
  if(next) next.style.display = step >= max ? 'none' : 'inline-flex';
  if(save) save.style.display = step >= max ? 'inline-flex' : 'none';

  if(step === max) renderFlowSummary(flow);
}

function initFlowWizards(){
  ['prod','cli'].forEach(flow => setFlowStep(flow, 1));
  [
    'p-nome','p-sku','p-un','p-cat','p-custo','p-mkv','p-mka','p-pfa','p-esal','p-emin',
    'c-nome','c-apelido','c-doc','c-tipo','c-status','c-tel','c-whatsapp','c-email','c-aniv',
    'c-seg','c-tab','c-prazo','c-time','c-cidade','c-estado','c-optin-marketing','c-optin-email','c-optin-sms'
  ].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      if(window.__flowSteps.prod === FLOW_MAX.prod) renderFlowSummary('prod');
      if(window.__flowSteps.cli === FLOW_MAX.cli) renderFlowSummary('cli');
    });
  });
}

function buildSkeletonLines(lines = 3){
  return Array.from({ length: lines })
    .map(() => '<span class="sk-line"></span>')
    .join('');
}

function renderSkeletonState(){
  const map = {
    'dash-met': `<div class="sk-grid sk-grid-4">
      <div class="sk-card">${buildSkeletonLines(2)}</div>
      <div class="sk-card">${buildSkeletonLines(2)}</div>
      <div class="sk-card">${buildSkeletonLines(2)}</div>
      <div class="sk-card">${buildSkeletonLines(2)}</div>
    </div>`,
    'dash-chart': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'dash-status': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'prod-lista': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'cli-lista': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'ped-lista': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'est-posicao': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'camp-lista': `<div class="sk-card">${buildSkeletonLines(4)}</div>`,
    'camp-wa-fila': `<div class="sk-card">${buildSkeletonLines(3)}</div>`,
    'camp-envios-lista': `<div class="sk-card">${buildSkeletonLines(3)}</div>`,
    'noti-lista': `<div class="sk-card">${buildSkeletonLines(3)}</div>`
  };

  Object.entries(map).forEach(([id, html]) => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = html;
  });
}

function showLoading(on) {
  let el = document.getElementById('sb-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sb-loading';
    el.style.cssText =
      'position:fixed;inset:0;background:rgba(246,245,242,.88);z-index:8000;display:none;align-items:center;justify-content:center;gap:12px;font-size:14px;font-weight:500;color:var(--tx2);font-family:DM Sans,sans-serif;backdrop-filter:blur(2px)';
    el.innerHTML =
      '<div style="width:22px;height:22px;border:2.5px solid var(--bd2);border-top-color:var(--acc);border-radius:50%;animation:sp .7s linear infinite"></div>Carregando dados…';
    const st = document.createElement('style');
    st.textContent = '@keyframes sp{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
    document.body.appendChild(el);
  }
  el.style.display = on ? 'flex' : 'none';
}

async function carregarDadosFilial(filId) {
  renderSkeletonState();
  showLoading(true);
  try {
    const [
      prods,
      clis,
      peds,
      forns,
      precos,
      cfg,
      movs,
      jogos,
      campanhas,
      campanhaEnvios
    ] = await Promise.all([
      SB.getProdutos(filId),
      SB.getClientes(filId),
      SB.getPedidos(filId),
      SB.getFornecedores(filId),
      SB.getCotPrecos(filId),
      SB.getCotConfig(filId),
      SB.getMovs(filId),
      SB.getJogosAgenda(filId).catch(() => []),
      SB.getCampanhas(filId).catch(e => {
        console.error('Falha ao carregar campanhas na entrada da filial', e);
        toast('Não foi possível carregar campanhas do banco. Usando cache local.');
        return D.campanhas?.[filId] || [];
      }),
      SB.getCampanhaEnvios(filId).catch(e => {
        console.error('Falha ao carregar envios de campanhas na entrada da filial', e);
        toast('Não foi possível carregar envios de campanha do banco. Usando cache local.');
        return D.campanhaEnvios?.[filId] || [];
      })
    ]);

    D.produtos[filId] = prods || [];
    D.clientes[filId] = clis || [];
    D.pedidos[filId] = (peds || []).map(p => ({
      ...p,
      itens: typeof p.itens === 'string' ? JSON.parse(p.itens || '[]') : (p.itens || [])
    }));
    D.fornecedores[filId] = forns || [];

    if (!D.cotPrecos[filId]) D.cotPrecos[filId] = {};
    D.cotPrecos[filId] = {};
    (precos || []).forEach(p => {
      D.cotPrecos[filId][p.produto_id + '_' + p.fornecedor_id] = p.preco;
    });

    const logs = cfg?.logs
      ? (typeof cfg.logs === 'string' ? JSON.parse(cfg.logs) : cfg.logs)
      : [];

    D.cotConfig[filId] = {
      filial_id: filId,
      locked: cfg?.locked || false,
      logs
    };

    D.movs[filId] = movs || [];
    if (!D.jogos) D.jogos = {};
    D.jogos[filId] = jogos || [];

    if (!D.campanhas) D.campanhas = {};
    if (!D.campanhaEnvios) D.campanhaEnvios = {};
    D.campanhas[filId] = campanhas || [];
    D.campanhaEnvios[filId] = campanhaEnvios || [];
  } catch (e) {
    toast('Erro ao carregar: ' + e.message);
    console.error(e);
  }
  showLoading(false);
}

function mostrarTela(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById(id)?.classList.add('on');
  window.scrollTo(0, 0);
}



function resolverTodasNotificacoesTracked(){
  logStrategicAction('notificacoes');
  resolverTodasNotificacoes();
  renderMetasNegocio();
}

function exportCSV(tipo) {
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode exportar CSV.')) return;
  const saldos = calcSaldos();
  let rows = [];
  let name = '';

  if (tipo === 'produtos') {
    name = 'produtos';
    rows = [
      ['Nome', 'SKU', 'Un', 'Categoria', 'Custo', 'Mk Varejo%', 'Mg Varejo%', 'Preço Varejo', 'Mk Atacado%', 'Preço Atacado', 'Est. Min', 'Saldo Atual'],
      ...P().map(p => {
        const pv = prV(p.custo, p.mkv);
        const pa = p.pfa > 0 ? p.pfa : (p.mka > 0 ? prV(p.custo, p.mka) : 0);
        const s = saldos[p.id] || { saldo: 0 };
        return [p.nome, p.sku || '', p.un, p.cat || '', fmtN(p.custo), fmtN(p.mkv), fmtN(mk2mg(p.mkv)), fmtN(pv), fmtN(p.mka), pa > 0 ? fmtN(pa) : '', p.emin || '', fmtN(s.saldo)];
      })
    ];
  } else if (tipo === 'clientes') {
    name = 'clientes';
    rows = [
      ['Nome', 'Apelido', 'CPF/CNPJ', 'Tipo', 'Status', 'Telefone', 'Email', 'Time', 'Segmento', 'Tabela', 'Prazo', 'Cidade', 'WhatsApp', 'Aniversário'],
      ...C().map(c => [c.nome, c.apelido || '', c.doc || '', c.tipo, c.status, c.tel || '', c.email || '', c.time || '', c.seg || '', c.tab, c.prazo, c.cidade || '', c.whatsapp || '', c.data_aniversario || ''])
    ];
  } else if (tipo === 'pedidos') {
    name = 'pedidos';
    rows = [
      ['Nº', 'Cliente', 'Data', 'Status', 'Tipo', 'Pagamento', 'Prazo', 'Total', 'Lucro', 'Obs'],
      ...PD().map(p => {
        const lucro = (p.itens || []).reduce((a, i) => a + ((i.preco - i.custo) * i.qty), 0);
        return [p.num, p.cli, p.data, p.status, p.tipo, p.pgto, p.prazo, fmtN(p.total), fmtN(lucro), p.obs || ''];
      })
    ];
  } else if (tipo === 'cotacao') {
    name = 'cotacao';
    const forns = FORNS();
    if (!P().length || !forns.length) {
      toast('Sem dados para exportar.');
      return;
    }

    rows = [
      ['Produto', 'Un', ...forns.map(f => f.nome), 'Melhor preço', 'Melhor fornecedor'],
      ...P().map(p => {
        const prices = forns.map(f => {
          const k = p.id + '_' + f.id;
          return CPRECOS()[k] !== undefined ? parseFloat(CPRECOS()[k]) : '';
        });
        const valid = prices.filter(v => v !== '' && v > 0);
        const mp = valid.length ? Math.min(...valid) : '';
        const bi = prices.findIndex(v => v === mp);
        return [p.nome, p.un, ...prices, mp !== '' ? fmtN(mp) : '', bi >= 0 ? forns[bi].nome : ''];
      })
    ];
  } else if (tipo === 'estoque') {
    name = 'estoque';
    rows = [
      ['Produto', 'SKU', 'Un', 'Saldo', 'Custo Médio', 'Valor Total', 'Est. Mín', 'Status'],
      ...P().map(p => {
        const s = saldos[p.id] || { saldo: 0, cm: 0 };
        const min = p.emin || 0;
        const st = s.saldo <= 0 ? 'Zerado' : min > 0 && s.saldo < min ? 'Baixo' : 'OK';
        return [p.nome, p.sku || '', p.un, fmtN(s.saldo), fmtN(s.cm), fmtN(s.saldo * s.cm), min || '', st];
      })
    ];
  } else if (tipo === 'campanhas') {
    name = 'campanhas';
    const campanhas = (D.campanhas?.[State.FIL] || []);
    rows = [
      ['Nome', 'Tipo', 'Canal', 'Antecedência', 'Assunto', 'Cupom', 'Desconto', 'Ativo'],
      ...campanhas.map(c => [c.nome, c.tipo, c.canal, c.dias_antecedencia || 0, c.assunto || '', c.cupom || '', c.desconto || 0, c.ativo ? 'Sim' : 'Não'])
    ];
  }

  if (!rows.length) {
    toast('Sem dados para exportar.');
    return;
  }

  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.csv';
  a.click();
  toast('CSV exportado!');
}

function exportarTudo() {
  ['produtos', 'clientes', 'pedidos', 'cotacao', 'estoque', 'campanhas'].forEach((t, i) =>
    setTimeout(() => exportCSV(t), i * 200)
  );
}



const removerProdGuard = buildRoleGuard(removerProd, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover produto.');
const removerCliGuard = buildRoleGuard(removerCli, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover cliente.');
const removerPedGuard = buildRoleGuard(removerPed, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover pedido.');
const remFornGuard = buildRoleGuard(remForn, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover fornecedor.');
const excluirMovGuard = buildRoleGuard(excluirMov, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode excluir movimentação.');
const removerJogoDashboardGuard = buildRoleGuard(removerJogoDashboard, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover jogo.');
const salvarJogoDashboardGuard = buildRoleGuard(salvarJogoDashboard, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode salvar jogo.');
const sincronizarJogosDashboardGuard = buildRoleGuard(sincronizarJogosDashboard, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode sincronizar jogos.');
const removerCampanhaGuard = buildRoleGuard(removerCampanha, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode remover campanha.');
const marcarEnvioEnviadoGuard = buildRoleGuard(marcarEnvioEnviado, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode alterar envio.');
const marcarEnvioFalhouGuard = buildRoleGuard(marcarEnvioFalhou, ROLE_MANAGER_PLUS, 'Somente gerente/admin pode alterar envio.');

AppModules.register({
  name: 'cotacao',
  init(){
    initCotacaoModule({
      renderCotLogs,
      renderProdMet,
      renderProdutos
    });
  }
});

AppModules.register({
  name: 'produtos',
  init(){
    initProdutosModule({
      calcSaldos
    });
  }
});

AppModules.register({
  name: 'pedidos',
  init(){
    initPedidosModule({
      refreshProdSel,
      refreshCliDL
    });
  }
});

AppModules.register({
  name: 'dashboard',
  init(){
    initDashboardModule({
      calcSaldosMulti
    });
  }
});

AppModules.register({
  name: 'telemetria',
  init(){
    initTelemetriaModule({
      pageAtual,
      getNotificacoesResumo,
      ir,
      abrirNovaCampanhaTracked,
      limparFormPedTracked,
      abrirModal,
      fmt,
      onMetricsReset: () => renderMetasNegocio()
    });
  }
});

AppModules.register({
  name: 'auth-setup',
  init(){
    initAuthSetupModule({
      pageAtual,
      ir,
      filterSidebarNav,
      resetRuntimeData,
      showLoading,
      mostrarTela,
      buildSkeletonLines,
      carregarDadosFilial,
      refreshProdSel,
      refreshCliDL,
      renderFornSel,
      refreshMovSel,
      refreshDestSel,
      renderDashFilSel,
      renderDash,
      atualizarBadgeEst,
      updateNotiBadge,
      cores: CORES
    });
  }
});

AppModules.register({
  name: 'navigation',
  init(){
    initNavigationModule({
      hasRole,
      canAccessPage,
      getFirstAllowedPage,
      scheduleRoleUiGuards,
      startPrimaryActionTracking,
      completePrimaryActionTracking,
      markConsistencyPage,
      updateNotiBadge,
      renderDash,
      renderMetasNegocio,
      renderProdMet,
      renderProdutos,
      renderCliMet,
      renderClientes,
      renderPedMet,
      renderPedidos,
      renderFornSel,
      renderCotForns,
      renderCotLogs,
      renderCotTabela,
      renderEstAlerts,
      renderEstPosicao,
      renderEstHist,
      renderCampanhasMet,
      renderCampanhas,
      renderFilaWhatsApp,
      renderCampanhaEnvios,
      renderFilMet,
      renderFilLista,
      renderAcessosAdmin,
      renderNotificacoes,
      limparFormPedTracked,
      limparFormCliTracked,
      limparFormProdTracked,
      abrirNovaCampanhaTracked,
      gerarFilaCampanhaTracked,
      abrirModal,
      exportCSV,
      resetMov,
      cotLock,
      voltarSetup,
      limparFormFilial,
      resolverTodasNotificacoesTracked,
      refreshCampanhasTela,
      roleManagerPlus: ROLE_MANAGER_PLUS,
      roleAdminOnly: ROLE_ADMIN_ONLY
    });
  }
});

AppModules.register({
  name: 'filiais-acessos',
  init(){
    initFiliaisAcessosModule({
      requireRole,
      renderSetup,
      entrar,
      renderDashFilSel,
      scheduleRoleUiGuards,
      roleAdminOnly: ROLE_ADMIN_ONLY,
      appRoles: APP_ROLES,
      cores: CORES
    });
  }
});

AppModules.register({
  name: 'notificacoes',
  init(){
    initNotificacoesModule({
      calcSaldos,
      ir,
      renderMetasNegocio,
      registerNotificationKpi,
      logStrategicAction
    });
  }
});

async function bootstrapApplication(){
  await AppModules.initAll(AppContext);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrapApplication().catch(e => console.error('Falha no bootstrap da aplicacao:', e));
    initGoalTracking();
    initQuickCommand();
    initSidebarEnhancements();
    initFlowWizards();
    startRoleUiObserver();
    scheduleRoleUiGuards();
    renderSetup();
  });
} else {
  bootstrapApplication().catch(e => console.error('Falha no bootstrap da aplicacao:', e));
  initGoalTracking();
  initQuickCommand();
  initSidebarEnhancements();
  initFlowWizards();
  startRoleUiObserver();
  scheduleRoleUiGuards();
  renderSetup();
}

window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.criarPrimeiraFilial = criarPrimeiraFilial;
window.entrar = entrar;
window.voltarSetup = voltarSetup;
window.authEntrar = authEntrar;
window.sairConta = sairConta;
window.selFilial = selFilial;
window.fecharSb = fecharSb;
window.abrirSb = abrirSb;
window.ir = ir;
window.switchTab = switchTab;
window.exportarTudo = exportarTudo;
window.exportCSV = exportCSV;
window.setFlowStep = setFlowStep;
window.renderNotificacoes = renderNotificacoes;
window.renderMetasNegocio = renderMetasNegocio;
window.resetUxKpis = resetUxKpis;
window.executarAcaoGerencial = executarAcaoGerencial;
window.setFiltroNotificacoes = setFiltroNotificacoes;
window.executarNotificacao = executarNotificacao;
window.resolverNotificacao = resolverNotificacao;
window.reabrirNotificacao = reabrirNotificacao;
window.resolverTodasNotificacoes = resolverTodasNotificacoesTracked;

window.renderDashFilSel = renderDashFilSel;
window.renderDash = renderDash;
window.setP = setP;
window.renderDashJogos = renderDashJogos;
window.abrirNovoJogo = abrirNovoJogo;
window.limparFormJogo = limparFormJogo;
window.salvarJogoDashboard = salvarJogoDashboardGuard;
window.removerJogoDashboard = removerJogoDashboardGuard;
window.abrirSyncJogos = abrirSyncJogos;
window.sincronizarJogosDashboard = sincronizarJogosDashboardGuard;
window.usarExemploSyncJogos = usarExemploSyncJogos;

window.renderProdutos = renderProdutos;
window.renderProdMet = renderProdMet;
window.limparFormProd = limparFormProdTracked;
window.salvarProduto = salvarProdutoTracked;
window.editarProd = editarProd;
window.removerProd = removerProdGuard;
window.calcProdPreview = calcProdPreview;
window.syncV = syncV;
window.syncA = syncA;
window.refreshProdSel = refreshProdSel;

window.renderClientes = renderClientes;
window.renderCliMet = renderCliMet;
window.limparFormCli = limparFormCliTracked;
window.salvarCliente = salvarClienteTracked;
window.editarCli = editarCli;
window.removerCli = removerCliGuard;
window.renderCliSegs = renderCliSegs;
window.abrirCliDet = abrirCliDet;
window.addNota = addNota;
window.refreshCliDL = refreshCliDL;

window.renderPedidos = renderPedidos;
window.renderPedMet = renderPedMet;
window.limparFormPed = limparFormPedTracked;
window.salvarPedido = salvarPedidoTracked;
window.editarPed = editarPed;
window.removerPed = removerPedGuard;
window.verPed = verPed;
window.addItem = addItem;
window.remItem = remItem;
window.renderItens = renderItens;

window.renderCotForns = renderCotForns;
window.renderCotTabela = renderCotTabela;
window.cotFile = cotFile;
window.cotLock = cotLock;
window.salvarForn = salvarForn;
window.remForn = remFornGuard;
window.confirmarMapa = confirmarMapa;
window.renderMapaBody = renderMapaBody;
window.renderFornSel = renderFornSel;
window.renderCotLogs = renderCotLogs;
window.updPreco = updPreco;

window.renderEstPosicao = renderEstPosicao;
window.renderEstHist = renderEstHist;
window.renderEstAlerts = renderEstAlerts;
window.atualizarBadgeEst = atualizarBadgeEst;
window.resetMov = resetMov;
window.abrirMovProd = abrirMovProd;
window.setTipo = setTipo;
window.movLoadProd = movLoadProd;
window.movCalc = movCalc;
window.movCalcAjuste = movCalcAjuste;
window.salvarMov = salvarMov;
window.excluirMov = excluirMovGuard;
window.refreshMovSel = refreshMovSel;
window.refreshDestSel = refreshDestSel;

window.salvarFilial = salvarFilial;
window.limparFormFilial = limparFormFilial;
window.editarFilial = editarFilial;
window.removerFilial = removerFilial;
window.trocarFilial = trocarFilial;
window.renderFilMet = renderFilMet;
window.renderFilLista = renderFilLista;
window.renderAcessosAdmin = renderAcessosAdmin;
window.renderAcessosPerfis = renderAcessosPerfis;
window.renderAcessosVinculos = renderAcessosVinculos;
window.renderAcessosAuditoria = renderAcessosAuditoria;
window.changeAcessosPage = changeAcessosPage;
window.preencherPerfilAcesso = preencherPerfilAcesso;
window.preencherVinculoAcesso = preencherVinculoAcesso;
window.salvarPerfilAcesso = salvarPerfilAcesso;
window.removerPerfilAcesso = removerPerfilAcesso;
window.vincularUsuarioFilial = vincularUsuarioFilial;
window.desvincularUsuarioFilial = desvincularUsuarioFilial;

window.carregarCampanhas = carregarCampanhas;
window.carregarCampanhaEnvios = carregarCampanhaEnvios;
window.refreshCampanhasTela = refreshCampanhasTela;
window.limparFormCampanha = limparFormCampanha;
window.abrirNovaCampanha = abrirNovaCampanhaTracked;
window.adotarCampanhasParaFilialAtiva = adotarCampanhasParaFilialAtiva;
window.editarCampanha = editarCampanha;
window.salvarCampanha = salvarCampanhaTracked;
window.removerCampanha = removerCampanhaGuard;
window.renderCampanhasMet = renderCampanhasMet;
window.renderCampanhas = renderCampanhas;
window.gerarFilaCampanha = gerarFilaCampanhaTracked;
window.renderFilaWhatsApp = renderFilaWhatsApp;
window.renderCampanhaEnvios = renderCampanhaEnvios;
window.abrirWhatsAppEnvio = abrirWhatsAppEnvio;
window.marcarEnvioEnviado = marcarEnvioEnviadoGuard;
window.marcarEnvioFalhou = marcarEnvioFalhouGuard;
