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

import {
  initUxWorkflowsModule,
  executarAuditoriaVisual,
  executarAuditoriaAceite,
  initQuickCommand,
  setFlowStep,
  initFlowWizards
} from '../modules/ux-workflows.js';

import {
  initRuntimeLoadingModule,
  buildSkeletonLines,
  showLoading,
  carregarDadosFilial,
  mostrarTela
} from '../modules/runtime-loading.js';

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
  name: 'runtime-loading',
  init(){
    initRuntimeLoadingModule();
  }
});

AppModules.register({
  name: 'ux-workflows',
  init(){
    initUxWorkflowsModule({
      ir,
      limparFormPedTracked,
      limparFormCliTracked,
      limparFormProdTracked,
      abrirNovaCampanhaTracked,
      abrirModal,
      resetMov,
      abrirSyncJogos
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
