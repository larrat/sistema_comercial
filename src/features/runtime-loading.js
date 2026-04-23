// @ts-check

import { SB } from '../app/api.js';
import { D, invalidatePdCache } from '../app/store.js';
import { toast } from '../shared/utils.js';

/** @typedef {import('../types/domain').Pedido} Pedido */

const IS_E2E_UI_CORE = window.__SC_E2E_MODE__ === true || window.__SC_E2E_UI_CORE__ === true;

export function initRuntimeLoadingModule() {
  return true;
}

function ensureRuntimeBanner() {
  const screen = document.getElementById('screen-app');
  if (!(screen instanceof HTMLElement)) return null;
  let el = document.getElementById('app-runtime-banner');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'app-runtime-banner';
  el.className = 'app-runtime-banner is-hidden';
  screen.insertBefore(el, screen.firstChild);
  return el;
}

export function clearRuntimeBanner() {
  const el = ensureRuntimeBanner();
  if (!el) return;
  el.className = 'app-runtime-banner is-hidden';
  el.textContent = '';
}

/**
 * @param {string} message
 * @param {'warning' | 'error'} [tone='warning']
 */
export function setRuntimeBanner(message, tone = 'warning') {
  const el = ensureRuntimeBanner();
  if (!el) return;
  el.className = `app-runtime-banner app-runtime-banner--${tone}`;
  el.textContent = message;
}

/**
 * @param {unknown} err
 */
function isBackendUnavailable(err) {
  return SB.isBackendUnavailableError(err);
}

/**
 * @template T
 * @param {string} label
 * @param {() => Promise<T>} loader
 * @returns {Promise<{ label: string, ok: boolean, data: T | null, error: import('../types/domain').SbApiError | null, elapsedMs: number }>}
 */
async function timedSbResult(label, loader) {
  const started = performance.now();
  const result = await SB.toResult(loader);
  const elapsedMs = Math.round(performance.now() - started);
  const payload = {
    label,
    ok: result.ok,
    data: result.ok ? result.data : null,
    error: result.ok ? null : result.error,
    elapsedMs
  };
  if (result.ok) {
    console.info(`[runtime-loading] ${label} carregado em ${elapsedMs}ms`);
  } else {
    console.error(`[runtime-loading] ${label} falhou em ${elapsedMs}ms`, result.error);
  }
  return payload;
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
  clearRuntimeBanner();
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
      timedSbResult('produtos', () => SB.getProdutos(filId)),
      timedSbResult('clientes', () => SB.getClientes(filId)),
      timedSbResult('pedidos', () => SB.getPedidos(filId)),
      timedSbResult('rcas', () => SB.getRcas(filId)),
      timedSbResult('fornecedores', () => SB.getFornecedores(filId)),
      timedSbResult('cotacao_precos', () => SB.getCotPrecos(filId)),
      timedSbResult('cotacao_config', () => SB.getCotConfig(filId)),
      timedSbResult('movimentacoes', () => SB.getMovs(filId)),
      timedSbResult('jogos_agenda', () => SB.getJogosAgenda(filId)),
      timedSbResult('campanhas', () => SB.getCampanhas(filId)),
      timedSbResult('campanha_envios', () => SB.getCampanhaEnvios(filId)),
      timedSbResult('contas_receber', () => SB.getContasReceber(filId)),
      timedSbResult('contas_receber_baixas', () => SB.getContasReceberBaixas(filId))
    ]);

    console.info(
      '[runtime-loading] resumo da filial',
      [
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
      ].map((item) => ({
        recurso: item.label,
        ok: item.ok,
        ms: item.elapsedMs
      }))
    );

    const coreFallbacks = {
      produtos: { hasCache: Array.isArray(D.produtos?.[filId]), data: D.produtos?.[filId] || [] },
      clientes: { hasCache: Array.isArray(D.clientes?.[filId]), data: D.clientes?.[filId] || [] },
      pedidos: { hasCache: Array.isArray(D.pedidos?.[filId]), data: D.pedidos?.[filId] || [] },
      fornecedores: {
        hasCache: Array.isArray(D.fornecedores?.[filId]),
        data: D.fornecedores?.[filId] || []
      },
      cotacao_precos: {
        hasCache: !!D.cotPrecos?.[filId],
        data: D.cotPrecos?.[filId] || {}
      },
      cotacao_config: {
        hasCache: !!D.cotConfig?.[filId],
        data: D.cotConfig?.[filId] || { filial_id: filId, locked: false, logs: [] }
      },
      movimentacoes: { hasCache: Array.isArray(D.movs?.[filId]), data: D.movs?.[filId] || [] }
    };

    const baseFailures = [
      prodsResult,
      clisResult,
      pedsResult,
      fornsResult,
      precosResult,
      cfgResult,
      movsResult
    ].filter((r) => !r.ok);

    const canRunWithFallback =
      baseFailures.length > 0 &&
      baseFailures.every((failure) => coreFallbacks[failure.label]?.hasCache === true);

    if (baseFailures.length && !canRunWithFallback) {
      throw baseFailures[0].error;
    }

    const prods = prodsResult.ok ? prodsResult.data : coreFallbacks.produtos.data;
    const clis = clisResult.ok ? clisResult.data : coreFallbacks.clientes.data;
    const peds = pedsResult.ok ? pedsResult.data : coreFallbacks.pedidos.data;
    const forns = fornsResult.ok ? fornsResult.data : coreFallbacks.fornecedores.data;
    const precos = precosResult.ok ? precosResult.data : [];
    const cfg = cfgResult.ok ? cfgResult.data : coreFallbacks.cotacao_config.data;
    const movs = movsResult.ok ? movsResult.data : coreFallbacks.movimentacoes.data;

    const rcas = rcasResult.ok ? rcasResult.data || [] : D.rcas?.[filId] || [];
    if (!rcasResult.ok) {
      console.error('Falha ao carregar vendedores na entrada da filial', rcasResult.error);
      if (!IS_E2E_UI_CORE) toast('Nao foi possivel carregar vendedores do banco. Usando cache local.');
    }

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

    const hasFailures =
      baseFailures.length > 0 ||
      !rcasResult.ok ||
      !jogosResult.ok ||
      !campanhasResult.ok ||
      !campanhaEnviosResult.ok ||
      !contasReceberResult.ok ||
      !contasReceberBaixasResult.ok;

    document.body.dataset.runtimeBootstrap = hasFailures ? 'degraded' : 'ready';
    if (hasFailures) {
      setRuntimeBanner(
        'Alguns dados do banco nao responderam agora. O sistema abriu em modo degradado usando cache local quando possivel.',
        'warning'
      );
    }
  } catch (e) {
    const err = SB.normalizeError(e);
    document.body.dataset.runtimeBootstrap = isBackendUnavailable(err) ? 'degraded' : 'error';
    if (isBackendUnavailable(err)) {
      setRuntimeBanner(
        'O backend esta indisponivel no momento. A operacao foi aberta com os dados locais disponiveis, mas algumas acoes online podem falhar.',
        'warning'
      );
      toast('Backend indisponivel no momento. Operando com dados locais quando possivel.');
    } else {
      setRuntimeBanner('Nao foi possivel carregar os dados principais da filial.', 'error');
      toast('Erro ao carregar: ' + err.message);
    }
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
