import { SB } from './api.js';
import { D, State, P, C, PD, FORNS, CPRECOS, CCFG, MOVS } from './store.js';

import { toast, abrirModal, fecharModal, uid, norm, fmt, fmtN, fmtQ, pct, mk2mg, mg2mk, prV } from '../core/utils.js';

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

function showLoading(on){
  let el = document.getElementById('sb-loading');
  if(!el){
    el = document.createElement('div');
    el.id = 'sb-loading';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(246,245,242,.88);z-index:8000;display:none;align-items:center;justify-content:center;gap:12px;font-size:14px;font-weight:500;color:var(--tx2);font-family:DM Sans,sans-serif;backdrop-filter:blur(2px)';
    el.innerHTML = '<div style="width:22px;height:22px;border:2.5px solid var(--bd2);border-top-color:var(--acc);border-radius:50%;animation:sp .7s linear infinite"></div>Carregando dados…';
    const st = document.createElement('style');
    st.textContent = '@keyframes sp{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
    document.body.appendChild(el);
  }
  el.style.display = on ? 'flex' : 'none';
}

async function carregarDadosFilial(filId){
  showLoading(true);
  try{
    const [prods, clis, peds, forns, precos, cfg, movs] = await Promise.all([
      SB.getProdutos(filId),
      SB.getClientes(filId),
      SB.getPedidos(filId),
      SB.getFornecedores(filId),
      SB.getCotPrecos(filId),
      SB.getCotConfig(filId),
      SB.getMovs(filId)
    ]);

    D.produtos[filId] = prods || [];
    D.clientes[filId] = clis || [];
    D.pedidos[filId] = peds || [];
    D.fornecedores[filId] = forns || [];
    D.cotPrecos[filId] = {};
    (precos || []).forEach(p => {
      D.cotPrecos[filId][p.produto_id + '_' + p.fornecedor_id] = p.preco;
    });

    const logs = cfg?.logs
      ? (typeof cfg.logs === 'string' ? JSON.parse(cfg.logs) : cfg.logs)
      : [];

    D.cotConfig[filId] = {
      filial_id: filId,
      locked: cfg?.locked || false,
      logs
    };

    D.movs[filId] = movs || [];
  }catch(e){
    toast('Erro ao carregar: ' + e.message);
    console.error(e);
  }
  showLoading(false);
}

const MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const CORES = ['#163F80','#156038','#7A4E00','#9B2D24','#5B3F99','#1A6B7A'];

function mostrarTela(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  window.scrollTo(0, 0);
}

function renderSetupGrid(){
  const grid = document.getElementById('fil-grid');
  const form = document.getElementById('setup-form');
  const actions = document.getElementById('setup-actions');
  const sub = document.getElementById('setup-sub');

  if(!D.filiais.length){
    grid.innerHTML = '';
    form.style.display = 'block';
    actions.style.display = 'none';
    sub.textContent = 'Crie sua primeira filial para começar';
    return;
  }

  form.style.display = 'none';
  actions.style.display = 'flex';
  sub.textContent = 'Selecione a filial para continuar';

  grid.innerHTML = D.filiais.map(f => `
    <div class="fil-opt ${State.selFil === f.id ? 'sel' : ''}" onclick="selFilial('${f.id}')">
      <div class="fil-dot" style="background:${f.cor}"></div>
      <div>
        <div class="fil-name">${f.nome}</div>
        <div class="fil-city">${f.cidade || ''}${f.estado ? ' - ' + f.estado : ''}</div>
      </div>
    </div>
  `).join('');
}

async function renderSetup(){
  mostrarTela('screen-setup');
  showLoading(true);
  try{
    D.filiais = await SB.getFiliais() || [];
  }catch(e){
    toast('Erro ao buscar filiais: ' + e.message);
  }
  showLoading(false);
  renderSetupGrid();
}

function selFilial(id){
  State.selFil = id;
  renderSetupGrid();
}

async function criarPrimeiraFilial(){
  const nome = document.getElementById('sf-nome').value.trim();
  if(!nome){
    toast('Informe o nome da filial.');
    return;
  }

  const f = {
    id: uid(),
    nome,
    cidade: document.getElementById('sf-cidade').value.trim(),
    estado: document.getElementById('sf-estado').value.trim(),
    cor: document.getElementById('sf-cor').value,
    endereco: ''
  };

  try{
    await SB.upsertFilial(f);
  }catch(e){
    toast('Erro ao criar filial: ' + e.message);
    return;
  }

  D.filiais.push(f);
  State.selFil = f.id;
  await entrar();
}

async function entrar(){
  if(!State.selFil){
    toast('Selecione uma filial.');
    return;
  }

  try{
    D.filiais = await SB.getFiliais() || [];
  }catch(e){}

  const f = D.filiais.find(x => x.id === State.selFil);
  if(!f){
    toast('Filial não encontrada.');
    return;
  }

  State.FIL = State.selFil;
  document.getElementById('sb-dot').style.background = f.cor;
  document.getElementById('sb-fname').textContent = f.nome;

  await carregarDadosFilial(State.FIL);

  mostrarTela('screen-app');
  refreshProdSel();
  refreshCliDL();
  renderFornSel();
  refreshMovSel();
  refreshDestSel();
  renderDashFilSel();
  renderDash();
  atualizarBadgeEst();
  ir('dashboard');
}

function voltarSetup(){
  renderSetup();
}

function ir(p){
  fecharSb();
  document.querySelectorAll('.ni').forEach(n => n.classList.toggle('on', n.dataset.p === p));
  document.querySelectorAll('.pg').forEach(x => x.classList.remove('on'));
  document.getElementById('pg-' + p).classList.add('on');
  document.querySelectorAll('.mob-btn').forEach(b => b.classList.toggle('on', b.id === 'mob-' + p));

  const renderMap = {
    dashboard: renderDash,
    produtos: () => { renderProdMet(); renderProdutos(); },
    clientes: () => { renderCliMet(); renderClientes(); },
    pedidos: () => { renderPedMet(); renderPedidos(); },
    cotacao: () => { renderFornSel(); renderCotForns(); renderCotLogs(); },
    estoque: () => { renderEstAlerts(); renderEstPosicao(); },
    filiais: () => { renderFilMet(); renderFilLista(); }
  };

  if(renderMap[p]) renderMap[p]();
  window.scrollTo(0, 0);
}

function switchTab(grp, name){
  const prefix = grp + '-tc-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(t => t.classList.remove('on'));
  document.getElementById(prefix + name).classList.add('on');

  document.querySelectorAll(`#pg-${grp} .tb`).forEach((b, i) => {
    const ids = Array.from(document.querySelectorAll(`[id^="${prefix}"]`)).map(t => t.id.replace(prefix, ''));
    b.classList.toggle('on', ids[i] === name);
  });
}

function abrirSb(){
  document.getElementById('sb').classList.add('on');
  document.getElementById('sb-overlay').classList.add('on');
  document.getElementById('sb-close').style.display = 'flex';
}

function fecharSb(){
  document.getElementById('sb').classList.remove('on');
  document.getElementById('sb-overlay').classList.remove('on');
  document.getElementById('sb-close').style.display = 'none';
}

function limparFormFilial(){
  State.editIds.filial = null;
  document.getElementById('filial-modal-titulo').textContent = 'Nova filial';
  ['fil-nome','fil-cidade','fil-estado','fil-end'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('fil-cor').value = CORES[D.filiais.length % CORES.length];
}

function editarFilial(id){
  const f = D.filiais.find(x => x.id === id);
  if(!f) return;

  State.editIds.filial = id;
  document.getElementById('filial-modal-titulo').textContent = 'Editar filial';
  document.getElementById('fil-nome').value = f.nome;
  document.getElementById('fil-cidade').value = f.cidade || '';
  document.getElementById('fil-estado').value = f.estado || '';
  document.getElementById('fil-end').value = f.endereco || '';
  document.getElementById('fil-cor').value = f.cor;
  abrirModal('modal-filial');
}

async function salvarFilial(){
  const nome = document.getElementById('fil-nome').value.trim();
  if(!nome){
    toast('Informe o nome.');
    return;
  }

  const f = {
    id: State.editIds.filial || uid(),
    nome,
    cidade: document.getElementById('fil-cidade').value.trim(),
    estado: document.getElementById('fil-estado').value.trim(),
    endereco: document.getElementById('fil-end').value.trim(),
    cor: document.getElementById('fil-cor').value
  };

  try{
    await SB.upsertFilial(f);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  fecharModal('modal-filial');
  renderSetup().then(() => {
    renderFilLista();
    renderFilMet();
    renderDashFilSel();
  });

  toast(State.editIds.filial ? 'Filial atualizada!' : 'Filial criada!');
}

async function removerFilial(id){
  if(!confirm('Remover filial e dados?')) return;

  try{
    await SB.deleteFilial(id);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  D.filiais = D.filiais.filter(f => f.id !== id);
  renderFilLista();
  renderFilMet();
  renderSetup().then(() => renderDashFilSel());
  toast('Filial removida.');
}

function renderFilMet(){
  document.getElementById('fil-met').innerHTML = `
    <div class="met"><div class="ml">Filiais</div><div class="mv">${D.filiais.length}</div></div>
    <div class="met"><div class="ml">Total produtos</div><div class="mv">${Object.values(D.produtos).flat().length}</div></div>
    <div class="met"><div class="ml">Total pedidos</div><div class="mv">${Object.values(D.pedidos).flat().length}</div></div>
  `;
}

function renderFilLista(){
  const el = document.getElementById('fil-lista');

  if(!D.filiais.length){
    el.innerHTML = `<div class="empty"><div class="ico">🏢</div><p>Nenhuma filial cadastrada.</p></div>`;
    return;
  }

  el.innerHTML = D.filiais.map(f => {
    const prods = (D.produtos[f.id] || []).length;
    const clis = (D.clientes[f.id] || []).length;
    const peds = (D.pedidos[f.id] || []).length;
    const ativa = f.id === State.FIL;

    return `
      <div class="card fb" style="${ativa ? 'border-color:var(--acc)' : ''}">
        <div style="display:flex;align-items:center;gap:12px;flex:1">
          <div style="width:14px;height:14px;border-radius:50%;background:${f.cor};flex-shrink:0"></div>
          <div>
            <div style="font-weight:600;font-size:15px">
              ${f.nome}${ativa ? ` <span class="bdg bb" style="font-size:10px;vertical-align:middle">Ativa</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--tx3)">${f.cidade || ''}${f.estado ? ' - ' + f.estado : ''}</div>
            <div style="display:flex;gap:6px;margin-top:6px">
              <span class="bdg bk">${prods} produto(s)</span>
              <span class="bdg bk">${clis} cliente(s)</span>
              <span class="bdg bk">${peds} pedido(s)</span>
            </div>
          </div>
        </div>
        <div class="fg2">
          ${!ativa ? `<button class="btn btn-sm" onclick="trocarFilial('${f.id}')">Selecionar</button>` : ''}
          <button class="ib" onclick="editarFilial('${f.id}')">✏</button>
          <button class="ib" onclick="removerFilial('${f.id}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

async function trocarFilial(id){
  State.selFil = id;
  await entrar();
  await renderSetup();
  toast('Filial alterada!');
}

// ---------------------------------------------
// Mantenha abaixo TODAS AS SUAS FUNÇÕES ATUAIS
// de dashboard, produtos, clientes, pedidos,
// estoque, exportação CSV, etc.
// ---------------------------------------------
//
// Copie do seu main.js atual tudo o que vem
// depois desta linha, EXCETO o bloco de cotação
// que você já moveu para os módulos.
// ---------------------------------------------

// CALLBACKS do módulo de cotação
initCotacaoModule({
  renderCotLogs,
  renderProdMet: () => renderProdMet(),
  renderProdutos: () => renderProdutos()
});

// Bootstrap
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', () => {
    renderSetup();
  });
} else {
  renderSetup();
}

// Globais
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.criarPrimeiraFilial = criarPrimeiraFilial;
window.entrar = entrar;
window.voltarSetup = voltarSetup;
window.selFilial = selFilial;
window.fecharSb = fecharSb;
window.abrirSb = abrirSb;
window.ir = ir;
window.switchTab = switchTab;

window.renderFornSel = renderFornSel;
window.renderCotLogs = renderCotLogs;
window.renderCotForns = renderCotForns;
window.renderCotTabela = renderCotTabela;
window.salvarForn = salvarForn;
window.remForn = remForn;
window.cotLock = cotLock;
window.updPreco = updPreco;
window.cotFile = cotFile;
window.confirmarMapa = confirmarMapa;
window.renderMapaBody = renderMapaBody;

window.limparFormFilial = limparFormFilial;
window.editarFilial = editarFilial;
window.salvarFilial = salvarFilial;
window.removerFilial = removerFilial;
window.trocarFilial = trocarFilial;