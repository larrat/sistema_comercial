import { SB } from './api.js';
import { D, State, P, C, PD, FORNS, CPRECOS, CCFG } from './store.js';
import { createAppContext } from '../shared/app-context.js';
import { createModuleRegistry } from '../shared/module-registry.js';
import { getRenderMetrics, resetRenderMetrics } from '../shared/render-metrics.js';

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
} from '../shared/utils.js';

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
} from '../features/cotacao.js';

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
} from '../features/produtos.js';

import {
  initClientesModule,
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
} from '../features/clientes.js';

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
} from '../features/pedidos.js';

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
} from '../features/estoque.js';

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
} from '../features/dashboard.js';

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
} from '../features/campanhas.js';

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
} from '../features/notificacoes.js';

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
} from '../features/telemetria.js';

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
} from '../features/auth-setup.js';

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
} from '../features/filiais-acessos.js';

import {
  initNavigationModule,
  pageAtual,
  filterSidebarNav,
  initSidebarEnhancements,
  ir,
  switchTab,
  abrirSb,
  fecharSb
} from '../features/navigation.js';

import {
  initUxWorkflowsModule,
  executarAuditoriaVisual,
  executarAuditoriaAceite,
  initQuickCommand,
  setFlowStep,
  initFlowWizards
} from '../features/ux-workflows.js';

import {
  initRuntimeLoadingModule,
  buildSkeletonLines,
  showLoading,
  carregarDadosFilial,
  mostrarTela
} from '../features/runtime-loading.js';

import {
  registerApplicationModules,
  startApplicationRuntime
} from '../features/boot-runtime.js';

import {
  initDomBindings
} from '../features/dom-bindings.js';

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
window.__SC_DEBUG__ = Object.freeze({
  getRenderMetrics,
  resetRenderMetrics
});

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

registerApplicationModules({
  registry: AppModules,
  modules: {
    initCotacaoModule,
    initProdutosModule,
    initClientesModule,
    initPedidosModule,
    initDashboardModule,
    initTelemetriaModule,
    initRuntimeLoadingModule,
    initUxWorkflowsModule,
    initAuthSetupModule,
    initNavigationModule,
    initFiliaisAcessosModule,
    initNotificacoesModule
  },
  deps: {
    renderCotLogs,
    renderProdMet,
    renderProdutos,
    calcSaldos,
    setFlowStep,
    refreshMovSel,
    refreshProdSel,
    refreshCliDL,
    calcSaldosMulti,
    pageAtual,
    getNotificacoesResumo,
    ir,
    abrirNovaCampanhaTracked,
    limparFormPedTracked,
    abrirModal,
    fmt,
    limparFormCliTracked,
    limparFormProdTracked,
    resetMov,
    abrirSyncJogos,
    filterSidebarNav,
    resetRuntimeData,
    showLoading,
    mostrarTela,
    buildSkeletonLines,
    carregarDadosFilial,
    renderFornSel,
    refreshMovSel,
    refreshDestSel,
    renderDashFilSel,
    renderDash,
    atualizarBadgeEst,
    updateNotiBadge,
    cores: CORES,
    hasRole,
    canAccessPage,
    getFirstAllowedPage,
    scheduleRoleUiGuards,
    startPrimaryActionTracking,
    completePrimaryActionTracking,
    markConsistencyPage,
    renderMetasNegocio,
    renderCliMet,
    renderClientes,
    renderPedMet,
    renderPedidos,
    renderCotForns,
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
    gerarFilaCampanhaTracked,
    exportCSV,
    cotLock,
    voltarSetup,
    limparFormFilial,
    resolverTodasNotificacoesTracked,
    refreshCampanhasTela,
    executarAuditoriaVisual,
    roleManagerPlus: ROLE_MANAGER_PLUS,
    roleAdminOnly: ROLE_ADMIN_ONLY,
    requireRole,
    renderSetup,
    entrar,
    appRoles: APP_ROLES,
    registerNotificationKpi,
    logStrategicAction
  }
});

startApplicationRuntime({
  appContext: AppContext,
  registry: AppModules,
  deps: {
    initDomBindings: () => initDomBindings({
      abrirModal,
      fecharModal,
      selFilial,
      authEntrar,
      criarPrimeiraFilial,
      limparFormFilial,
      entrar,
      fecharSb,
      voltarSetup,
      ir,
      exportarTudo,
      sairConta,
      renderDash,
      setP,
      limparFormPedTracked,
      abrirSyncJogos,
      abrirNovoJogo,
      renderMetasNegocio,
      resetUxKpis,
      limparFormProdTracked,
      renderProdutos,
      exportCSV,
      limparFormCliTracked,
      switchTab,
      renderCliSegs,
      renderClientes,
      renderPedidos,
      renderCotForns,
      renderCotTabela,
      cotFile,
      cotLock,
      resetMov,
      renderEstPosicao,
      renderEstHist,
      abrirNovaCampanhaTracked,
      removerJogoDashboardGuard,
      abrirMovProd,
      editarProd,
      removerProdGuard,
      excluirMovGuard,
      refreshCampanhasTela,
      renderAcessosAdmin,
      salvarPerfilAcesso,
      removerPerfilAcesso,
      vincularUsuarioFilial,
      desvincularUsuarioFilial,
      renderAcessosPerfis,
      renderAcessosVinculos,
      renderAcessosAuditoria,
      changeAcessosPage,
      preencherPerfilAcesso,
      preencherVinculoAcesso,
      renderNotificacoes,
      executarNotificacao,
      resolverNotificacao,
      reabrirNotificacao,
      resolverTodasNotificacoesTracked,
      abrirSb,
      salvarFilial,
      editarFilial,
      removerFilial,
      trocarFilial,
      setFlowStep,
      calcProdPreview,
      syncV,
      syncA,
      salvarProdutoTracked,
      refreshProdSel,
      editarCli,
      removerCliGuard,
      abrirCliDet,
      addNota,
      salvarClienteTracked,
      addItem,
      editarPed,
      removerPedGuard,
      verPed,
      remItem,
      renderItens,
      salvarPedidoTracked,
      salvarCampanhaTracked,
      carregarCampanhas,
      carregarCampanhaEnvios,
      adotarCampanhasParaFilialAtiva,
      editarCampanha,
      removerCampanhaGuard,
      renderCampanhas,
      gerarFilaCampanhaTracked,
      renderFilaWhatsApp,
      renderCampanhaEnvios,
      abrirWhatsAppEnvio,
      marcarEnvioEnviadoGuard,
      marcarEnvioFalhouGuard,
      salvarJogoDashboardGuard,
      usarExemploSyncJogos,
      sincronizarJogosDashboardGuard,
      salvarForn,
      remFornGuard,
      confirmarMapa,
      renderMapaBody,
      renderCotLogs,
      updPreco,
      setTipo,
      movLoadProd,
      movCalc,
      movCalcAjuste,
      salvarMov,
      setFiltroNotificacoes,
      executarAcaoGerencial
    }),
    initGoalTracking,
    initQuickCommand,
    initSidebarEnhancements,
    initFlowWizards,
    startRoleUiObserver,
    scheduleRoleUiGuards,
    renderSetup
  }
});

