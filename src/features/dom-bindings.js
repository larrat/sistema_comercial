import { markInvalidation } from '../shared/render-metrics.js';

let deps = {};
let initialized = false;
let pendingRenderFrame = 0;
let pendingRenderNames = new Set();

const RENDER_TARGETS = {
  renderDash: { page: 'dashboard', area: 'page' },
  renderProdMet: { page: 'produtos', area: 'metrics' },
  renderProdutos: { page: 'produtos', area: 'list' },
  renderCliMet: { page: 'clientes', area: 'metrics' },
  renderClientes: { page: 'clientes', area: 'list' },
  renderEstAlerts: { page: 'estoque', area: 'alerts' },
  renderEstPosicao: { page: 'estoque', area: 'position' },
  renderEstHist: { page: 'estoque', area: 'history' }
};

function getFlowCurrentStep(flow){
  return Number(document.querySelector(`.flow-chip.on[data-flow-chip="${flow}"]`)?.dataset.step || 1);
}

function splitArgs(raw){
  const args = [];
  let current = '';
  let quote = null;
  let depth = 0;
  for(let i = 0; i < raw.length; i += 1){
    const ch = raw[i];
    if(quote){
      current += ch;
      if(ch === quote && raw[i - 1] !== '\\') quote = null;
      continue;
    }
    if(ch === '\'' || ch === '"'){
      quote = ch;
      current += ch;
      continue;
    }
    if(ch === '('){
      depth += 1;
      current += ch;
      continue;
    }
    if(ch === ')'){
      depth = Math.max(0, depth - 1);
      current += ch;
      continue;
    }
    if(ch === ',' && depth === 0){
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if(current.trim()) args.push(current.trim());
  return args;
}

function resolveArg(token, el, event){
  const trimmed = token.trim();
  if(!trimmed) return undefined;
  if((trimmed.startsWith('\'') && trimmed.endsWith('\'')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))){
    return trimmed.slice(1, -1);
  }
  if(trimmed === 'this') return el;
  if(trimmed === 'event') return event;
  if(trimmed === 'this.value') return el?.value;
  if(/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const normalized = trimmed.replace(/^\(/, '');
  const flowMatch = normalized.match(/window\.__flowSteps\?\.([a-z]+)\s*\|\|\s*1\)\s*([+-])\s*(\d+)/);
  if(flowMatch){
    const [, flow, op, deltaRaw] = flowMatch;
    const current = getFlowCurrentStep(flow);
    const delta = Number(deltaRaw);
    return op === '-' ? current - delta : current + delta;
  }
  return trimmed;
}

function getHandlerRegistry(){
  return {
    shell: {
      abrirModal: deps.abrirModal,
      fecharModal: deps.fecharModal,
      abrirSb: deps.abrirSb,
      fecharSb: deps.fecharSb,
      exportCSV: deps.exportCSV,
      exportarTudo: deps.exportarTudo
    },
    auth: {
      authEntrar: deps.authEntrar,
      criarPrimeiraFilial: deps.criarPrimeiraFilial,
      entrar: deps.entrar,
      sairConta: deps.sairConta,
      voltarSetup: deps.voltarSetup,
      selFilial: deps.selFilial
    },
    navigation: {
      ir: deps.ir,
      switchTab: deps.switchTab,
      renderMetasNegocio: deps.renderMetasNegocio,
      resetUxKpis: deps.resetUxKpis,
      executarAcaoGerencial: deps.executarAcaoGerencial
    },
    workflow: {
      setFlowStep: deps.setFlowStep,
      limparFormProd: deps.limparFormProdTracked,
      limparFormCli: deps.limparFormCliTracked,
      limparFormPed: deps.limparFormPedTracked,
      calcProdPreview: deps.calcProdPreview,
      syncV: deps.syncV,
      syncA: deps.syncA,
      syncProdFromCost: deps.syncProdFromCost
    },
    dashboard: {
      renderDash: deps.renderDash,
      setP: deps.setP,
      abrirSyncJogos: deps.abrirSyncJogos,
      abrirNovoJogo: deps.abrirNovoJogo,
      salvarJogoDashboard: deps.salvarJogoDashboardGuard,
      removerJogoDashboard: deps.removerJogoDashboardGuard,
      usarExemploSyncJogos: deps.usarExemploSyncJogos,
      sincronizarJogosDashboard: deps.sincronizarJogosDashboardGuard
    },
    relatorios: {
      renderRelatorios: deps.renderRelatorios,
      abrirValidacaoOportunidade: deps.abrirValidacaoOportunidade,
      salvarValidacaoOportunidade: deps.salvarValidacaoOportunidade
    },
    produtos: {
      renderProdutos: deps.renderProdutos,
      salvarProduto: deps.salvarProdutoTracked,
      abrirProdDet: deps.abrirProdDet,
      editarProd: deps.editarProd,
      removerProd: deps.removerProdGuard,
      refreshProdSel: deps.refreshProdSel
    },
    clientes: {
      renderClientes: deps.renderClientes,
      renderCliSegs: deps.renderCliSegs,
      salvarCliente: deps.salvarClienteTracked,
      editarCli: deps.editarCli,
      removerCli: deps.removerCliGuard,
      abrirCliDet: deps.abrirCliDet,
      addNota: deps.addNota
    },
    pedidos: {
      renderPedidos: deps.renderPedidos,
      salvarPedido: deps.salvarPedidoTracked,
      addItem: deps.addItem,
      preencherValoresItemPedido: deps.preencherValoresItemPedido,
      editarPed: deps.editarPed,
      removerPed: deps.removerPedGuard,
      verPed: deps.verPed,
      remItem: deps.remItem,
      renderItens: deps.renderItens
    },
    cotacao: {
      renderCotForns: deps.renderCotForns,
      renderCotTabela: deps.renderCotTabela,
      renderCotLogs: deps.renderCotLogs,
      cotFile: deps.cotFile,
      cotLock: deps.cotLock,
      salvarForn: deps.salvarForn,
      remForn: deps.remFornGuard,
      confirmarMapa: deps.confirmarMapa,
      renderMapaBody: deps.renderMapaBody,
      updPreco: deps.updPreco
    },
    estoque: {
      resetMov: deps.resetMov,
      renderEstPosicao: deps.renderEstPosicao,
      renderEstHist: deps.renderEstHist,
      abrirMovProd: deps.abrirMovProd,
      excluirMov: deps.excluirMovGuard,
      setTipo: deps.setTipo,
      movLoadProd: deps.movLoadProd,
      movCalc: deps.movCalc,
      movCalcAjuste: deps.movCalcAjuste,
      salvarMov: deps.salvarMov
    },
    filiais: {
      limparFormFilial: deps.limparFormFilial,
      salvarFilial: deps.salvarFilial,
      editarFilial: deps.editarFilial,
      removerFilial: deps.removerFilial,
      trocarFilial: deps.trocarFilial
    },
    acessos: {
      renderAcessosAdmin: deps.renderAcessosAdmin,
      salvarPerfilAcesso: deps.salvarPerfilAcesso,
      removerPerfilAcesso: deps.removerPerfilAcesso,
      vincularUsuarioFilial: deps.vincularUsuarioFilial,
      desvincularUsuarioFilial: deps.desvincularUsuarioFilial,
      renderAcessosPerfis: deps.renderAcessosPerfis,
      renderAcessosVinculos: deps.renderAcessosVinculos,
      renderAcessosAuditoria: deps.renderAcessosAuditoria,
      changeAcessosPage: deps.changeAcessosPage,
      preencherPerfilAcesso: deps.preencherPerfilAcesso,
      preencherVinculoAcesso: deps.preencherVinculoAcesso
    },
    campanhas: {
      abrirNovaCampanha: deps.abrirNovaCampanhaTracked,
      refreshCampanhasTela: deps.refreshCampanhasTela,
      salvarCampanha: deps.salvarCampanhaTracked,
      carregarCampanhas: deps.carregarCampanhas,
      carregarCampanhaEnvios: deps.carregarCampanhaEnvios,
      adotarCampanhasParaFilialAtiva: deps.adotarCampanhasParaFilialAtiva,
      editarCampanha: deps.editarCampanha,
      abrirCampanhaDet: deps.abrirCampanhaDet,
      removerCampanha: deps.removerCampanhaGuard,
      renderCampanhas: deps.renderCampanhas,
      renderCampanhaPreview: deps.renderCampanhaPreview,
      gerarFilaCampanha: deps.gerarFilaCampanhaTracked,
      renderFilaWhatsApp: deps.renderFilaWhatsApp,
      renderCampanhaEnvios: deps.renderCampanhaEnvios,
      toggleEnvioFilaSelecionado: deps.toggleEnvioFilaSelecionado,
      toggleSelecionarTodosFilaWhatsApp: deps.toggleSelecionarTodosFilaWhatsApp,
      abrirWhatsAppEnvio: deps.abrirWhatsAppEnvio,
      abrirWhatsAppLote: deps.abrirWhatsAppLote,
      marcarEnvioEnviado: deps.marcarEnvioEnviadoGuard,
      marcarEnvioFalhou: deps.marcarEnvioFalhouGuard,
      marcarSelecionadosEnviados: deps.marcarSelecionadosEnviadosGuard,
      marcarSelecionadosFalhou: deps.marcarSelecionadosFalhouGuard
    },
    notificacoes: {
      renderNotificacoes: deps.renderNotificacoes,
      executarNotificacao: deps.executarNotificacao,
      resolverNotificacao: deps.resolverNotificacao,
      reabrirNotificacao: deps.reabrirNotificacao,
      resolverTodasNotificacoes: deps.resolverTodasNotificacoesTracked,
      setFiltroNotificacoes: deps.setFiltroNotificacoes
    }
  };
}

function resolveHandler(name){
  const registry = getHandlerRegistry();
  return Object.values(registry)
    .map(group => group[name])
    .find(handler => typeof handler === 'function');
}

function callByName(name, args = []){
  const handler = resolveHandler(name);
  if(typeof handler === 'function'){
    handler(...args);
  }
}

function runExpression(expression, el, event){
  String(expression || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .forEach(statement => {
      const match = statement.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
      if(!match) return;
      const [, fnName, argsRaw] = match;
      const args = splitArgs(argsRaw).map(arg => resolveArg(arg, el, event));
      callByName(fnName, args);
    });
}

function flushPendingRenders(){
  pendingRenderFrame = 0;
  const names = [...pendingRenderNames];
  pendingRenderNames.clear();
  names.forEach(name => callByName(name));
}

function queueRender(name){
  const target = RENDER_TARGETS[name];
  if(target){
    markInvalidation(target.page, target.area, `dom-bindings:${name}`);
  }
  pendingRenderNames.add(name);
  if(pendingRenderFrame) return;
  pendingRenderFrame = window.requestAnimationFrame(flushPendingRenders);
}

function callRender(name){
  queueRender(name);
}

function callFieldHandler(name, el, event){
  const fieldHandlers = {
    cotFile: () => deps.cotFile(event),
    movLoadProd: () => deps.movLoadProd(),
    movCalc: () => deps.movCalc(),
    movCalcAjuste: () => deps.movCalcAjuste(),
    calcProdPreview: () => deps.calcProdPreview(),
    syncV: () => deps.syncV(el.dataset.arg),
    syncA: () => deps.syncA(el.dataset.arg),
    syncProdFromCost: () => deps.syncProdFromCost(),
    setFiltroNotificacoes: () => deps.setFiltroNotificacoes(el.value)
  };
  const handler = fieldHandlers[name];
  if(typeof handler === 'function') handler();
}

function runAction(action, el){
  const actions = {
    authEntrar: () => deps.authEntrar(),
    criarPrimeiraFilial: () => deps.criarPrimeiraFilial(),
    entrar: () => deps.entrar(),
    sairConta: () => deps.sairConta(),
    voltarSetup: () => deps.voltarSetup(),
    fecharSb: () => deps.fecharSb(),
    abrirSb: () => deps.abrirSb(),
    exportarTudo: () => deps.exportarTudo(),
    novoPedido: () => {
      deps.limparFormPedTracked();
      deps.abrirModal('modal-pedido');
    },
    abrirModalFilial: () => {
      deps.limparFormFilial();
      deps.abrirModal('modal-filial');
    },
    abrirModalProduto: () => {
      deps.limparFormProdTracked();
      deps.abrirModal('modal-produto');
    },
    abrirModalCliente: () => {
      deps.limparFormCliTracked();
      deps.abrirModal('modal-cliente');
    },
    abrirModalPedido: () => {
      deps.limparFormPedTracked();
      deps.abrirModal('modal-pedido');
    },
    abrirModalFornecedor: () => deps.abrirModal('modal-forn'),
    abrirModalMovimento: () => {
      deps.resetMov();
      deps.abrirModal('modal-mov');
    },
    abrirNovaCampanha: () => deps.abrirNovaCampanhaTracked(),
    refreshCampanhasTela: () => deps.refreshCampanhasTela(),
    abrirSyncJogos: () => deps.abrirSyncJogos(),
    abrirNovoJogo: () => deps.abrirNovoJogo(),
    renderMetasNegocio: () => deps.renderMetasNegocio(),
    resetUxKpis: () => deps.resetUxKpis(),
    renderAcessosAdmin: () => deps.renderAcessosAdmin(),
    salvarPerfilAcesso: () => deps.salvarPerfilAcesso(),
    removerPerfilAcesso: () => deps.removerPerfilAcesso(),
    vincularUsuarioFilial: () => deps.vincularUsuarioFilial(),
    desvincularUsuarioFilial: () => deps.desvincularUsuarioFilial(),
    resolverTodasNotificacoes: () => deps.resolverTodasNotificacoesTracked(),
    salvarFilial: () => deps.salvarFilial(),
    salvarProduto: () => deps.salvarProdutoTracked(),
    salvarCliente: () => deps.salvarClienteTracked(),
    addItem: () => deps.addItem(),
    salvarPedido: () => deps.salvarPedidoTracked(),
    salvarCampanha: () => deps.salvarCampanhaTracked(),
    salvarJogoDashboard: () => deps.salvarJogoDashboardGuard(),
    sincronizarJogosDashboard: () => deps.sincronizarJogosDashboardGuard(),
    salvarForn: () => deps.salvarForn(),
    salvarMov: () => deps.salvarMov(),
    cotLock: () => deps.cotLock(),
    exportCSV: () => deps.exportCSV(el.dataset.export),
    usarExemploSyncJogos: () => deps.usarExemploSyncJogos(el.dataset.syncExample)
  };
  const handler = actions[action];
  if(typeof handler === 'function') handler();
}

function onClick(event){
  const closeModalEl = event.target.closest('[data-close-modal]');
  if(closeModalEl){
    deps.fecharModal(closeModalEl.dataset.closeModal);
    return;
  }

  const navEl = event.target.closest('[data-nav], .ni[data-p], .mob-btn[data-p]');
  if(navEl){
    deps.ir(navEl.dataset.nav || navEl.dataset.p);
    return;
  }

  const tabEl = event.target.closest('[data-tab-group][data-tab]');
  if(tabEl){
    deps.switchTab(tabEl.dataset.tabGroup, tabEl.dataset.tab);
    if(tabEl.dataset.afterAction) runAction(tabEl.dataset.afterAction, tabEl);
    return;
  }

  const periodEl = event.target.closest('[data-period]');
  if(periodEl){
    deps.setP(periodEl.dataset.period, periodEl);
    return;
  }

  const chipEl = event.target.closest('[data-flow-chip][data-step]');
  if(chipEl){
    deps.setFlowStep(chipEl.dataset.flowChip, Number(chipEl.dataset.step));
    return;
  }

  const flowNavEl = event.target.closest('[data-flow-nav][data-flow]');
  if(flowNavEl){
    const flow = flowNavEl.dataset.flow;
    const delta = Number(flowNavEl.dataset.flowNav || 0);
    deps.setFlowStep(flow, getFlowCurrentStep(flow) + delta);
    return;
  }

  const movTypeEl = event.target.closest('[data-mov-type]');
  if(movTypeEl){
    deps.setTipo(movTypeEl.dataset.movType);
    return;
  }

  const actionEl = event.target.closest('[data-action]');
  if(actionEl){
    runAction(actionEl.dataset.action, actionEl);
    return;
  }

  const clickExprEl = event.target.closest('[data-click]');
  if(clickExprEl){
    runExpression(clickExprEl.dataset.click, clickExprEl, event);
  }
}

function onFieldEvent(event){
  const target = event.target;
  if(!(target instanceof HTMLElement)) return;

  if(target.dataset.render){
    callRender(target.dataset.render);
  }

  if(target.dataset.fieldAction){
    callFieldHandler(target.dataset.fieldAction, target, event);
  }

  if(event.type === 'input' && target.dataset.input){
    runExpression(target.dataset.input, target, event);
  }

  if(event.type === 'change' && target.dataset.change){
    runExpression(target.dataset.change, target, event);
  }
}

export function initDomBindings(nextDeps = {}){
  deps = { ...deps, ...nextDeps };
  if(initialized) return;
  initialized = true;
  document.addEventListener('click', onClick);
  document.addEventListener('input', onFieldEvent);
  document.addEventListener('change', onFieldEvent);
}

