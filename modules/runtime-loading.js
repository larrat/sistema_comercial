import { SB } from '../js/api.js';
import { D } from '../js/store.js';
import { toast } from '../core/utils.js';

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
}

export async function carregarDadosFilial(filId){
  renderSkeletonState();
  showLoading(true);
  try{
    const [
      prods,
      clis,
      peds,
      forns,
      precos,
      cfg,
      movs,
      jogos,
      campanhas,
      campanhaEnvios
    ] = await Promise.all([
      SB.getProdutos(filId),
      SB.getClientes(filId),
      SB.getPedidos(filId),
      SB.getFornecedores(filId),
      SB.getCotPrecos(filId),
      SB.getCotConfig(filId),
      SB.getMovs(filId),
      SB.getJogosAgenda(filId).catch(() => []),
      SB.getCampanhas(filId).catch(e => {
        console.error('Falha ao carregar campanhas na entrada da filial', e);
        toast('Nao foi possivel carregar campanhas do banco. Usando cache local.');
        return D.campanhas?.[filId] || [];
      }),
      SB.getCampanhaEnvios(filId).catch(e => {
        console.error('Falha ao carregar envios de campanhas na entrada da filial', e);
        toast('Nao foi possivel carregar envios de campanha do banco. Usando cache local.');
        return D.campanhaEnvios?.[filId] || [];
      })
    ]);

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
  }catch(e){
    toast('Erro ao carregar: ' + e.message);
    console.error(e);
  }
  showLoading(false);
}

export function mostrarTela(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById(id)?.classList.add('on');
  window.scrollTo(0, 0);
}
