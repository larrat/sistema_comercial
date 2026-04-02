import { SB } from './api.js';
import { D, State, P, C, PD, FORNS, CPRECOS, CCFG, MOVS } from './store.js';

function uid(){return Date.now()+'-'+Math.random().toString(36).slice(2,8);}

function toast(m){
  const el=document.getElementById('toast');
  el.textContent=m; el.classList.add('on');
  clearTimeout(window._tt);
  window._tt=setTimeout(()=>el.classList.remove('on'),2600);
}

function showLoading(on){
  let el=document.getElementById('sb-loading');
  if(!el){
    el=document.createElement('div');el.id='sb-loading';
    el.style.cssText='position:fixed;inset:0;background:rgba(246,245,242,.88);z-index:8000;display:none;align-items:center;justify-content:center;gap:12px;font-size:14px;font-weight:500;color:var(--tx2);backdrop-filter:blur(2px)';
    el.innerHTML='<div style="width:22px;height:22px;border:2.5px solid #bd2;border-top-color:#171510;border-radius:50%;animation:sp .7s linear infinite"></div>Carregando...';
    const st=document.createElement('style');st.textContent='@keyframes sp{to{transform:rotate(360deg)}}';document.head.appendChild(st);
    document.body.appendChild(el);
  }
  el.style.display=on?'flex':'none';
}

async function carregarDadosFilial(filId){
  showLoading(true);
  try{
    const[prods,clis,peds,forns,precos,cfg,movs]=await Promise.all([
      SB.getProdutos(filId),SB.getClientes(filId),SB.getPedidos(filId),
      SB.getFornecedores(filId),SB.getCotPrecos(filId),SB.getCotConfig(filId),SB.getMovs(filId)
    ]);
    
    D.produtos[filId]=prods||[];
    D.clientes[filId]=clis||[];
    D.pedidos[filId]=peds||[];
    D.fornecedores[filId]=forns||[];
    
    D.cotPrecos[filId]={};
    (precos||[]).forEach(p=>{D.cotPrecos[filId][p.produto_id+'_'+p.fornecedor_id]=p.preco;});
    
    const logs=cfg?.logs?(typeof cfg.logs==='string'?JSON.parse(cfg.logs):cfg.logs):[];
    D.cotConfig[filId]={filial_id:filId,locked:cfg?.locked||false,logs};
    
    D.movs[filId]=movs||[];
  }catch(e){toast('Erro ao carregar dados');}
  showLoading(false);
}

// FORMATADORES
function fmt(v){return'R$ '+Number(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function prV(c,mk){return c*(1+mk/100);}
function norm(s){return String(s).toLowerCase().trim();}

// NAVEGAÇÃO
async function renderSetup(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById('screen-setup').classList.add('on');
  try{ D.filiais = await SB.getFiliais() || []; } catch(e){}
  renderSetupGrid();
}

function renderSetupGrid(){
  const grid=document.getElementById('fil-grid');
  grid.innerHTML=D.filiais.map(f=>`
    <div class="fil-opt ${State.selFil===f.id?'sel':''}" onclick="selFilial('${f.id}')">
      <div class="fil-dot" style="background:${f.cor}"></div>
      <div class="fil-name">${f.nome}</div>
    </div>`).join('');
}

function selFilial(id){State.selFil=id;renderSetupGrid();}

async function entrar(){
  if(!State.selFil) return toast('Selecione uma filial');
  State.FIL=State.selFil;
  await carregarDadosFilial(State.FIL);
  document.getElementById('screen-setup').classList.remove('on');
  document.getElementById('screen-app').classList.add('on');
  ir('dashboard');
}

function ir(p){
  document.querySelectorAll('.pg').forEach(x=>x.classList.remove('on'));
  document.getElementById('pg-'+p).classList.add('on');
  if(p==='produtos') renderProdutos();
  if(p==='dashboard') renderDash();
  if(p==='cotacao') { renderFornSel(); renderCotLogs(); }
}

// PRODUTOS
function renderProdutos(){
  const el=document.getElementById('prod-lista');
  el.innerHTML=`<table class="tbl"><thead><tr><th>Produto</th><th>Custo</th><th>Ação</th></tr></thead><tbody>${P().map(p=>`
    <tr><td>${p.nome}</td><td>${fmt(p.custo)}</td><td><button onclick="editarProd('${p.id}')">✏</button></td></tr>`).join('')}</tbody></table>`;
}

function editarProd(id){
  const p=P().find(x=>x.id===id); if(!p) return;
  State.editIds.prod=id;
  document.getElementById('p-nome').value=p.nome;
  document.getElementById('p-custo').value=p.custo;
  
  const histEl = document.getElementById('p-hist-cot');
  if(p.hist_cot && p.hist_cot.length > 0){
    histEl.innerHTML = `<div class="pt">Histórico</div>` + p.hist_cot.map(h=>`<div>${h.mes}: ${fmt(h.preco)} (${h.forn})</div>`).join('');
    histEl.style.display='block';
  } else histEl.style.display='none';
  
  document.getElementById('modal-produto').classList.add('on');
}

async function salvarProduto(){
  const p = {
    id: State.editIds.prod || uid(),
    filial_id: State.FIL,
    nome: document.getElementById('p-nome').value,
    custo: parseFloat(document.getElementById('p-custo').value),
    mkv: parseFloat(document.getElementById('p-mkv').value) || 0,
    hist_cot: P().find(x=>x.id===State.editIds.prod)?.hist_cot || []
  };
  
  const pLimpo = JSON.parse(JSON.stringify(p)); // BLINDAGEM
  try {
    await SB.upsertProduto(pLimpo);
    await carregarDadosFilial(State.FIL);
    document.getElementById('modal-produto').classList.remove('on');
    renderProdutos();
    toast('Produto salvo');
  } catch(e) { toast('Erro ao salvar'); }
}

// COTAÇÃO E IMPORTAÇÃO
function renderFornSel(){
  const s=document.getElementById('cot-forn-sel');
  s.innerHTML='<option value="">— selecione —</option>'+FORNS().map(f=>`<option value="${f.id}">${f.nome}</option>`).join('');
}

function cotFile(e){
  const file=e.target.files[0]; if(!file)return;
  const fid=document.getElementById('cot-forn-sel').value;
  if(!fid) return toast('Selecione o fornecedor');
  
  const reader=new FileReader();
  reader.onload=ev=>{
    const wb=XLSX.read(ev.target.result,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1});
    abrirMapaModal(rows, FORNS().find(f=>f.id===fid), file.name);
  };
  reader.readAsArrayBuffer(file);
}

function abrirMapaModal(rows, forn, filename){
  State._mapaCtx = {rows, forn, filename};
  document.getElementById('mapa-titulo').textContent = 'Importar: ' + forn.nome;
  let sIdx = 0;
  for(let i=0; i<Math.min(200, rows.length); i++){
    if(rows[i].some(c=>String(c).toUpperCase().includes('DESCRIÇÃO'))) { sIdx=i; break; }
  }
  const headers = rows[sIdx].map((h,i)=>`<option value="${i}">${h || 'Col '+i}</option>`).join('');
  
  document.getElementById('mapa-body').innerHTML = `
    <div class="fg">Mês: <input type="month" id="map-mes" class="inp" value="${new Date().toISOString().slice(0,7)}"></div>
    <div class="fg">Produto: <select id="map-nome" class="inp">${headers}</select></div>
    <div class="fg">Preço Líq: <select id="map-preco" class="inp">${headers}</select></div>
    <button class="btn btn-p" onclick="confirmarMapa()">Processar</button>`;
  document.getElementById('modal-mapa').classList.add('on');
}

async function confirmarMapa(){
  const {rows, forn, filename} = State._mapaCtx;
  const mes = document.getElementById('map-mes').value;
  const nIdx = parseInt(document.getElementById('map-nome').value);
  const pIdx = parseInt(document.getElementById('map-preco').value);
  
  showLoading(true);
  for(const row of rows.slice(1)){
    const nome = String(row[nIdx]||'').trim();
    const preco = parseFloat(String(row[pIdx]||'').replace(/[R$\s,]/g,'.')) || 0;
    if(!nome || preco <= 0) continue;

    let prod = P().find(p => norm(p.nome) === norm(nome));
    if(!prod) {
      prod = { id: uid(), filial_id: State.FIL, nome, custo: preco, mkv: 0, hist_cot: [] };
    }
    
    if(!Array.isArray(prod.hist_cot)) prod.hist_cot = [];
    const entrada = { mes, forn: forn.nome, preco };
    const exIdx = prod.hist_cot.findIndex(h=>h.mes===mes && h.forn===forn.nome);
    if(exIdx >= 0) prod.hist_cot[exIdx] = entrada;
    else prod.hist_cot.push(entrada);

    try { await SB.upsertProduto(JSON.parse(JSON.stringify(prod))); } catch(e){}
  }
  
  const logs = CCFG().logs || [];
  logs.unshift({ arquivo: filename, forn: forn.nome, data: new Date().toLocaleString() });
  await SB.upsertCotConfig({ filial_id: State.FIL, logs: JSON.stringify(logs.slice(0,10)) });
  
  showLoading(false);
  document.getElementById('modal-mapa').classList.remove('on');
  await carregarDadosFilial(State.FIL);
  ir('produtos');
  toast('Importação Finalizada');
}

// INICIALIZAÇÃO
window.onload = () => renderSetup();

// EXPORTS PARA O HTML
window.selFilial = selFilial; window.entrar = entrar; window.ir = ir;
window.salvarProduto = salvarProduto; window.cotFile = cotFile;
window.confirmarMapa = confirmarMapa;