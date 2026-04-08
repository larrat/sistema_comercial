let deps = {};
let initialized = false;

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

function callByName(name, args = []){
  const handlers = {
    abrirModal: deps.abrirModal,
    fecharModal: deps.fecharModal,
    authEntrar: deps.authEntrar,
    criarPrimeiraFilial: deps.criarPrimeiraFilial,
    limparFormFilial: deps.limparFormFilial,
    entrar: deps.entrar,
    fecharSb: deps.fecharSb,
    voltarSetup: deps.voltarSetup,
    ir: deps.ir,
    exportarTudo: deps.exportarTudo,
    sairConta: deps.sairConta,
    renderDash: deps.renderDash,
    setP: deps.setP,
    limparFormPed: deps.limparFormPedTracked,
    abrirSyncJogos: deps.abrirSyncJogos,
    abrirNovoJogo: deps.abrirNovoJogo,
    renderMetasNegocio: deps.renderMetasNegocio,
    resetUxKpis: deps.resetUxKpis,
    limparFormProd: deps.limparFormProdTracked,
    renderProdutos: deps.renderProdutos,
    exportCSV: deps.exportCSV,
    limparFormCli: deps.limparFormCliTracked,
    switchTab: deps.switchTab,
    renderCliSegs: deps.renderCliSegs,
    renderClientes: deps.renderClientes,
    renderPedidos: deps.renderPedidos,
    renderCotForns: deps.renderCotForns,
    renderCotTabela: deps.renderCotTabela,
    cotFile: deps.cotFile,
    cotLock: deps.cotLock,
    resetMov: deps.resetMov,
    renderEstPosicao: deps.renderEstPosicao,
    renderEstHist: deps.renderEstHist,
    abrirNovaCampanha: deps.abrirNovaCampanhaTracked,
    removerJogoDashboard: deps.removerJogoDashboardGuard,
    abrirMovProd: deps.abrirMovProd,
    editarProd: deps.editarProd,
    removerProd: deps.removerProdGuard,
    excluirMov: deps.excluirMovGuard,
    refreshCampanhasTela: deps.refreshCampanhasTela,
    renderAcessosAdmin: deps.renderAcessosAdmin,
    salvarPerfilAcesso: deps.salvarPerfilAcesso,
    removerPerfilAcesso: deps.removerPerfilAcesso,
    vincularUsuarioFilial: deps.vincularUsuarioFilial,
    desvincularUsuarioFilial: deps.desvincularUsuarioFilial,
    renderAcessosPerfis: deps.renderAcessosPerfis,
    renderAcessosVinculos: deps.renderAcessosVinculos,
    renderNotificacoes: deps.renderNotificacoes,
    resolverTodasNotificacoes: deps.resolverTodasNotificacoesTracked,
    abrirSb: deps.abrirSb,
    salvarFilial: deps.salvarFilial,
    setFlowStep: deps.setFlowStep,
    calcProdPreview: deps.calcProdPreview,
    syncV: deps.syncV,
    syncA: deps.syncA,
    salvarProduto: deps.salvarProdutoTracked,
    salvarCliente: deps.salvarClienteTracked,
    addItem: deps.addItem,
    salvarPedido: deps.salvarPedidoTracked,
    salvarCampanha: deps.salvarCampanhaTracked,
    salvarJogoDashboard: deps.salvarJogoDashboardGuard,
    usarExemploSyncJogos: deps.usarExemploSyncJogos,
    sincronizarJogosDashboard: deps.sincronizarJogosDashboardGuard,
    salvarForn: deps.salvarForn,
    setTipo: deps.setTipo,
    movLoadProd: deps.movLoadProd,
    movCalc: deps.movCalc,
    movCalcAjuste: deps.movCalcAjuste,
    salvarMov: deps.salvarMov,
    setFiltroNotificacoes: deps.setFiltroNotificacoes,
    executarAcaoGerencial: deps.executarAcaoGerencial
  };
  const handler = handlers[name];
  if(typeof handler === 'function'){
    handler(...args);
    return;
  }
  if(typeof window[name] === 'function'){
    window[name](...args);
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

function callRender(name){
  const renderers = {
    renderDash: deps.renderDash,
    renderProdutos: deps.renderProdutos,
    renderClientes: deps.renderClientes,
    renderPedidos: deps.renderPedidos,
    renderEstPosicao: deps.renderEstPosicao,
    renderEstHist: deps.renderEstHist,
    renderAcessosPerfis: deps.renderAcessosPerfis,
    renderAcessosVinculos: deps.renderAcessosVinculos,
    renderNotificacoes: deps.renderNotificacoes
  };
  const handler = renderers[name];
  if(typeof handler === 'function') handler();
}

function callFieldHandler(name, el, event){
  const handlers = {
    cotFile: () => deps.cotFile(event),
    movLoadProd: () => deps.movLoadProd(),
    movCalc: () => deps.movCalc(),
    movCalcAjuste: () => deps.movCalcAjuste(),
    calcProdPreview: () => deps.calcProdPreview(),
    syncV: () => deps.syncV(el.dataset.arg),
    syncA: () => deps.syncA(el.dataset.arg),
    setFiltroNotificacoes: () => deps.setFiltroNotificacoes(el.value)
  };
  const handler = handlers[name];
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
