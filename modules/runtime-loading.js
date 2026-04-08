import { SB } from '../js/api.js';
import { D } from '../js/store.js';
import { toast } from '../core/utils.js';

const IS_E2E_UI_CORE = window.__SC_E2E_MODE__ === true || window.__SC_E2E_UI_CORE__ === true;

export function initRuntimeLoadingModule(){
  return true;
}

export function buildSkeletonLines(lines = 3){
  return Array.from({ length: lines })
    .map(() => '<span class="sk-line"></span>')
    .join('');
}

export function renderSkeletonState(){
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

export function showLoading(on){
  let el = document.getElementById('sb-loading');
  if(!el){
    el = document.createElement('div');
    el.id = 'sb-loading';
    el.style.cssText =
      'position:fixed;inset:0;background:rgba(246,245,242,.88);z-index:8000;display:none;align-items:center;justify-content:center;gap:12px;font-size:14px;font-weight:500;color:var(--tx2);font-family:DM Sans,sans-serif;backdrop-filter:blur(2px)';
    el.innerHTML =
      '<div style="width:22px;height:22px;border:2.5px solid var(--bd2);border-top-color:var(--acc);border-radius:50%;animation:sp .7s linear infinite"></div>Carregando dados...';
    const st = document.createElement('style');
    st.textContent = '@keyframes sp{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
    document.body.appendChild(el);
  }
  el.style.display = on ? 'flex' : 'none';
  document.body.dataset.runtimeLoading = on ? 'true' : 'false';
}

export async function carregarDadosFilial(filId){
  document.body.dataset.runtimeBootstrap = 'starting';
  renderSkeletonState();
  showLoading(true);
  try{
    const [
      prodsResult,
      clisResult,
      pedsResult,
      fornsResult,
      precosResult,
      cfgResult,
      movsResult,
      jogosResult,
      campanhasResult,
      campanhaEnviosResult
    ] = await Promise.all([
      SB.toResult(() => SB.getProdutos(filId)),
      SB.toResult(() => SB.getClientes(filId)),
      SB.toResult(() => SB.getPedidos(filId)),
      SB.toResult(() => SB.getFornecedores(filId)),
      SB.toResult(() => SB.getCotPrecos(filId)),
      SB.toResult(() => SB.getCotConfig(filId)),
      SB.toResult(() => SB.getMovs(filId)),
      SB.toResult(() => SB.getJogosAgenda(filId)),
      SB.toResult(() => SB.getCampanhas(filId)),
      SB.toResult(() => SB.getCampanhaEnvios(filId))
    ]);

    const baseFailures = [
      prodsResult,
      clisResult,
      pedsResult,
      fornsResult,
      precosResult,
      cfgResult,
      movsResult
    ].filter(r => !r.ok);

    if(baseFailures.length){
      throw baseFailures[0].error;
    }

    const prods = prodsResult.data;
    const clis = clisResult.data;
    const peds = pedsResult.data;
    const forns = fornsResult.data;
    const precos = precosResult.data;
    const cfg = cfgResult.data;
    const movs = movsResult.data;

    const jogos = jogosResult.ok ? (jogosResult.data || []) : [];
    if(!jogosResult.ok){
      console.error('Falha ao carregar jogos na entrada da filial', jogosResult.error);
    }

    const campanhas = campanhasResult.ok ? (campanhasResult.data || []) : (D.campanhas?.[filId] || []);
    if(!campanhasResult.ok){
      console.error('Falha ao carregar campanhas na entrada da filial', campanhasResult.error);
      if(!IS_E2E_UI_CORE) toast('Nao foi possivel carregar campanhas do banco. Usando cache local.');
    }

    const campanhaEnvios = campanhaEnviosResult.ok ? (campanhaEnviosResult.data || []) : (D.campanhaEnvios?.[filId] || []);
    if(!campanhaEnviosResult.ok){
      console.error('Falha ao carregar envios de campanhas na entrada da filial', campanhaEnviosResult.error);
      if(!IS_E2E_UI_CORE) toast('Nao foi possivel carregar envios de campanha do banco. Usando cache local.');
    }

    D.produtos[filId] = prods || [];
    D.clientes[filId] = clis || [];
    D.pedidos[filId] = (peds || []).map(p => ({
      ...p,
      itens: typeof p.itens === 'string' ? JSON.parse(p.itens || '[]') : (p.itens || [])
    }));
    D.fornecedores[filId] = forns || [];

    if(!D.cotPrecos[filId]) D.cotPrecos[filId] = {};
    D.cotPrecos[filId] = {};
    (precos || []).forEach(p => {
      D.cotPrecos[filId][p.produto_id + '_' + p.fornecedor_id] = p.preco;
    });

    const logs = cfg?.logs ? (typeof cfg.logs === 'string' ? JSON.parse(cfg.logs) : cfg.logs) : [];
    D.cotConfig[filId] = {
      filial_id: filId,
      locked: cfg?.locked || false,
      logs
    };

    D.movs[filId] = movs || [];
    if(!D.jogos) D.jogos = {};
    D.jogos[filId] = jogos || [];

    if(!D.campanhas) D.campanhas = {};
    if(!D.campanhaEnvios) D.campanhaEnvios = {};
    D.campanhas[filId] = campanhas || [];
    D.campanhaEnvios[filId] = campanhaEnvios || [];
    document.body.dataset.runtimeBootstrap = 'ready';
  }catch(e){
    const err = SB.normalizeError(e);
    document.body.dataset.runtimeBootstrap = 'error';
    toast('Erro ao carregar: ' + err.message);
    console.error(err);
  }
  showLoading(false);
}

export function mostrarTela(id){
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('on');
    if(s.id === 'screen-setup'){
      s.style.display = 'none';
    }else if(s.id === 'screen-app'){
      s.style.display = 'none';
    }else{
      s.style.display = '';
    }
  });

  const target = document.getElementById(id);
  if(target){
    target.classList.add('on');
    if(id === 'screen-setup' || id === 'screen-app'){
      target.style.display = 'flex';
    }else{
      target.style.display = 'block';
    }
  }
  document.body.dataset.currentScreen = id;
  window.scrollTo(0, 0);
}
