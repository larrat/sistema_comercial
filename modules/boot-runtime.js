export function registerApplicationModules({ registry, modules, deps }){
  registry.register({
    name: 'cotacao',
    init(){
      modules.initCotacaoModule({
        renderCotLogs: deps.renderCotLogs,
        renderProdMet: deps.renderProdMet,
        renderProdutos: deps.renderProdutos
      });
    }
  });

  registry.register({
    name: 'produtos',
    init(){
      modules.initProdutosModule({
        calcSaldos: deps.calcSaldos,
        setFlowStep: deps.setFlowStep,
        refreshMovSel: deps.refreshMovSel
      });
    }
  });

  registry.register({
    name: 'clientes',
    init(){
      modules.initClientesModule({
        setFlowStep: deps.setFlowStep
      });
    }
  });

  registry.register({
    name: 'pedidos',
    init(){
      modules.initPedidosModule({
        refreshProdSel: deps.refreshProdSel,
        refreshCliDL: deps.refreshCliDL
      });
    }
  });

  registry.register({
    name: 'dashboard',
    init(){
      modules.initDashboardModule({
        calcSaldosMulti: deps.calcSaldosMulti
      });
    }
  });

  registry.register({
    name: 'telemetria',
    init(){
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
    init(){
      modules.initRuntimeLoadingModule();
    }
  });

  registry.register({
    name: 'ux-workflows',
    init(){
      modules.initUxWorkflowsModule({
        ir: deps.ir,
        limparFormPedTracked: deps.limparFormPedTracked,
        limparFormCliTracked: deps.limparFormCliTracked,
        limparFormProdTracked: deps.limparFormProdTracked,
        abrirNovaCampanhaTracked: deps.abrirNovaCampanhaTracked,
        abrirModal: deps.abrirModal,
        resetMov: deps.resetMov,
        abrirSyncJogos: deps.abrirSyncJogos
      });
    }
  });

  registry.register({
    name: 'auth-setup',
    init(){
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
        refreshCliDL: deps.refreshCliDL,
        renderFornSel: deps.renderFornSel,
        refreshMovSel: deps.refreshMovSel,
        refreshDestSel: deps.refreshDestSel,
        renderDashFilSel: deps.renderDashFilSel,
        renderDash: deps.renderDash,
        atualizarBadgeEst: deps.atualizarBadgeEst,
        updateNotiBadge: deps.updateNotiBadge,
        cores: deps.cores
      });
    }
  });

  registry.register({
    name: 'navigation',
    init(){
      modules.initNavigationModule({
        hasRole: deps.hasRole,
        canAccessPage: deps.canAccessPage,
        getFirstAllowedPage: deps.getFirstAllowedPage,
        scheduleRoleUiGuards: deps.scheduleRoleUiGuards,
        startPrimaryActionTracking: deps.startPrimaryActionTracking,
        completePrimaryActionTracking: deps.completePrimaryActionTracking,
        markConsistencyPage: deps.markConsistencyPage,
        updateNotiBadge: deps.updateNotiBadge,
        renderDash: deps.renderDash,
        renderMetasNegocio: deps.renderMetasNegocio,
        renderProdMet: deps.renderProdMet,
        renderProdutos: deps.renderProdutos,
        renderCliMet: deps.renderCliMet,
        renderClientes: deps.renderClientes,
        renderPedMet: deps.renderPedMet,
        renderPedidos: deps.renderPedidos,
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
        limparFormCliTracked: deps.limparFormCliTracked,
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
    init(){
      modules.initFiliaisAcessosModule({
        requireRole: deps.requireRole,
        renderSetup: deps.renderSetup,
        entrar: deps.entrar,
        renderDashFilSel: deps.renderDashFilSel,
        scheduleRoleUiGuards: deps.scheduleRoleUiGuards,
        roleAdminOnly: deps.roleAdminOnly,
        appRoles: deps.appRoles,
        cores: deps.cores
      });
    }
  });

  registry.register({
    name: 'notificacoes',
    init(){
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

export function startApplicationRuntime({ appContext, registry, deps }){
  async function bootstrapApplication(){
    await registry.initAll(appContext);
  }

  const start = () => {
    bootstrapApplication().catch(e => console.error('Falha no bootstrap da aplicacao:', e));
    deps.initDomBindings();
    deps.initGoalTracking();
    deps.initQuickCommand();
    deps.initSidebarEnhancements();
    deps.initFlowWizards();
    deps.startRoleUiObserver();
    deps.scheduleRoleUiGuards();
    deps.renderSetup();
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
    return;
  }

  start();
}

export function bindWindowApi(api){
  Object.entries(api).forEach(([key, value]) => {
    window[key] = value;
  });
}
