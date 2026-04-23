// @ts-check

/** @typedef {import('../types/domain').Campanha} Campanha */
/** @typedef {import('../types/domain').Pedido} Pedido */
/** @typedef {import('../types/domain').PedidoItem} PedidoItem */
/** @typedef {import('../types/domain').Produto} Produto */
/** @typedef {import('../types/domain').Cliente} Cliente */
/** @typedef {import('../types/domain').Fornecedor} Fornecedor */
/** @typedef {import('../types/domain').AppCache} AppCache */

import { SB } from './api.js';
import { D, State, P, C, PD } from './store.js';
import { createAppContext } from '../shared/app-context.js';
import { createModuleRegistry } from '../shared/module-registry.js';
import { getRenderMetrics, resetRenderMetrics } from '../shared/render-metrics.js';

import {
  toast,
  abrirModal,
  fecharModal,
  initGlobalMicroInteractions,
  fmt,
  fmtN,
  mk2mg,
  prV
} from '../shared/utils.js';

// Cotação legado removido — Fase 2C
const initCotacaoModule = () => {};
const renderFornSel = () => {};
const renderCotLogs = () => {};
const renderCotForns = () => {};
const renderCotTabela = () => {};
const salvarForn = () => {};
const remForn = () => {};
const cotLock = () => {};
const updPreco = () => {};
const cotFile = () => {};
const confirmarMapa = () => {};
const renderMapaBody = () => {};

import {
  abrirNovoProdutoReact,
  isProdutosReactPilotActive as _isProdutosReactPilotActive
} from '../features/produtos-react-bridge.js';

// Produto legado removido — Fase 2A
const renderProdMet = () => {};
const renderProdutos = () => {};
const refreshProdSel = () => {};

import {
  abrirNovoClienteReact,
  limparFiltrosClienteReact,
  abrirListaClienteReact,
  abrirSegmentosClienteReact,
  editarClienteReactAtual,
  exportarClientesReactCsv,
  abrirResumoClienteReact,
  abrirAbertasClienteReact,
  abrirFechadasClienteReact,
  abrirNotasClienteReact,
  abrirFidelidadeClienteReact
} from '../features/clientes-react-bridge.js';
import {
  isPedidosReactPilotActive,
  limparFiltrosPedidosReact,
  abrirNovoPedidoReact,
  editarPedidoReact,
  abrirDetalhePedidoReact
} from '../features/pedidos-react-bridge.js';
import { setContasReceberReactTab } from '../features/contas-receber-react-bridge.js';

import { initPedidosModule } from '../features/pedidos.js';

// RCAs legado removido — Fase 2D
const refreshRcaSelectors = () => {};
const abrirModalRca = () => {};
const salvarRca = () => {};

// Estoque legado removido — Fase 2B
const calcSaldos = () => ({});
const calcSaldosMulti = () => {};
const atualizarBadgeEst = () => {};
const renderEstAlerts = () => {};
const renderEstPosicao = () => {};
const renderEstHist = () => {};
const refreshMovSel = () => {};
const refreshDestSel = () => {};
const resetMov = () => {};
const abrirMovProd = () => {};
const setTipo = () => {};
const movLoadProd = () => {};
const movCalc = () => {};
const movCalcAjuste = () => {};
const salvarMov = () => {};
const excluirMov = () => {};

// Relatórios legado removido — Fase 2E
const renderRelatorios = () => {};
const abrirValidacaoOportunidade = () => {};
const salvarValidacaoOportunidade = () => {};

import {
  carregarCampanhas,
  carregarCampanhaEnvios,
  refreshCampanhasTela,
  abrirNovaCampanha,
  adotarCampanhasParaFilialAtiva,
  editarCampanha,
  abrirCampanhaDet,
  salvarCampanha,
  removerCampanha,
  renderCampanhasMet,
  renderCampanhas,
  renderCampanhaPreview,
  gerarFilaCampanha,
  renderFilaWhatsApp,
  renderCampanhaEnvios,
  toggleEnvioFilaSelecionado,
  toggleSelecionarTodosFilaWhatsApp,
  abrirPreviewWhatsAppEnvio,
  abrirWhatsAppPreviewAtual,
  abrirWhatsAppEnvio,
  copiarNumeroPreviewAtual,
  copiarMensagemPreviewAtual,
  abrirWhatsAppLote,
  proximoEnvioLoteWhatsApp,
  marcarEnvioEnviado,
  marcarEnvioFalhou,
  marcarSelecionadosEnviados,
  desfazerStatusEnvio,
  marcarSelecionadosFalhou
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
  renderAcessosPerfis,
  renderAcessosVinculos,
  renderAcessosAuditoria,
  changeAcessosPage,
  preencherPerfilAcesso,
  preencherVinculoAcesso,
  resolverPerfilAcessoRef,
  resolverVinculoAcessoRef,
  renderAcessosAdmin,
  resolverConviteAcessoEmail,
  convidarUsuarioAcesso,
  reenviarConviteUsuarioAcesso,
  salvarPerfilAcesso,
  removerPerfilAcesso,
  vincularUsuarioFilial,
  desvincularUsuarioFilial
} from '../features/filiais-acessos.js';

import {
  initNavigationModule,
  initTheme,
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

import { registerApplicationModules, startApplicationRuntime } from '../features/boot-runtime.js';

import { initDomBindings } from '../features/dom-bindings.js';

import { configureErrorHandler } from '../core/errors/error-handler.js';
import { notify } from '../shared/utils.js';

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
  resetRenderMetrics,
  logRenderMetrics(page) {
    const metrics = page ? getRenderMetrics(page) : getRenderMetrics();
    const rows = Array.isArray(metrics) ? metrics : metrics ? [metrics] : [];
    const flat = rows.flatMap((entry) =>
      Object.entries(entry.durations || {}).map(([area, stats]) => ({
        page: entry.page,
        area,
        count: stats.count,
        lastMs: Number(stats.last || 0).toFixed(1),
        avgMs: Number(stats.count ? stats.total / stats.count : 0).toFixed(1),
        maxMs: Number(stats.max || 0).toFixed(1)
      }))
    );
    flat.sort((a, b) => Number(b.maxMs) - Number(a.maxMs));
    console.table(flat);
    return flat;
  }
});

/**
 * @param {Pedido['itens']} itens
 * @returns {PedidoItem[]}
 */
function asPedidoItens(itens) {
  return Array.isArray(itens) ? itens : [];
}

function resetRuntimeData() {
  D.filiais = [];
  D.produtos = {};
  D.clientes = {};
  D.pedidos = {};
  D.rcas = {};
  D.fornecedores = {};
  D.cotPrecos = {};
  D.cotConfig = {};
  D.movs = {};
  D.jogos = {};
  D.campanhas = {};
  D.campanhaEnvios = {};
  D.notas = {};
  D.contasReceber = {};
  D.contasReceberBaixas = {};
  D.userPerfis = [];
  D.userFiliais = [];
  D.acessosAudit = [];
  D.accessUsers = [];

  State.FIL = null;
  localStorage.removeItem('sc_filial_id'); // Limpa filial dos bridges React ao sair
  State.selFil = null;
  State.user = null;
  State.userRole = 'operador';
  State.acPagePerfis = 1;
  State.acPageVinculos = 1;
  State.acPageAuditoria = 1;
  State.editIds = {};
  State.pedItens = [];
}

function limparFormPedTracked() {
  startCriticalTask('pedido');
  return abrirNovoPedidoReact();
}
function limparFormProdTracked() {
  startCriticalTask('produto');
  abrirNovoProdutoReact();
}
function abrirNovaCampanhaTracked() {
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode criar campanha.')) return;
  startCriticalTask('campanha');
  logStrategicAction('campanhas');
  return abrirNovaCampanha();
}
async function salvarProdutoTracked() {
  // Handled by React — legacy path removed in Phase 2A
  renderMetasNegocio();
}
async function salvarCampanhaTracked() {
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode salvar campanha.')) return;
  if (State.editIds?.campanha) registerJourneyRework('campanha');
  await salvarCampanha();
  const open = document.getElementById('modal-campanha')?.classList.contains('on');
  if (!open) {
    completeCriticalTask('campanha');
    logStrategicAction('campanhas');
  }
  renderMetasNegocio();
}
async function gerarFilaCampanhaTracked(id) {
  if (!requireRole(ROLE_MANAGER_PLUS, 'Somente gerente/admin pode gerar fila de campanha.')) return;
  logStrategicAction('campanhas');
  await gerarFilaCampanha(id);
  renderMetasNegocio();
}

function resolverTodasNotificacoesTracked() {
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
      [
        'Nome',
        'SKU',
        'Un',
        'Categoria',
        'Custo',
        'Mk Varejo%',
        'Mg Varejo%',
        'Preço Varejo',
        'Mk Atacado%',
        'Preço Atacado',
        'Est. Min',
        'Saldo Atual'
      ],
      ...P().map((p) => {
        const pv = prV(p.custo, p.mkv);
        const pa = p.pfa > 0 ? p.pfa : p.mka > 0 ? prV(p.custo, p.mka) : 0;
        const s = saldos[p.id] || { saldo: 0 };
        return [
          p.nome,
          p.sku || '',
          p.un,
          p.cat || '',
          fmtN(p.custo),
          fmtN(p.mkv),
          fmtN(mk2mg(p.mkv)),
          fmtN(pv),
          fmtN(p.mka),
          pa > 0 ? fmtN(pa) : '',
          p.emin || '',
          fmtN(s.saldo)
        ];
      })
    ];
  } else if (tipo === 'clientes') {
    name = 'clientes';
    rows = [
      [
        'Nome',
        'Apelido',
        'CPF/CNPJ',
        'Tipo',
        'Status',
        'Telefone',
        'Email',
        'Time',
        'Segmento',
        'Tabela',
        'Prazo',
        'Cidade',
        'WhatsApp',
        'Aniversário'
      ],
      ...C().map((c) => [
        c.nome,
        c.apelido || '',
        c.doc || '',
        c.tipo,
        c.status,
        c.tel || '',
        c.email || '',
        c.time || '',
        c.seg || '',
        c.tab,
        c.prazo,
        c.cidade || '',
        c.whatsapp || '',
        c.data_aniversario || ''
      ])
    ];
  } else if (tipo === 'pedidos') {
    name = 'pedidos';
    rows = [
      ['Nº', 'Cliente', 'Data', 'Status', 'Tipo', 'Pagamento', 'Prazo', 'Total', 'Lucro', 'Obs'],
      ...PD().map((p) => {
        const lucro = asPedidoItens(p.itens).reduce((a, i) => a + (i.preco - i.custo) * i.qty, 0);
        return [
          p.num,
          p.cli,
          p.data,
          p.status,
          p.tipo,
          p.pgto,
          p.prazo,
          fmtN(p.total),
          fmtN(lucro),
          p.obs || ''
        ];
      })
    ];
  } else if (tipo === 'campanhas') {
    name = 'campanhas';
    const campanhas = D.campanhas?.[State.FIL] || [];
    rows = [
      ['Nome', 'Tipo', 'Canal', 'Antecedência', 'Assunto', 'Cupom', 'Desconto', 'Ativo'],
      ...campanhas.map((c) => [
        c.nome,
        c.tipo,
        c.canal,
        c.dias_antecedencia || 0,
        c.assunto || '',
        c.cupom || '',
        c.desconto || 0,
        c.ativo ? 'Sim' : 'Não'
      ])
    ];
  }

  if (!rows.length) {
    toast('Sem dados para exportar.');
    return;
  }

  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.csv';
  a.click();
  toast('CSV exportado!');
}

function exportarTudo() {
  ['produtos', 'clientes', 'pedidos', 'campanhas'].forEach((t, i) =>
    setTimeout(() => exportCSV(t), i * 200)
  );
}

const removerProdGuard = () => {};
const remFornGuard = () => {};
const excluirMovGuard = buildRoleGuard(
  excluirMov,
  ROLE_MANAGER_PLUS,
  'Somente gerente/admin pode excluir movimentação.'
);
const removerCampanhaGuard = buildRoleGuard(
  removerCampanha,
  ROLE_MANAGER_PLUS,
  'Somente gerente/admin pode remover campanha.'
);
const marcarEnvioEnviadoGuard = buildRoleGuard(
  marcarEnvioEnviado,
  ROLE_MANAGER_PLUS,
  'Somente gerente/admin pode alterar envio.'
);
const marcarEnvioFalhouGuard = buildRoleGuard(
  marcarEnvioFalhou,
  ROLE_MANAGER_PLUS,
  'Somente gerente/admin pode alterar envio.'
);
const marcarSelecionadosEnviadosGuard = buildRoleGuard(
  marcarSelecionadosEnviados,
  ROLE_MANAGER_PLUS,
  'Somente gerente/admin pode alterar envios.'
);
const marcarSelecionadosFalhouGuard = buildRoleGuard(
  marcarSelecionadosFalhou,
  ROLE_MANAGER_PLUS,
  'Somente gerente/admin pode alterar envios.'
);
const desfazerStatusEnvioGuard = buildRoleGuard(
  desfazerStatusEnvio,
  ROLE_MANAGER_PLUS,
  'Somente gerente/admin pode alterar envios.'
);

// ── Centralised error handling ────────────────────────────────────────────────
configureErrorHandler({ notify });

registerApplicationModules({
  registry: AppModules,
  modules: {
    initCotacaoModule,
    initPedidosModule,
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
    refreshProdSel,
    refreshRcaSelectors,
    calcSaldosMulti,
    pageAtual,
    getNotificacoesResumo,
    ir,
    abrirNovaCampanhaTracked,
    abrirModal,
    fmt,
    limparFormPedTracked,
    limparFormProdTracked,
    resetMov,
    filterSidebarNav,
    resetRuntimeData,
    showLoading,
    mostrarTela,
    buildSkeletonLines,
    carregarDadosFilial,
    renderFornSel,
    refreshMovSel,
    refreshDestSel,
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
    renderRelatorios,
    abrirNovoClienteReact,
    limparFiltrosClienteReact,
    abrirListaClienteReact,
    abrirSegmentosClienteReact,
    editarClienteReactAtual,
    exportarClientesReactCsv,
    abrirResumoClienteReact,
    abrirAbertasClienteReact,
    abrirFechadasClienteReact,
    abrirNotasClienteReact,
    abrirFidelidadeClienteReact,
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
    logStrategicAction,
    abrirModalRca,
    salvarRca
  }
});

startApplicationRuntime({
  appContext: AppContext,
  registry: AppModules,
  deps: {
    initDomBindings: () =>
      initDomBindings({
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
        renderMetasNegocio,
        renderRelatorios,
        resetUxKpis,
        limparFormProdTracked,
        renderProdutos,
        exportCSV,
        switchTab,
        abrirNovoClienteReact,
        limparFiltrosClienteReact,
        abrirListaClienteReact,
        abrirSegmentosClienteReact,
        editarClienteReactAtual,
        exportarClientesReactCsv,
        abrirResumoClienteReact,
        abrirAbertasClienteReact,
        abrirFechadasClienteReact,
        abrirNotasClienteReact,
        abrirFidelidadeClienteReact,
        isPedidosReactPilotActive,
        limparFiltrosPedidosReact,
        abrirNovoPedidoReact,
        editarPedidoReact,
        abrirDetalhePedidoReact,
        setContasReceberReactTab,
        renderCotForns,
        renderCotTabela,
        cotFile,
        cotLock,
        resetMov,
        renderEstPosicao,
        renderEstHist,
        abrirNovaCampanhaTracked,
        abrirMovProd,
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
        resolverPerfilAcessoRef,
        resolverVinculoAcessoRef,
        resolverConviteAcessoEmail,
        convidarUsuarioAcesso,
        reenviarConviteUsuarioAcesso,
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
        salvarProdutoTracked,
        refreshRcaSelectors,
        abrirModalRca,
        salvarRca,
        salvarCampanhaTracked,
        carregarCampanhas: () => {
          void carregarCampanhas();
        },
        carregarCampanhaEnvios: () => {
          void carregarCampanhaEnvios();
        },
        adotarCampanhasParaFilialAtiva: () => {
          void adotarCampanhasParaFilialAtiva();
        },
        editarCampanha,
        abrirCampanhaDet,
        removerCampanhaGuard,
        renderCampanhas,
        renderCampanhaPreview,
        gerarFilaCampanhaTracked,
        renderFilaWhatsApp,
        renderCampanhaEnvios,
        toggleEnvioFilaSelecionado,
        toggleSelecionarTodosFilaWhatsApp,
        abrirPreviewWhatsAppEnvio,
        abrirWhatsAppPreviewAtual,
        abrirWhatsAppEnvio,
        copiarNumeroPreviewAtual,
        copiarMensagemPreviewAtual,
        abrirWhatsAppLote,
        proximoEnvioLoteWhatsApp,
        marcarEnvioEnviadoGuard,
        marcarEnvioFalhouGuard,
        marcarSelecionadosEnviadosGuard,
        marcarSelecionadosFalhouGuard,
        desfazerStatusEnvio: desfazerStatusEnvioGuard,
        abrirValidacaoOportunidade,
        salvarValidacaoOportunidade,
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
    initTheme,
    initGlobalMicroInteractions,
    initGoalTracking,
    initQuickCommand,
    initSidebarEnhancements,
    initFlowWizards,
    startRoleUiObserver,
    scheduleRoleUiGuards,
    renderSetup
  }
});
