// @ts-check

/**
 * @typedef {{
 *   register(def: { name: string, init: (app: unknown) => unknown }): void
 *   initAll(app: unknown): Promise<void>
 * }} ModuleRegistryLike
 */

/**
 * @typedef {{
 *   initCotacaoModule: (deps?: Record<string, unknown>) => unknown
 *   initProdutosModule: (deps?: Record<string, unknown>) => unknown
 *   initPedidosModule: (deps?: Record<string, unknown>) => unknown
 *   initTelemetriaModule: (deps?: Record<string, unknown>) => unknown
 *   initRuntimeLoadingModule: (deps?: Record<string, unknown>) => unknown
 *   initUxWorkflowsModule: (deps?: Record<string, unknown>) => unknown
 *   initAuthSetupModule: (deps?: Record<string, unknown>) => unknown
 *   initNavigationModule: (deps?: Record<string, unknown>) => unknown
 *   initFiliaisAcessosModule: (deps?: Record<string, unknown>) => unknown
 *   initNotificacoesModule: (deps?: Record<string, unknown>) => unknown
 * }} BootRuntimeModules
 */

/**
 * @typedef {{
 *   renderCotLogs: () => void
 *   renderProdMet: () => void
 *   renderProdutos: () => void
 *   calcSaldos: () => Record<string, { saldo?: number, cm?: number }>
 *   setFlowStep: (...args: any[]) => void
 *   refreshMovSel: () => void
 *   calcSaldosMulti: (...args: any[]) => Record<string, { saldo?: number, cm?: number }>
 *   pageAtual: () => string
 *   getNotificacoesResumo: () => unknown
 *   ir: (page: string) => void
 *   abrirNovaCampanhaTracked: () => void
 *   abrirModal: (id: string) => void
 *   fmt: (value: unknown) => string
 *   limparFormPedTracked: () => void
 *   limparFormProdTracked: () => void
 *   resetMov: () => void
 *   filterSidebarNav: (query?: string) => void
 *   resetRuntimeData: () => void
 *   showLoading: (on: boolean) => void
 *   mostrarTela: (id: string) => void
 *   buildSkeletonLines: (count?: number) => string
 *   carregarDadosFilial: (filialId: string) => Promise<void>
 *   refreshProdSel: () => void
 *   refreshRcaSelectors: () => void
 *   renderFornSel: () => void
 *   refreshDestSel: () => void
 *   atualizarBadgeEst: () => void
 *   updateNotiBadge: () => void
 *   cores: string[]
 *   hasRole: (roles?: string[]) => boolean
 *   canAccessPage: (page: string) => boolean
 *   getFirstAllowedPage: (fallback?: string) => string
 *   scheduleRoleUiGuards: () => void
 *   startPrimaryActionTracking: (page: string) => void
 *   completePrimaryActionTracking: (page: string) => void
 *   markConsistencyPage: (page: string) => void
 *   renderMetasNegocio: () => void
 *   renderRelatorios: () => void
 *   abrirNovoClienteReact?: () => void
 *   limparFiltrosClienteReact?: () => void
 *   abrirListaClienteReact?: () => void
 *   abrirSegmentosClienteReact?: () => void
 *   editarClienteReactAtual?: () => void
 *   exportarClientesReactCsv?: () => void
 *   abrirResumoClienteReact?: () => void
 *   abrirAbertasClienteReact?: () => void
 *   abrirFechadasClienteReact?: () => void
 *   abrirNotasClienteReact?: () => void
 *   abrirFidelidadeClienteReact?: () => void
 *   renderContasReceberMet?: () => void
 *   renderContasReceber?: () => void
 *   renderCotForns: () => void
 *   renderCotTabela: () => void
 *   renderEstAlerts: () => void
 *   renderEstPosicao: () => void
 *   renderEstHist: () => void
 *   renderCampanhasMet: () => void
 *   renderCampanhas: () => void
 *   renderFilaWhatsApp: () => void
 *   renderCampanhaEnvios: () => void
 *   renderFilMet: () => void
 *   renderFilLista: () => void
 *   renderAcessosAdmin: () => void
 *   renderNotificacoes: () => void
 *   abrirModalRca: (targetId?: string | null) => void
 *   salvarRca: () => void | Promise<void>
 *   gerarFilaCampanhaTracked: (id: string) => void | Promise<void>
 *   exportCSV: (tipo: string) => void
 *   cotLock: () => void
 *   voltarSetup: () => void
 *   limparFormFilial: () => void
 *   resolverTodasNotificacoesTracked: () => void
 *   refreshCampanhasTela: () => void
 *   executarAuditoriaVisual: () => void
 *   roleManagerPlus: string[]
 *   roleAdminOnly: string[]
 *   requireRole: (allowedRoles?: string[], denyMessage?: string) => boolean
 *   renderSetup: () => Promise<void>
 *   entrar: () => Promise<void>
 *   appRoles: string[]
 *   registerNotificationKpi: (metric: string, delta?: number) => void
 *   logStrategicAction: (context: string) => void
 * }} RegisterBootRuntimeDeps
 */

/**
 * @typedef {{
 *   registry: ModuleRegistryLike
 *   modules: BootRuntimeModules
 *   deps: RegisterBootRuntimeDeps
 * }} RegisterModulesOptions
 */

/**
 * @typedef {{
 *   appContext: unknown
 *   registry: ModuleRegistryLike
 *   deps: {
 *     initDomBindings: () => void
 *     initTheme: () => void
 *     initGlobalMicroInteractions: () => void
 *     initGoalTracking: () => void
 *     initQuickCommand: () => void
 *     initSidebarEnhancements: () => void
 *     initFlowWizards: () => void
 *     startRoleUiObserver: () => void
 *     scheduleRoleUiGuards: () => void
 *     renderSetup: () => Promise<void>
 *   }
 * }} StartRuntimeOptions
 */

/**
 * @param {RegisterModulesOptions} options
 */
export function registerApplicationModules({ registry, modules, deps }) {
  registry.register({
    name: 'cotacao',
    init() {
      modules.initCotacaoModule({
        renderCotLogs: deps.renderCotLogs,
        renderProdMet: deps.renderProdMet,
        renderProdutos: deps.renderProdutos
      });
    }
  });

  registry.register({
    name: 'produtos',
    init() {
      modules.initProdutosModule({
        calcSaldos: deps.calcSaldos,
        setFlowStep: deps.setFlowStep,
        refreshMovSel: deps.refreshMovSel
      });
    }
  });

  registry.register({
    name: 'pedidos',
    init() {
      modules.initPedidosModule({
        refreshProdSel: deps.refreshProdSel
      });
    }
  });

  registry.register({
    name: 'telemetria',
    init() {
      modules.initTelemetriaModule({
        pageAtual: deps.pageAtual,
        getNotificacoesResumo: deps.getNotificacoesResumo,
        ir: deps.ir,
        abrirNovaCampanhaTracked: deps.abrirNovaCampanhaTracked,
        limparFormPedTracked: deps.limparFormPedTracked,
        abrirModal: deps.abrirModal,
        fmt: deps.fmt,
        onMetricsReset: () => deps.renderMetasNegocio()
      });
    }
  });

  registry.register({
    name: 'runtime-loading',
    init() {
      modules.initRuntimeLoadingModule();
    }
  });

  registry.register({
    name: 'ux-workflows',
    init() {
      modules.initUxWorkflowsModule({
        ir: deps.ir,
        limparFormPedTracked: deps.limparFormPedTracked,
        limparFormProdTracked: deps.limparFormProdTracked,
        abrirNovaCampanhaTracked: deps.abrirNovaCampanhaTracked,
        abrirModal: deps.abrirModal,
        resetMov: deps.resetMov
      });
    }
  });

  registry.register({
    name: 'auth-setup',
    init() {
      modules.initAuthSetupModule({
        pageAtual: deps.pageAtual,
        ir: deps.ir,
        filterSidebarNav: deps.filterSidebarNav,
        resetRuntimeData: deps.resetRuntimeData,
        showLoading: deps.showLoading,
        mostrarTela: deps.mostrarTela,
        buildSkeletonLines: deps.buildSkeletonLines,
        carregarDadosFilial: deps.carregarDadosFilial,
        refreshProdSel: deps.refreshProdSel,
        renderFornSel: deps.renderFornSel,
        refreshMovSel: deps.refreshMovSel,
        refreshDestSel: deps.refreshDestSel,
        atualizarBadgeEst: deps.atualizarBadgeEst,
        updateNotiBadge: deps.updateNotiBadge,
        cores: deps.cores
      });
    }
  });

  registry.register({
    name: 'navigation',
    init() {
      modules.initNavigationModule({
        hasRole: deps.hasRole,
        canAccessPage: deps.canAccessPage,
        getFirstAllowedPage: deps.getFirstAllowedPage,
        scheduleRoleUiGuards: deps.scheduleRoleUiGuards,
        startPrimaryActionTracking: deps.startPrimaryActionTracking,
        completePrimaryActionTracking: deps.completePrimaryActionTracking,
        markConsistencyPage: deps.markConsistencyPage,
        updateNotiBadge: deps.updateNotiBadge,
        renderMetasNegocio: deps.renderMetasNegocio,
        renderRelatorios: deps.renderRelatorios,
        renderProdMet: deps.renderProdMet,
        renderProdutos: deps.renderProdutos,
        renderFornSel: deps.renderFornSel,
        renderCotForns: deps.renderCotForns,
        renderCotLogs: deps.renderCotLogs,
        renderCotTabela: deps.renderCotTabela,
        renderEstAlerts: deps.renderEstAlerts,
        renderEstPosicao: deps.renderEstPosicao,
        renderEstHist: deps.renderEstHist,
        renderCampanhasMet: deps.renderCampanhasMet,
        renderCampanhas: deps.renderCampanhas,
        renderFilaWhatsApp: deps.renderFilaWhatsApp,
        renderCampanhaEnvios: deps.renderCampanhaEnvios,
        renderFilMet: deps.renderFilMet,
        renderFilLista: deps.renderFilLista,
        renderAcessosAdmin: deps.renderAcessosAdmin,
        renderNotificacoes: deps.renderNotificacoes,
        limparFormPedTracked: deps.limparFormPedTracked,
        limparFormProdTracked: deps.limparFormProdTracked,
        abrirNovaCampanhaTracked: deps.abrirNovaCampanhaTracked,
        gerarFilaCampanhaTracked: deps.gerarFilaCampanhaTracked,
        abrirModal: deps.abrirModal,
        exportCSV: deps.exportCSV,
        resetMov: deps.resetMov,
        cotLock: deps.cotLock,
        voltarSetup: deps.voltarSetup,
        limparFormFilial: deps.limparFormFilial,
        resolverTodasNotificacoesTracked: deps.resolverTodasNotificacoesTracked,
        refreshCampanhasTela: deps.refreshCampanhasTela,
        executarAuditoriaVisual: deps.executarAuditoriaVisual,
        roleManagerPlus: deps.roleManagerPlus,
        roleAdminOnly: deps.roleAdminOnly
      });
    }
  });

  registry.register({
    name: 'filiais-acessos',
    init() {
      modules.initFiliaisAcessosModule({
        requireRole: deps.requireRole,
        renderSetup: deps.renderSetup,
        entrar: deps.entrar,
        scheduleRoleUiGuards: deps.scheduleRoleUiGuards,
        roleAdminOnly: deps.roleAdminOnly,
        appRoles: deps.appRoles,
        cores: deps.cores
      });
    }
  });

  registry.register({
    name: 'notificacoes',
    init() {
      modules.initNotificacoesModule({
        calcSaldos: deps.calcSaldos,
        ir: deps.ir,
        renderMetasNegocio: deps.renderMetasNegocio,
        registerNotificationKpi: deps.registerNotificationKpi,
        logStrategicAction: deps.logStrategicAction
      });
    }
  });
}

/**
 * @param {StartRuntimeOptions} options
 */
export function startApplicationRuntime({ appContext, registry, deps }) {
  async function bootstrapApplication() {
    await registry.initAll(appContext);
  }

  const start = async () => {
    try {
      await bootstrapApplication();
    } catch (e) {
      console.error('Falha no bootstrap da aplicacao:', e);
      return;
    }

    deps.initDomBindings();
    deps.initTheme();
    deps.initGlobalMicroInteractions();
    deps.initGoalTracking();
    deps.initQuickCommand();
    deps.initSidebarEnhancements();
    deps.initFlowWizards();
    deps.startRoleUiObserver();
    deps.scheduleRoleUiGuards();
    deps.renderSetup();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
    return;
  }

  start();
}
