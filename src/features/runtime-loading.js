// @ts-check

import { SB } from '../app/api.js';
import { D, invalidatePdCache } from '../app/store.js';
import { toast } from '../shared/utils.js';

/** @typedef {import('../types/domain').Pedido} Pedido */

const IS_E2E_UI_CORE = window.__SC_E2E_MODE__ === true || window.__SC_E2E_UI_CORE__ === true;

export function initRuntimeLoadingModule() {
  return true;
}

/**
 * @param {number} [lines]
 */
export function buildSkeletonLines(lines = 3) {
  return Array.from({ length: lines })
    .map(() => '<span class="sk-line"></span>')
    .join('');
}

export function renderSkeletonState() {
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
    if (el) el.innerHTML = html;
  });
}

/**
 * @param {boolean} on
 */
export function showLoading(on) {
  let el = document.getElementById('sb-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sb-loading';
    el.className = 'runtime-loading';
    el.innerHTML = '<div class="runtime-loading__spinner"></div><span>Carregando dados...</span>';
    document.body.appendChild(el);
  }
  el.classList.toggle('is-on', on);
  document.body.dataset.runtimeLoading = on ? 'true' : 'false';
}

/**
 * @param {string} filId
 */
export async function carregarDadosFilial(filId) {
  document.body.dataset.runtimeBootstrap = 'starting';
  renderSkeletonState();
  showLoading(true);
  try {
    const [
      prodsResult,
      clisResult,
      pedsResult,
      rcasResult,
      fornsResult,
      precosResult,
      cfgResult,
      movsResult,
      jogosResult,
      campanhasResult,
      campanhaEnviosResult,
      contasReceberResult,
      contasReceberBaixasResult
    ] = await Promise.all([
      SB.toResult(() => SB.getProdutos(filId)),
      SB.toResult(() => SB.getClientes(filId)),
      SB.toResult(() => SB.getPedidos(filId)),
      SB.toResult(() => SB.getRcas(filId)),
      SB.toResult(() => SB.getFornecedores(filId)),
      SB.toResult(() => SB.getCotPrecos(filId)),
      SB.toResult(() => SB.getCotConfig(filId)),
      SB.toResult(() => SB.getMovs(filId)),
      SB.toResult(() => SB.getJogosAgenda(filId)),
      SB.toResult(() => SB.getCampanhas(filId)),
      SB.toResult(() => SB.getCampanhaEnvios(filId)),
      SB.toResult(() => SB.getContasReceber(filId)),
      SB.toResult(() => SB.getContasReceberBaixas(filId))
    ]);

    const baseFailures = [
      prodsResult,
      clisResult,
      pedsResult,
      rcasResult,
      fornsResult,
      precosResult,
      cfgResult,
      movsResult
    ].filter((r) => !r.ok);

    if (baseFailures.length) {
      throw baseFailures[0].error;
    }

    const prods = prodsResult.data;
    const clis = clisResult.data;
    const peds = pedsResult.data;
    const rcas = rcasResult.data;
    const forns = fornsResult.data;
    const precos = precosResult.data;
    const cfg = cfgResult.data;
    const movs = movsResult.data;

    const jogos = jogosResult.ok ? jogosResult.data || [] : [];
    if (!jogosResult.ok) {
      console.error('Falha ao carregar jogos na entrada da filial', jogosResult.error);
    }

    const campanhas = campanhasResult.ok ? campanhasResult.data || [] : D.campanhas?.[filId] || [];
    if (!campanhasResult.ok) {
      console.error('Falha ao carregar campanhas na entrada da filial', campanhasResult.error);
      if (!IS_E2E_UI_CORE)
        toast('Nao foi possivel carregar campanhas do banco. Usando cache local.');
    }

    const campanhaEnvios = campanhaEnviosResult.ok
      ? campanhaEnviosResult.data || []
      : D.campanhaEnvios?.[filId] || [];
    if (!campanhaEnviosResult.ok) {
      console.error(
        'Falha ao carregar envios de campanhas na entrada da filial',
        campanhaEnviosResult.error
      );
      if (!IS_E2E_UI_CORE)
        toast('Nao foi possivel carregar envios de campanha do banco. Usando cache local.');
    }

    D.produtos[filId] = prods || [];
    D.clientes[filId] = clis || [];
    D.pedidos[filId] = (peds || []).map((p) => {
      /** @type {Pedido} */
      const pedido = /** @type {Pedido} */ (p);
      return {
        ...pedido,
        itens:
          typeof pedido.itens === 'string' ? JSON.parse(pedido.itens || '[]') : pedido.itens || []
      };
    });
    invalidatePdCache();
    D.rcas[filId] = rcas || [];
    D.fornecedores[filId] = forns || [];

    if (!D.cotPrecos[filId]) D.cotPrecos[filId] = {};
    D.cotPrecos[filId] = {};
    (precos || []).forEach((p) => {
      D.cotPrecos[filId][p.produto_id + '_' + p.fornecedor_id] = p.preco;
    });

    const logs = cfg?.logs ? (typeof cfg.logs === 'string' ? JSON.parse(cfg.logs) : cfg.logs) : [];
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

    const contasReceber = contasReceberResult.ok
      ? contasReceberResult.data || []
      : D.contasReceber?.[filId] || [];
    if (!contasReceberResult.ok) {
      console.error('Falha ao carregar contas a receber', contasReceberResult.error);
    }
    if (!D.contasReceber) D.contasReceber = {};
    D.contasReceber[filId] = contasReceber || [];

    const contasReceberBaixas = contasReceberBaixasResult.ok
      ? contasReceberBaixasResult.data || []
      : D.contasReceberBaixas?.[filId] || [];
    if (!contasReceberBaixasResult.ok) {
      console.error(
        'Falha ao carregar baixas de contas a receber',
        contasReceberBaixasResult.error
      );
    }
    if (!D.contasReceberBaixas) D.contasReceberBaixas = {};
    D.contasReceberBaixas[filId] = contasReceberBaixas || [];

    document.body.dataset.runtimeBootstrap = 'ready';
  } catch (e) {
    const err = SB.normalizeError(e);
    document.body.dataset.runtimeBootstrap = 'error';
    toast('Erro ao carregar: ' + err.message);
    console.error(err);
  }
  showLoading(false);
}

/**
 * @param {string} id
 */
export function mostrarTela(id) {
  document.querySelectorAll('.screen').forEach((s) => {
    if (!(s instanceof HTMLElement)) return;
    s.classList.remove('on');
    if (s.id === 'screen-setup') {
      s.style.display = 'none';
    } else if (s.id === 'screen-app') {
      s.style.display = 'none';
    } else {
      s.style.display = '';
    }
  });

  /** @type {HTMLElement | null} */
  const target = /** @type {HTMLElement | null} */ (document.getElementById(id));
  if (target) {
    target.classList.add('on');
    if (id === 'screen-setup' || id === 'screen-app') {
      target.style.display = 'flex';
    } else {
      target.style.display = 'block';
    }
  }
  document.body.dataset.currentScreen = id;
  window.scrollTo(0, 0);
}
