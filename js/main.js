import { SB } from './api.js';
import { D, State, P, C, PD, FORNS, CPRECOS, CCFG, MOVS } from './store.js';

function uid(){return Date.now()+'-'+Math.random().toString(36).slice(2,8);}

function showLoading(on){
  let el=document.getElementById('sb-loading');
  if(!el){
    el=document.createElement('div');el.id='sb-loading';
    el.style.cssText='position:fixed;inset:0;background:rgba(246,245,242,.88);z-index:8000;display:none;align-items:center;justify-content:center;gap:12px;font-size:14px;font-weight:500;color:var(--tx2);font-family:DM Sans,sans-serif;backdrop-filter:blur(2px)';
    el.innerHTML='<div style="width:22px;height:22px;border:2.5px solid var(--bd2);border-top-color:var(--acc);border-radius:50%;animation:sp .7s linear infinite"></div>Carregando dados…';
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
    
    // PROTEÇÃO: Garante que as "gavetas" existem antes de guardar os dados
    if(!D.produtos) D.produtos = {}; D.produtos[filId]=prods||[];
    if(!D.clientes) D.clientes = {}; D.clientes[filId]=clis||[];
    if(!D.pedidos) D.pedidos = {}; D.pedidos[filId]=peds||[];
    if(!D.fornecedores) D.fornecedores = {}; D.fornecedores[filId]=forns||[];
    
    if(!D.cotPrecos) D.cotPrecos = {}; D.cotPrecos[filId]={};
    (precos||[]).forEach(p=>{D.cotPrecos[filId][p.produto_id+'_'+p.fornecedor_id]=p.preco;});
    
    const logs=cfg?.logs?(typeof cfg.logs==='string'?JSON.parse(cfg.logs):cfg.logs):[];
    if(!D.cotConfig) D.cotConfig = {};
    D.cotConfig[filId]={filial_id:filId,locked:cfg?.locked||false,logs};
    
    if(!D.movs) D.movs = {}; D.movs[filId]=movs||[];
  }catch(e){toast('Erro ao carregar: '+e.message);console.error(e);}
  showLoading(false);
}

// ═══════════════════════════
// HELPERS
// ═══════════════════════════
function fmt(v){return'R$ '+Number(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function fmtK(v){return v>=1000?'R$ '+(v/1000).toFixed(1)+'k':'R$ '+v.toFixed(0);}
function fmtN(v,d=2){return Number(v).toFixed(d);}
function fmtQ(v){return Number(v)%1===0?String(Number(v)):Number(v).toFixed(2);}
function pct(v){return Number(v).toFixed(1)+'%';}
function mk2mg(mk){return mk<=0?0:mk/(1+mk/100)*100;}
function mg2mk(mg){return mg<=0||mg>=100?0:mg/(1-mg/100)-100;}
function prV(c,mk){return c*(1+mk/100);}
function norm(s){return String(s).toLowerCase().trim();}
const MES=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const CORES=['#163F80','#156038','#7A4E00','#9B2D24','#5B3F99','#1A6B7A'];

function toast(m){
  const el=document.getElementById('toast');
  el.textContent=m; el.classList.add('on');
  clearTimeout(window._tt);
  window._tt=setTimeout(()=>el.classList.remove('on'),2600);
}

function abrirModal(id){
  document.getElementById(id).classList.add('on');
  document.body.style.overflow='hidden';
}
function fecharModal(id){
  document.getElementById(id).classList.remove('on');
  document.body.style.overflow='';
}

function mostrarTela(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  window.scrollTo(0,0);
}

function renderSetupGrid(){
  const grid=document.getElementById('fil-grid');
  const form=document.getElementById('setup-form');
  const actions=document.getElementById('setup-actions');
  const sub=document.getElementById('setup-sub');
  if(!D.filiais.length){
    grid.innerHTML='';form.style.display='block';actions.style.display='none';
    sub.textContent='Crie sua primeira filial para começar';return;
  }
  form.style.display='none';actions.style.display='flex';
  sub.textContent='Selecione a filial para continuar';
  grid.innerHTML=D.filiais.map(f=>`
    <div class="fil-opt ${State.selFil===f.id?'sel':''}" onclick="selFilial('${f.id}')">
      <div class="fil-dot" style="background:${f.cor}"></div>
      <div><div class="fil-name">${f.nome}</div><div class="fil-city">${f.cidade||''}${f.estado?' - '+f.estado:''}</div></div>
    </div>`).join('');
}

async function renderSetup(){
  mostrarTela('screen-setup');
  showLoading(true);
  try{ D.filiais = await SB.getFiliais() || []; } catch(e){ toast('Erro ao buscar filiais: '+e.message); }
  showLoading(false);
  renderSetupGrid();
}

function selFilial(id){State.selFil=id;renderSetupGrid();}

async function criarPrimeiraFilial(){
  const nome=document.getElementById('sf-nome').value.trim();
  if(!nome){toast('Informe o nome da filial.');return;}
  const f={id:uid(),nome,cidade:document.getElementById('sf-cidade').value.trim(),estado:document.getElementById('sf-estado').value.trim(),cor:document.getElementById('sf-cor').value,endereco:''};
  try{await SB.upsertFilial(f);}catch(e){toast('Erro ao criar filial: '+e.message);return;}
  D.filiais.push(f);
  State.selFil=f.id;
  await entrar();
}

async function entrar(){
  if(!State.selFil){toast('Selecione uma filial.');return;}
  try{D.filiais=await SB.getFiliais()||[];}catch(e){}
  const f=D.filiais.find(x=>x.id===State.selFil);
  if(!f){toast('Filial não encontrada.');return;}
  State.FIL=State.selFil;
  document.getElementById('sb-dot').style.background=f.cor;
  document.getElementById('sb-fname').textContent=f.nome;
  await carregarDadosFilial(State.FIL);
  mostrarTela('screen-app');
  refreshProdSel();refreshCliDL();renderFornSel();refreshMovSel();refreshDestSel();
  renderDashFilSel();renderDash();atualizarBadgeEst();
  ir('dashboard');
}

function voltarSetup(){renderSetup();}

function ir(p){
  fecharSb();
  document.querySelectorAll('.ni').forEach(n=>n.classList.toggle('on',n.dataset.p===p));
  document.querySelectorAll('.pg').forEach(x=>x.classList.remove('on'));
  document.getElementById('pg-'+p).classList.add('on');
  document.querySelectorAll('.mob-btn').forEach(b=>b.classList.toggle('on',b.id==='mob-'+p));
  const renderMap={
    dashboard:renderDash,produtos:()=>{renderProdMet();renderProdutos();},clientes:()=>{renderCliMet();renderClientes();},
    pedidos:()=>{renderPedMet();renderPedidos();},cotacao:()=>{renderFornSel();renderCotForns();renderCotLogs();},
    estoque:()=>{renderEstAlerts();renderEstPosicao();},filiais:()=>{renderFilMet();renderFilLista();}
  };
  if(renderMap[p])renderMap[p]();
  window.scrollTo(0,0);
}

function switchTab(grp,name){
  const prefix=grp+'-tc-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(t=>t.classList.remove('on'));
  document.getElementById(prefix+name).classList.add('on');
  document.querySelectorAll(`#pg-${grp} .tb`).forEach((b,i)=>{
    const ids=Array.from(document.querySelectorAll(`[id^="${prefix}"]`)).map(t=>t.id.replace(prefix,''));
    b.classList.toggle('on',ids[i]===name);
  });
}

function abrirSb(){document.getElementById('sb').classList.add('on');document.getElementById('sb-overlay').classList.add('on');document.getElementById('sb-close').style.display='flex';}
function fecharSb(){document.getElementById('sb').classList.remove('on');document.getElementById('sb-overlay').classList.remove('on');document.getElementById('sb-close').style.display='none';}

function limparFormFilial(){
  State.editIds.filial=null;
  document.getElementById('filial-modal-titulo').textContent='Nova filial';
  ['fil-nome','fil-cidade','fil-estado','fil-end'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('fil-cor').value=CORES[D.filiais.length%CORES.length];
}
function editarFilial(id){
  const f=D.filiais.find(x=>x.id===id);if(!f)return;
  State.editIds.filial=id;
  document.getElementById('filial-modal-titulo').textContent='Editar filial';
  document.getElementById('fil-nome').value=f.nome;
  document.getElementById('fil-cidade').value=f.cidade||'';
  document.getElementById('fil-estado').value=f.estado||'';
  document.getElementById('fil-end').value=f.endereco||'';
  document.getElementById('fil-cor').value=f.cor;
  abrirModal('modal-filial');
}
async function salvarFilial(){
  const nome=document.getElementById('fil-nome').value.trim();if(!nome){toast('Informe o nome.');return;}
  const f={id:State.editIds.filial||uid(),nome,cidade:document.getElementById('fil-cidade').value.trim(),estado:document.getElementById('fil-estado').value.trim(),endereco:document.getElementById('fil-end').value.trim(),cor:document.getElementById('fil-cor').value};
  try{await SB.upsertFilial(f);}catch(e){toast('Erro: '+e.message);return;}
  fecharModal('modal-filial');renderSetup().then(()=>{renderFilLista();renderFilMet();renderDashFilSel();});
  toast(State.editIds.filial?'Filial atualizada!':'Filial criada!');
}
async function removerFilial(id){
  if(!confirm('Remover filial e dados?'))return;
  try{await SB.deleteFilial(id);}catch(e){toast('Erro: '+e.message);return;}
  D.filiais=D.filiais.filter(f=>f.id!==id);
  renderFilLista();renderFilMet();renderSetup().then(()=>renderDashFilSel());toast('Filial removida.');
}
function renderFilMet(){
  document.getElementById('fil-met').innerHTML=`<div class="met"><div class="ml">Filiais</div><div class="mv">${D.filiais.length}</div></div><div class="met"><div class="ml">Total produtos</div><div class="mv">${Object.values(D.produtos).flat().length}</div></div><div class="met"><div class="ml">Total pedidos</div><div class="mv">${Object.values(D.pedidos).flat().length}</div></div>`;
}
function renderFilLista(){
  const el=document.getElementById('fil-lista');
  if(!D.filiais.length){el.innerHTML=`<div class="empty"><div class="ico">🏢</div><p>Nenhuma filial cadastrada.</p></div>`;return;}
  el.innerHTML=D.filiais.map(f=>{
    const prods=(D.produtos[f.id]||[]).length;const clis=(D.clientes[f.id]||[]).length;const peds=(D.pedidos[f.id]||[]).length;const ativa=f.id===State.FIL;
    return`<div class="card fb" style="${ativa?'border-color:var(--acc)':''}">
      <div style="display:flex;align-items:center;gap:12px;flex:1"><div style="width:14px;height:14px;border-radius:50%;background:${f.cor};flex-shrink:0"></div><div><div style="font-weight:600;font-size:15px">${f.nome}${ativa?` <span class="bdg bb" style="font-size:10px;vertical-align:middle">Ativa</span>`:''}</div><div style="font-size:12px;color:var(--tx3)">${f.cidade||''}${f.estado?' - '+f.estado:''}</div><div style="display:flex;gap:6px;margin-top:6px"><span class="bdg bk">${prods} produto(s)</span><span class="bdg bk">${clis} cliente(s)</span><span class="bdg bk">${peds} pedido(s)</span></div></div></div>
      <div class="fg2">${!ativa?`<button class="btn btn-sm" onclick="trocarFilial('${f.id}')">Selecionar</button>`:''}<button class="ib" onclick="editarFilial('${f.id}')">✏</button><button class="ib" onclick="removerFilial('${f.id}')">✕</button></div></div>`;
  }).join('');
}
async function trocarFilial(id){State.selFil=id;await entrar();await renderSetup();toast('Filial alterada!');}

function getRange(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  if(State.dashP==='semana'){const d=new Date(now);d.setDate(d.getDate()-d.getDay()+1);d.setHours(0,0,0,0);return[d,now];}
  if(State.dashP==='mes')return[new Date(y,m,1),now];
  if(State.dashP==='ano')return[new Date(y,0,1),now];
  return[new Date(2000,0,1),now];
}
function inR(ds,[from,to]){if(!ds)return false;const d=new Date(ds+'T00:00:00');return d>=from&&d<=to;}
function setP(p,btn){
  State.dashP=p;
  document.querySelectorAll('#dash-pseg button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderDash();
}
function renderDashFilSel(){
  const s=document.getElementById('dash-fil');const cur=s.value;
  s.innerHTML='<option value="todas">Todas as filiais</option>'+D.filiais.map(f=>`<option value="${f.id}">${f.nome}</option>`).join('');
  s.value=cur||'todas';
}

function renderDash(){
  const fsel=document.getElementById('dash-fil')?.value||'todas';
  const range=getRange();
  const pLabels={semana:'Esta semana',mes:'Este mês',ano:'Este ano',tudo:'Todos os períodos'};
  const fLabel=fsel==='todas'?'Consolidado':D.filiais.find(f=>f.id===fsel)?.nome||'';
  document.getElementById('dash-desc').textContent=fLabel+' — '+pLabels[State.dashP];

  const filIds=fsel==='todas'?D.filiais.map(f=>f.id):[fsel];
  const allPeds=filIds.flatMap(fid=>(D.pedidos[fid]||[]).map(p=>({...p,_fid:fid})));
  const entregues=allPeds.filter(p=>p.status==='entregue'&&inR(p.data,range));
  const fat=entregues.reduce((a,p)=>a+(p.total||0),0);
  const lucro=entregues.reduce((a,p)=>a+(p.itens||[]).reduce((b,i)=>b+(i.preco-i.custo)*i.qty,0),0);
  const mg=fat>0?lucro/fat*100:0;const tk=entregues.length?fat/entregues.length:0;
  const abertos=allPeds.filter(p=>['orcamento','confirmado','em_separacao'].includes(p.status)).length;

  document.getElementById('dash-met').innerHTML=`<div class="met"><div class="ml">Faturamento</div><div class="mv" style="font-size:16px">${fmt(fat)}</div><div class="ms">${entregues.length} entregue(s)</div></div><div class="met"><div class="ml">Lucro bruto</div><div class="mv" style="font-size:16px;color:${lucro>=0?'var(--g)':'var(--r)'}">${fmt(lucro)}</div></div><div class="met"><div class="ml">Margem</div><div class="mv" style="color:${mg>=15?'var(--g)':mg>=8?'var(--a)':'var(--r)'}">${pct(mg)}</div></div><div class="met"><div class="ml">Ticket médio</div><div class="mv" style="font-size:16px">${fmt(tk)}</div></div><div class="met"><div class="ml">Em aberto</div><div class="mv" style="color:var(--a)">${abertos}</div></div>`;

  const saldos=calcSaldosMulti(filIds);
  const allProds=filIds.flatMap(fid=>(D.produtos[fid]||[]).map(p=>({...p,_fid:fid})));
  const crit=allProds.filter(p=>{const s=saldos[p._fid+'_'+p.id];return s&&s.saldo<=0;});
  const baixo=allProds.filter(p=>{const s=saldos[p._fid+'_'+p.id];return s&&p.emin>0&&s.saldo>0&&s.saldo<p.emin;});
  let ah='';
  if(crit.length)ah+=`<div class="alert al-r">🚨 <b>${crit.length} produto(s) zerado(s):</b> ${crit.slice(0,4).map(p=>p.nome).join(', ')}${crit.length>4?'…':''}</div>`;
  if(baixo.length)ah+=`<div class="alert al-a">⚠ <b>${baixo.length} abaixo do mínimo:</b> ${baixo.slice(0,4).map(p=>p.nome).join(', ')}${baixo.length>4?'…':''}</div>`;
  document.getElementById('dash-alerts').innerHTML=ah;

  const chartEl=document.getElementById('dash-chart');const emEl=document.getElementById('dash-chart-empty');
  const grupos={};
  entregues.forEach(p=>{const d=new Date(p.data+'T00:00:00');const k=State.dashP==='ano'?MES[d.getMonth()]+'/'+String(d.getFullYear()).slice(2):p.data;if(!grupos[k])grupos[k]={fat:0,lucro:0};grupos[k].fat+=p.total||0;grupos[k].lucro+=(p.itens||[]).reduce((a,i)=>a+(i.preco-i.custo)*i.qty,0);});
  const gkeys=Object.keys(grupos).sort().slice(-10);
  if(!gkeys.length){chartEl.style.display='none';emEl.style.display='block';}else{
    chartEl.style.display='flex';emEl.style.display='none';const mxF=Math.max(...gkeys.map(k=>grupos[k].fat),1);
    chartEl.innerHTML=gkeys.map(k=>{const g=grupos[k];const hF=Math.round(g.fat/mxF*100);const hL=Math.round(Math.max(0,g.lucro)/mxF*100);const lbl=State.dashP==='ano'?k:k.split('-').slice(1).join('/');return`<div class="bc-col"><div class="bc-val">${fmtK(g.fat)}</div><div style="display:flex;align-items:flex-end;gap:2px;flex:1;width:100%"><div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end"><div class="bc-bar" style="height:${hF}%;background:#163F80;opacity:.82"></div></div><div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end"><div class="bc-bar" style="height:${hL}%;background:#156038;opacity:.82"></div></div></div><div class="bc-lbl">${lbl}</div></div>`;}).join('');
  }

  const stMap={orcamento:0,confirmado:0,em_separacao:0,entregue:0,cancelado:0};allPeds.forEach(p=>{if(p.status in stMap)stMap[p.status]++;});
  const stLbl={orcamento:'Orçamento',confirmado:'Confirmado',em_separacao:'Em separação',entregue:'Entregue',cancelado:'Cancelado'};
  const stCls={orcamento:'bk',confirmado:'bb',em_separacao:'ba',entregue:'bg',cancelado:'br'};
  const tot=allPeds.length||1;
  document.getElementById('dash-status').innerHTML=Object.entries(stMap).map(([k,v])=>`<div class="rrow"><span class="bdg ${stCls[k]}">${stLbl[k]}</span><div class="rbar"><div class="rbar-f" style="width:${Math.round(v/tot*100)}%;background:var(--bd2)"></div></div><span style="font-size:13px;font-weight:600;min-width:20px;text-align:right">${v}</span></div>`).join('');

  const pq={};entregues.forEach(p=>(p.itens||[]).forEach(i=>{if(!pq[i.nome])pq[i.nome]={fat:0};pq[i.nome].fat+=i.qty*i.preco;}));
  const tp=Object.entries(pq).sort((a,b)=>b[1].fat-a[1].fat).slice(0,5);const mxP=tp.length?tp[0][1].fat:1;
  document.getElementById('dash-tp').innerHTML=tp.length?tp.map(([n,d],i)=>`<div class="rrow"><span class="rnum">${i+1}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:${i===0?600:400}">${n}</span><div class="rbar"><div class="rbar-f" style="width:${Math.round(d.fat/mxP*100)}%;background:#163F80"></div></div><span class="rval">${fmtK(d.fat)}</span></div>`).join(''):`<div class="empty" style="padding:12px"><p>Sem vendas</p></div>`;

  const alertProds=allProds.filter(p=>{const s=saldos[p._fid+'_'+p.id];return s&&p.emin>0&&s.saldo<p.emin;}).slice(0,5);
  document.getElementById('dash-ea').innerHTML=alertProds.length?alertProds.map(p=>{const s=saldos[p._fid+'_'+p.id];return`<div class="rrow"><span style="width:8px;height:8px;border-radius:50%;background:${s.saldo<=0?'var(--r)':'var(--a)'};flex-shrink:0;display:inline-block"></span><span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nome}</span><span class="bdg ${s.saldo<=0?'br':'ba'}" style="font-size:10px">${s.saldo<=0?'Zerado':fmtQ(s.saldo)}</span></div>`;}).join(''):`<div class="empty" style="padding:12px"><p>✓ Sem alertas</p></div>`;

  // PROTEÇÃO EXTRA AQUI: Se a gaveta ainda estiver vazia, ele lida bem usando o ?
  const fu={};filIds.forEach(fid=>(D.cotConfig?.[fid]?.logs||[]).forEach(l=>{if(!fu[l.forn])fu[l.forn]=0;fu[l.forn]++;}));
  const tf=Object.entries(fu).sort((a,b)=>b[1]-a[1]).slice(0,5);const mxF2=tf.length?tf[0][1]:1;
  document.getElementById('dash-forn').innerHTML=tf.length?tf.map(([n,c],i)=>`<div class="rrow"><span class="rnum">${i+1}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</span><div class="rbar"><div class="rbar-f" style="width:${Math.round(c/mxF2*100)}%;background:#156038"></div></div><span class="rval" style="color:var(--tx2)">${c}x</span></div>`).join(''):`<div class="empty" style="padding:12px"><p>Nenhuma importação</p></div>`;

  const mp={};entregues.forEach(p=>(p.itens||[]).forEach(i=>{if(!mp[i.nome])mp[i.nome]={fat:0,lucro:0,qty:0};mp[i.nome].fat+=i.qty*i.preco;mp[i.nome].lucro+=(i.preco-i.custo)*i.qty;mp[i.nome].qty+=i.qty;}));
  const tmg=Object.entries(mp).sort((a,b)=>b[1].fat-a[1].fat).slice(0,8);
  document.getElementById('dash-margem').innerHTML=tmg.length?`<div class="tw"><table class="tbl"><thead><tr><th>Produto</th><th style="text-align:right">Qtd</th><th style="text-align:right">Faturamento</th><th style="text-align:right">Lucro</th><th style="text-align:right">Margem</th><th>Status</th></tr></thead><tbody>${tmg.map(([n,d])=>{const mgv=d.fat>0?d.lucro/d.fat*100:0;return`<tr><td style="font-weight:600">${n}</td><td style="text-align:right;color:var(--tx2)">${fmtN(d.qty,1)}</td><td style="text-align:right">${fmt(d.fat)}</td><td style="text-align:right;color:var(--g)">${fmt(d.lucro)}</td><td style="text-align:right;font-weight:600">${pct(mgv)}</td><td><span class="bdg ${mgv>=20?'bg':mgv>=10?'ba':'br'}">${mgv>=20?'Boa':mgv>=10?'Regular':'Baixa'}</span></td></tr>`;}).join('')}</tbody></table></div>`:`<div class="empty" style="padding:12px"><p>Sem vendas no período</p></div>`;
}

function renderProdMet(){
  const prods=P();const cats=[...new Set(prods.map(p=>p.cat).filter(Boolean))];
  document.getElementById('prod-met').innerHTML=`<div class="met"><div class="ml">Produtos</div><div class="mv">${prods.length}</div></div><div class="met"><div class="ml">Categorias</div><div class="mv">${cats.length}</div></div><div class="met"><div class="ml">Com precificação</div><div class="mv">${prods.filter(p=>p.mkv>0).length}</div></div>`;
  const sel=document.getElementById('prod-cat-fil');const cur=sel.value;
  sel.innerHTML='<option value="">Todas as categorias</option>'+cats.sort().map(c=>`<option value="${c}">${c}</option>`).join('');
  sel.value=cur;
}
function renderProdutos(){
  const q=(document.getElementById('prod-busca').value||'').toLowerCase();
  const cat=document.getElementById('prod-cat-fil').value;
  const saldos=calcSaldos();
  const f=P().filter(p=>(!q||p.nome.toLowerCase().includes(q)||(p.sku||'').toLowerCase().includes(q))&&(!cat||p.cat===cat));
  const el=document.getElementById('prod-lista');
  if(!f.length){el.innerHTML=`<div class="empty"><div class="ico">📦</div><p>${P().length?'Nenhum encontrado.':'Cadastre o primeiro produto desta filial.'}</p></div>`;return;}
  el.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Nome</th><th>SKU</th><th>Un</th><th>Cat.</th><th>Custo</th><th>Varejo</th><th>Atacado</th><th>Saldo</th><th>Mín.</th><th></th></tr></thead><tbody>${f.map(p=>{
    const pv=prV(p.custo,p.mkv);const pa=p.pfa>0?p.pfa:(p.mka>0?prV(p.custo,p.mka):0);const s=saldos[p.id]||{saldo:0,cm:0};
    const zero=s.saldo<=0,baixo=p.emin>0&&s.saldo>0&&s.saldo<p.emin;
    return`<tr><td style="font-weight:600">${p.nome}</td><td style="color:var(--tx3);font-size:12px">${p.sku||'—'}</td><td>${p.un}</td><td>${p.cat?`<span class="bdg bk">${p.cat}</span>`:'—'}</td><td>${fmt(p.custo)}</td><td>${p.mkv>0?`${fmt(pv)} <span class="bdg bb" style="font-size:10px">${p.mkv.toFixed(0)}%</span>`:'—'}</td><td>${pa>0?fmt(pa):'—'}</td><td><span style="font-weight:600;color:${zero?'var(--r)':baixo?'var(--a)':'inherit'}">${fmtQ(s.saldo)} ${p.un}</span></td><td style="color:var(--tx2)">${p.emin>0?fmtQ(p.emin):'—'}</td><td><div class="fg2"><button class="ib" onclick="abrirMovProd('${p.id}')">📥</button><button class="ib" onclick="editarProd('${p.id}')">✏</button><button class="ib" onclick="removerProd('${p.id}')">✕</button></div></td></tr>`; }).join('')}</tbody></table></div>`;
}
function limparFormProd(){
  State.editIds.prod=null;document.getElementById('prod-modal-titulo').textContent='Novo produto';
  ['p-nome','p-sku','p-cat','p-mkv','p-mgv','p-qtmin','p-dv','p-mka','p-mga','p-pfa','p-da','p-emin','p-esal','p-ecm','p-custo'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('p-un').value='un';document.getElementById('prod-preview').style.display='none';
  const histEl = document.getElementById('p-hist-cot'); if(histEl) histEl.style.display = 'none';
}

function editarProd(id){
  const p=P().find(x=>x.id===id);if(!p)return;
  State.editIds.prod=id;document.getElementById('prod-modal-titulo').textContent='Editar produto';
  document.getElementById('p-nome').value=p.nome;document.getElementById('p-sku').value=p.sku||'';
  document.getElementById('p-un').value=p.un;document.getElementById('p-cat').value=p.cat||'';
  document.getElementById('p-custo').value=p.custo;document.getElementById('p-mkv').value=p.mkv.toFixed(1);
  document.getElementById('p-mgv').value=mk2mg(p.mkv).toFixed(1);document.getElementById('p-qtmin').value=p.qtmin||'';
  document.getElementById('p-dv').value=p.dv||'';document.getElementById('p-mka').value=p.mka.toFixed(1);
  document.getElementById('p-mga').value=mk2mg(p.mka).toFixed(1);document.getElementById('p-pfa').value=p.pfa||'';
  document.getElementById('p-da').value=p.da||'';document.getElementById('p-emin').value=p.emin||'';
  document.getElementById('p-esal').value=p.esal||'';document.getElementById('p-ecm').value=p.ecm||'';
  
  let histEl = document.getElementById('p-hist-cot');
  if(!histEl) {
     histEl = document.createElement('div');
     histEl.id = 'p-hist-cot';
     histEl.className = 'panel';
     histEl.style.marginTop = '12px';
     const btnRow = document.querySelector('#modal-produto .modal-box > div:last-child');
     btnRow.parentNode.insertBefore(histEl, btnRow);
  }

  if(p.hist_cot && p.hist_cot.length > 0) {
      const sortedHist = [...p.hist_cot].sort((a,b) => b.mes.localeCompare(a.mes)); 
      histEl.innerHTML = `
      <div class="pt">Oscilação de Preço do Fornecedor</div>
      <table class="tbl" style="margin-top:8px">
        <thead><tr><th>Mês ref.</th><th>Fornecedor</th><th>Preço Cotado</th></tr></thead>
        <tbody>
          ${sortedHist.map(h => `<tr><td>${h.mes.split('-').reverse().join('/')}</td><td>${h.forn}</td><td style="font-weight:600;color:var(--tx2)">${fmt(h.preco)}</td></tr>`).join('')}
        </tbody>
      </table>`;
      histEl.style.display = 'block';
  } else {
      histEl.style.display = 'none';
  }

  calcProdPreview();abrirModal('modal-produto');
}

function syncV(t){
  const mk=parseFloat(document.getElementById('p-mkv').value)||0;const mg=parseFloat(document.getElementById('p-mgv').value)||0;
  if(t==='mk'&&mk>0)document.getElementById('p-mgv').value=mk2mg(mk).toFixed(1);else if(t==='mg'&&mg>0)document.getElementById('p-mkv').value=mg2mk(mg).toFixed(1);calcProdPreview();
}
function syncA(t){
  const mk=parseFloat(document.getElementById('p-mka').value)||0;const mg=parseFloat(document.getElementById('p-mga').value)||0;
  if(t==='mk'&&mk>0)document.getElementById('p-mga').value=mk2mg(mk).toFixed(1);else if(t==='mg'&&mg>0)document.getElementById('p-mka').value=mg2mk(mg).toFixed(1);calcProdPreview();
}
function calcProdPreview(){
  const c=parseFloat(document.getElementById('p-custo').value)||0;const mkv=parseFloat(document.getElementById('p-mkv').value)||0;const mka=parseFloat(document.getElementById('p-mka').value)||0;const pfa=parseFloat(document.getElementById('p-pfa').value)||0;const dv=parseFloat(document.getElementById('p-dv').value)||0;const da=parseFloat(document.getElementById('p-da').value)||0;const prev=document.getElementById('prod-preview');
  if(c>0&&mkv>0){
    const pv=prV(c,mkv);const pa=pfa>0?pfa:(mka>0?prV(c,mka):0);
    document.getElementById('ppv-v').textContent=fmt(pv);document.getElementById('ppv-vmin').textContent=dv>0?fmt(pv*(1-dv/100)):'—';
    document.getElementById('ppv-a').textContent=pa>0?fmt(pa):'—';document.getElementById('ppv-amin').textContent=(pa>0&&da>0)?fmt(pa*(1-da/100)):'—';
    prev.style.display='block';
  } else prev.style.display='none';
}
async function salvarProduto(){
  const nome=document.getElementById('p-nome').value.trim();const custo=parseFloat(document.getElementById('p-custo').value)||0;
  if(!nome||custo<=0){toast('Nome e custo obrigatórios.');return;}
  
  const existing = State.editIds.prod ? P().find(x=>x.id===State.editIds.prod) : null;
  const p={
      id:State.editIds.prod||uid(), filial_id:State.FIL, nome, 
      sku:document.getElementById('p-sku').value.trim(), un:document.getElementById('p-un').value,
      cat:document.getElementById('p-cat').value.trim(), custo, 
      mkv:parseFloat(document.getElementById('p-mkv').value)||0, mka:parseFloat(document.getElementById('p-mka').value)||0,
      pfa:parseFloat(document.getElementById('p-pfa').value)||0, dv:parseFloat(document.getElementById('p-dv').value)||0,
      da:parseFloat(document.getElementById('p-da').value)||0, qtmin:parseFloat(document.getElementById('p-qtmin').value)||0,
      emin:parseFloat(document.getElementById('p-emin').value)||0, esal:parseFloat(document.getElementById('p-esal').value)||0,
      ecm:parseFloat(document.getElementById('p-ecm').value)||custo,
      hist_cot: existing ? (existing.hist_cot || []) : [] 
  };
  
  try{await SB.upsertProduto(p);}catch(e){toast('Erro: '+e.message);return;}
  if(State.editIds.prod)D.produtos[State.FIL]=P().map(x=>x.id===State.editIds.prod?p:x);else{if(!D.produtos[State.FIL])D.produtos[State.FIL]=[];D.produtos[State.FIL].push(p);}
  fecharModal('modal-produto');renderProdMet();renderProdutos();refreshProdSel();refreshMovSel();toast(State.editIds.prod?'Produto atualizado!':'Produto salvo!');
}
async function removerProd(id){
  if(!confirm('Remover produto?'))return;try{await SB.deleteProduto(id);}catch(e){toast('Erro: '+e.message);return;}
  D.produtos[State.FIL]=P().filter(p=>p.id!==id);D.movs[State.FIL]=(D.movs[State.FIL]||[]).filter(m=>m.prod_id!==id);
  renderProdMet();renderProdutos();toast('Removido.');
}
function refreshProdSel(){const s=document.getElementById('pi-prod');const cur=s.value;s.innerHTML='<option value="">— selecione —</option>'+P().map(p=>`<option value="${p.id}">${p.nome} (${p.un})</option>`).join('');s.value=cur;}

const AVC=[{bg:'#E6EEF9',c:'#0F2F5E'},{bg:'#E6F4EC',c:'#0D3D22'},{bg:'#FAF0D6',c:'#5C3900'},{bg:'#FAEBE9',c:'#731F18'}];
function avc(n){return AVC[n.charCodeAt(0)%AVC.length];}
function ini(n){const p=n.trim().split(' ');return(p[0][0]+(p[1]?p[1][0]:'')).toUpperCase();}
const ST_B={ativo:'<span class="bdg bg">Ativo</span>',inativo:'<span class="bdg bk">Inativo</span>',prospecto:'<span class="bdg bb">Prospecto</span>'};

function renderCliMet(){
  const c=C();const a=c.filter(x=>x.status==='ativo').length;const pr=c.filter(x=>x.status==='prospecto').length;
  const segs=[...new Set(c.map(x=>x.seg).filter(Boolean))].length;
  document.getElementById('cli-met').innerHTML=`<div class="met"><div class="ml">Total</div><div class="mv">${c.length}</div></div><div class="met"><div class="ml">Ativos</div><div class="mv">${a}</div></div><div class="met"><div class="ml">Prospectos</div><div class="mv">${pr}</div></div><div class="met"><div class="ml">Segmentos</div><div class="mv">${segs}</div></div>`;
  const sel=document.getElementById('cli-fil-seg');const cur=sel.value;
  sel.innerHTML='<option value="">Todos os segmentos</option>'+[...new Set(c.map(x=>x.seg).filter(Boolean))].sort().map(s=>`<option value="${s}">${s}</option>`).join('');
  sel.value=cur;
}
function renderClientes(){
  const q=(document.getElementById('cli-busca').value||'').toLowerCase();const seg=document.getElementById('cli-fil-seg').value;const st=document.getElementById('cli-fil-st').value;
  const f=C().filter(c=>(!q||c.nome.toLowerCase().includes(q)||(c.apelido||'').toLowerCase().includes(q))&&(!seg||c.seg===seg)&&(!st||c.status===st));
  const el=document.getElementById('cli-lista');
  if(!f.length){el.innerHTML=`<div class="empty"><div class="ico">👥</div><p>${C().length?'Nenhum encontrado.':'Clique em "+ Novo cliente".'}</p></div>`;return;}
  const tabLbl={padrao:'Padrão',especial:'<span class="bdg ba">Especial</span>',vip:'<span class="bdg br">VIP</span>'};
  const prazoLbl={a_vista:'À vista','7d':'7d','15d':'15d','30d':'30d','60d':'60d'};
  el.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th></th><th>Nome</th><th>Contato</th><th>Segmento</th><th>Tabela</th><th>Prazo</th><th>Status</th><th></th></tr></thead><tbody>${f.map(c=>{
    const cor=avc(c.nome);
    return`<tr><td><div class="av" style="background:${cor.bg};color:${cor.c}">${ini(c.nome)}</div></td><td><div style="font-weight:600">${c.nome}</div>${c.apelido?`<div style="font-size:11px;color:var(--tx3)">${c.apelido}</div>`:''}</td><td><div>${c.tel||'—'}</div>${c.email?`<div style="font-size:11px;color:var(--tx3)">${c.email}</div>`:''}</td><td>${c.seg?`<span class="bdg bk">${c.seg}</span>`:'—'}</td><td>${tabLbl[c.tab]||'—'}</td><td style="color:var(--tx2)">${prazoLbl[c.prazo]||'—'}</td><td>${ST_B[c.status]||''}</td><td><div class="fg2"><button class="ib" onclick="abrirCliDet('${c.id}')">👁</button><button class="ib" onclick="editarCli('${c.id}')">✏</button><button class="ib" onclick="removerCli('${c.id}')">✕</button></div></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function renderCliSegs(){
  const segs=[...new Set(C().map(c=>c.seg||'Sem segmento'))].sort();
  document.getElementById('cli-segs-lista').innerHTML=segs.map(seg=>{
    const cls=C().filter(c=>(c.seg||'Sem segmento')===seg);
    return`<div class="card"><div class="fb" style="margin-bottom:10px"><div style="font-weight:600">${seg}</div><span class="bdg bb">${cls.length}</span></div><div class="fg2">${cls.map(c=>`<div onclick="abrirCliDet('${c.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--bd);border-radius:var(--rad);cursor:pointer;transition:all .12s" onmouseover="this.style.background='var(--surf2)'" onmouseout="this.style.background=''"><div class="av" style="width:26px;height:26px;font-size:11px;background:${avc(c.nome).bg};color:${avc(c.nome).c}">${ini(c.nome)}</div><span style="font-size:13px;font-weight:500">${c.apelido||c.nome}</span></div>`).join('')}</div></div>`;
  }).join('');
}
async function abrirCliDet(id){
  const c=C().find(x=>x.id===id);if(!c)return;const cor=avc(c.nome);
  let notas=[];try{notas=await SB.getNotas(id)||[];}catch(e){}
  const prazoLbl={a_vista:'À vista','7d':'7 dias','15d':'15 dias','30d':'30 dias','60d':'60 dias'};
  document.getElementById('cli-det-box').innerHTML=`
    <div class="fb" style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:12px"><div class="av" style="width:44px;height:44px;font-size:16px;background:${cor.bg};color:${cor.c}">${ini(c.nome)}</div><div><div style="font-size:16px;font-weight:600">${c.nome}</div>${c.apelido?`<div style="font-size:13px;color:var(--tx2)">${c.apelido}</div>`:''}<div style="margin-top:4px">${ST_B[c.status]||''}</div></div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;font-size:13px"><div><div style="font-size:11px;font-weight:600;color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Contato</div>${[c.resp&&`Resp: ${c.resp}`,c.tel,c.email,c.cidade&&`${c.cidade}${c.estado?' - '+c.estado:''}`].filter(Boolean).map(x=>`<div style="margin-bottom:3px">${x}</div>`).join('')||'—'}</div><div><div style="font-size:11px;font-weight:600;color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Comercial</div><div>Tabela: ${{padrao:'Padrão',especial:'Especial',vip:'VIP'}[c.tab]||'—'}</div><div>Prazo: ${prazoLbl[c.prazo]||'—'}</div>${c.seg?`<div>Segmento: ${c.seg}</div>`:''}</div></div>
    ${c.obs?`<div class="panel" style="margin-bottom:12px"><div class="pt">Observações</div><p style="font-size:13px">${c.obs}</p></div>`:''}
    <div style="font-size:11px;font-weight:600;color:var(--tx3);text-transform:uppercase;margin-bottom:8px">Notas / histórico</div>
    <div class="fg2" style="margin-bottom:8px"><input class="inp" id="nota-inp-${id}" placeholder="Adicionar nota..." style="flex:1"><button class="btn btn-sm" onclick="addNota('${id}')">+</button></div>
    <div id="notas-${id}">${notas.length?notas.map(n=>`<div class="nota"><div>${n.texto}</div><div class="nota-d">${n.data}</div></div>`).join(''):'<div style="font-size:13px;color:var(--tx3)">Nenhuma nota.</div>'}</div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" onclick="fecharModal('modal-cli-det')">Fechar</button><button class="btn btn-p" onclick="fecharModal('modal-cli-det');editarCli('${id}')">Editar</button></div>`;
  abrirModal('modal-cli-det');
}
async function addNota(id){
  const inp=document.getElementById('nota-inp-'+id);const txt=(inp.value||'').trim();if(!txt)return;
  const nota={cliente_id:id,texto:txt,data:new Date().toLocaleString('pt-BR')};
  try{await SB.insertNota(nota);}catch(e){toast('Erro: '+e.message);return;}
  if(!D.notas)D.notas={};if(!D.notas[id])D.notas[id]=[];D.notas[id].unshift(nota);inp.value='';
  document.getElementById('notas-'+id).innerHTML=D.notas[id].map(n=>`<div class="nota"><div>${n.texto}</div><div class="nota-d">${n.data}</div></div>`).join('');
  toast('Nota adicionada!');
}
function limparFormCli(){
  State.editIds.cli=null;document.getElementById('cli-modal-titulo').textContent='Novo cliente';
  ['c-nome','c-apelido','c-doc','c-tel','c-email','c-resp','c-seg','c-cidade','c-estado','c-obs'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('c-tipo').value='PJ';document.getElementById('c-status').value='ativo';document.getElementById('c-tab').value='padrao';document.getElementById('c-prazo').value='a_vista';
}
function editarCli(id){
  const c=C().find(x=>x.id===id);if(!c)return;
  State.editIds.cli=id;document.getElementById('cli-modal-titulo').textContent='Editar cliente';
  document.getElementById('c-nome').value=c.nome;document.getElementById('c-apelido').value=c.apelido||'';
  document.getElementById('c-doc').value=c.doc||'';document.getElementById('c-tipo').value=c.tipo||'PJ';
  document.getElementById('c-status').value=c.status;document.getElementById('c-tel').value=c.tel||'';
  document.getElementById('c-email').value=c.email||'';document.getElementById('c-resp').value=c.resp||'';
  document.getElementById('c-seg').value=c.seg||'';document.getElementById('c-tab').value=c.tab||'padrao';
  document.getElementById('c-prazo').value=c.prazo||'a_vista';document.getElementById('c-cidade').value=c.cidade||'';
  document.getElementById('c-estado').value=c.estado||'';document.getElementById('c-obs').value=c.obs||'';
  abrirModal('modal-cliente');
}
async function salvarCliente(){
  const nome=document.getElementById('c-nome').value.trim();if(!nome){toast('Informe o nome.');return;}
  const c={id:State.editIds.cli||uid(),filial_id:State.FIL,nome,apelido:document.getElementById('c-apelido').value.trim(),doc:document.getElementById('c-doc').value.trim(),tipo:document.getElementById('c-tipo').value,status:document.getElementById('c-status').value,tel:document.getElementById('c-tel').value.trim(),email:document.getElementById('c-email').value.trim(),resp:document.getElementById('c-resp').value.trim(),seg:document.getElementById('c-seg').value.trim(),tab:document.getElementById('c-tab').value,prazo:document.getElementById('c-prazo').value,cidade:document.getElementById('c-cidade').value.trim(),estado:document.getElementById('c-estado').value.trim(),obs:document.getElementById('c-obs').value.trim()};
  try{await SB.upsertCliente(c);}catch(e){toast('Erro: '+e.message);return;}
  if(State.editIds.cli)D.clientes[State.FIL]=C().map(x=>x.id===State.editIds.cli?c:x);else{if(!D.clientes[State.FIL])D.clientes[State.FIL]=[];D.clientes[State.FIL].push(c);}
  fecharModal('modal-cliente');renderCliMet();renderClientes();refreshCliDL();toast(State.editIds.cli?'Atualizado!':'Cliente cadastrado!');
}
async function removerCli(id){if(!confirm('Remover?'))return;try{await SB.deleteCliente(id);}catch(e){toast('Erro: '+e.message);return;}D.clientes[State.FIL]=C().filter(c=>c.id!==id);renderCliMet();renderClientes();toast('Removido.');}
function refreshCliDL(){const dl=document.getElementById('cli-dl');if(dl)dl.innerHTML=C().map(c=>`<option value="${c.nome}">`).join('');}

const ST_PED={orcamento:'<span class="bdg bk">Orçamento</span>',confirmado:'<span class="bdg bb">Confirmado</span>',em_separacao:'<span class="bdg ba">Em separação</span>',entregue:'<span class="bdg bg">Entregue</span>',cancelado:'<span class="bdg br">Cancelado</span>'};
function renderPedMet(){
  const peds=PD();const fat=peds.filter(p=>p.status==='entregue').reduce((a,p)=>a+(p.total||0),0);const lucro=peds.filter(p=>p.status==='entregue').reduce((a,p)=>a+(p.itens||[]).reduce((b,i)=>b+(i.preco-i.custo)*i.qty,0),0);const ab=peds.filter(p=>['orcamento','confirmado','em_separacao'].includes(p.status)).length;
  document.getElementById('ped-met').innerHTML=`<div class="met"><div class="ml">Total</div><div class="mv">${peds.length}</div></div><div class="met"><div class="ml">Faturamento</div><div class="mv" style="font-size:16px">${fmt(fat)}</div></div><div class="met"><div class="ml">Lucro</div><div class="mv" style="font-size:16px;color:var(--g)">${fmt(lucro)}</div></div><div class="met"><div class="ml">Em aberto</div><div class="mv" style="color:var(--a)">${ab}</div></div>`;
}
function renderPedidos(){
  const q=(document.getElementById('ped-busca').value||'').toLowerCase();const st=document.getElementById('ped-fil-st').value;
  const f=[...PD()].sort((a,b)=>b.num-a.num).filter(p=>(!q||p.cli.toLowerCase().includes(q)||String(p.num).includes(q))&&(!st||p.status===st));
  const el=document.getElementById('ped-lista');
  if(!f.length){el.innerHTML=`<div class="empty"><div class="ico">🛒</div><p>${PD().length?'Nenhum encontrado.':'Nenhum pedido ainda.'}</p></div>`;return;}
  const pgtoLbl={a_vista:'À vista',pix:'PIX',boleto:'Boleto',cartao:'Cartão',cheque:'Cheque'};
  el.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Nº</th><th>Cliente</th><th>Data</th><th>Tipo</th><th>Itens</th><th>Total</th><th>Pgto</th><th>Status</th><th></th></tr></thead><tbody>${f.map(p=>`<tr><td style="font-weight:600;color:var(--tx2)">#${p.num}</td><td style="font-weight:600">${p.cli}</td><td style="color:var(--tx2)">${p.data||'—'}</td><td>${p.tipo==='atacado'?'<span class="bdg ba">Atacado</span>':'<span class="bdg bb">Varejo</span>'}</td><td style="color:var(--tx2)">${p.itens.length}</td><td style="font-weight:600">${fmt(p.total)}</td><td style="font-size:12px;color:var(--tx2)">${pgtoLbl[p.pgto]||p.pgto}</td><td>${ST_PED[p.status]||''}</td><td><div class="fg2"><button class="ib" onclick="verPed('${p.id}')">👁</button><button class="ib" onclick="editarPed('${p.id}')">✏</button><button class="ib" onclick="removerPed('${p.id}')">✕</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function limparFormPed(){
  State.editIds.ped=null;State.pedItens=[];document.getElementById('ped-modal-titulo').textContent='Novo pedido';
  ['pd-cli','pd-obs'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('pd-data').value=new Date().toISOString().split('T')[0];
  document.getElementById('pd-status').value='orcamento';document.getElementById('pd-pgto').value='a_vista';
  document.getElementById('pd-prazo').value='imediato';document.getElementById('pd-tipo').value='varejo';
  document.getElementById('pi-prod').value='';document.getElementById('pi-qty').value=1;document.getElementById('pi-preco').value='';
  refreshProdSel();refreshCliDL();renderItens();
}
function editarPed(id){
  const p=PD().find(x=>x.id===id);if(!p)return;
  State.editIds.ped=id;State.pedItens=[...p.itens.map(i=>({...i}))];
  document.getElementById('ped-modal-titulo').textContent='Editar pedido #'+p.num;
  document.getElementById('pd-cli').value=p.cli;document.getElementById('pd-data').value=p.data;
  document.getElementById('pd-status').value=p.status;document.getElementById('pd-pgto').value=p.pgto;
  document.getElementById('pd-prazo').value=p.prazo;document.getElementById('pd-tipo').value=p.tipo;document.getElementById('pd-obs').value=p.obs||'';
  refreshProdSel();refreshCliDL();renderItens();abrirModal('modal-pedido');
}
function addItem(){
  const pid=document.getElementById('pi-prod').value;const qty=parseFloat(document.getElementById('pi-qty').value)||1;
  const pm=parseFloat(document.getElementById('pi-preco').value)||0;const orig=document.getElementById('pi-orig').value;
  if(!pid){toast('Selecione um produto.');return;}const prod=P().find(p=>p.id===pid);if(!prod)return;
  const tipo=document.getElementById('pd-tipo').value;const pa=tipo==='atacado'&&(prod.mka>0||prod.pfa>0)?(prod.pfa>0?prod.pfa:prV(prod.custo,prod.mka)):prV(prod.custo,prod.mkv);
  const pf=pm>0?pm:(isNaN(pa)||pa<=0?prod.custo:pa);
  State.pedItens.push({prodId:pid,nome:prod.nome,un:prod.un,qty,preco:pf,custo:prod.custo,orig});
  document.getElementById('pi-prod').value='';document.getElementById('pi-qty').value=1;document.getElementById('pi-preco').value='';renderItens();
}
function remItem(i){State.pedItens.splice(i,1);renderItens();}
function renderItens(){
  const el=document.getElementById('ped-itens');const tb=document.getElementById('ped-total');
  if(!State.pedItens.length){el.innerHTML='<div style="font-size:13px;color:var(--tx3);padding:8px 0">Nenhum item.</div>';tb.style.display='none';return;}
  const tot=State.pedItens.reduce((a,i)=>a+i.qty*i.preco,0);
  el.innerHTML=`<table class="tbl" style="margin-bottom:8px"><thead><tr><th>Produto</th><th>Origem</th><th>Qtd</th><th>Preço</th><th>Subtotal</th><th></th></tr></thead><tbody>${State.pedItens.map((it,i)=>`<tr><td style="font-weight:600">${it.nome}</td><td><span class="bdg ${it.orig==='estoque'?'bg':'bb'}">${it.orig==='estoque'?'Estoque':'Fornecedor'}</span></td><td>${it.qty} ${it.un}</td><td>${fmt(it.preco)}</td><td style="font-weight:600">${fmt(it.qty*it.preco)}</td><td><button class="ib" onclick="remItem(${i})">✕</button></td></tr>`).join('')}</tbody></table>`;
  document.getElementById('ped-total-val').textContent=fmt(tot);tb.style.display='block';
}
async function salvarPedido(){
  const cli=document.getElementById('pd-cli').value.trim();if(!cli){toast('Informe o cliente.');return;}
  if(!State.pedItens.length){toast('Adicione pelo menos um item.');return;}
  const total=State.pedItens.reduce((a,i)=>a+i.qty*i.preco,0);
  const peds=PD();const allNums=peds.map(p=>p.num).filter(n=>typeof n==='number'&&!isNaN(n));const nextNum=allNums.length?Math.max(...allNums)+1:1;
  const ped={id:State.editIds.ped||uid(),filial_id:State.FIL,num:State.editIds.ped?(peds.find(p=>p.id===State.editIds.ped)||{}).num||nextNum:nextNum,cli,data:document.getElementById('pd-data').value,status:document.getElementById('pd-status').value,pgto:document.getElementById('pd-pgto').value,prazo:document.getElementById('pd-prazo').value,tipo:document.getElementById('pd-tipo').value,obs:document.getElementById('pd-obs').value.trim(),itens:State.pedItens,total};
  const pedSB={...ped,itens:JSON.stringify(ped.itens)};
  try{await SB.upsertPedido(pedSB);}catch(e){toast('Erro: '+e.message);return;}
  if(State.editIds.ped)D.pedidos[State.FIL]=peds.map(p=>p.id===State.editIds.ped?ped:p);else{if(!D.pedidos[State.FIL])D.pedidos[State.FIL]=[];D.pedidos[State.FIL].push(ped);}
  fecharModal('modal-pedido');renderPedMet();renderPedidos();toast(State.editIds.ped?'Pedido atualizado!':'Pedido #'+ped.num+' criado!');
}
async function removerPed(id){if(!confirm('Remover pedido?'))return;try{await SB.deletePedido(id);}catch(e){toast('Erro: '+e.message);return;}D.pedidos[State.FIL]=PD().filter(p=>p.id!==id);renderPedMet();renderPedidos();toast('Removido.');}
function verPed(id){
  const p=PD().find(x=>x.id===id);if(!p)return;const lucro=p.itens.reduce((a,i)=>a+(i.preco-i.custo)*i.qty,0);
  const pgtoLbl={a_vista:'À vista',pix:'PIX',boleto:'Boleto',cartao:'Cartão',cheque:'Cheque'};const prazoLbl={imediato:'Imediato','7d':'7 dias','15d':'15 dias','30d':'30 dias','60d':'60 dias'};
  document.getElementById('ped-det-box').innerHTML=`
    <div class="fb" style="margin-bottom:16px"><div class="mt" style="margin:0">Pedido #${p.num}</div>${ST_PED[p.status]||''}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;font-size:13px">${[['Cliente',p.cli],['Data',p.data||'—'],['Tipo',p.tipo==='atacado'?'Atacado':'Varejo'],['Pagamento',pgtoLbl[p.pgto]||p.pgto],['Prazo',prazoLbl[p.prazo]||p.prazo],['Lucro estimado',`<span style="color:var(--g);font-weight:600">${fmt(lucro)}</span>`]].map(([l,v])=>`<div><div style="font-size:11px;color:var(--tx3)">${l}</div><div>${v}</div></div>`).join('')}</div>
    ${p.obs?`<div class="panel" style="margin-bottom:12px"><div class="pt">Observações</div><p style="font-size:13px">${p.obs}</p></div>`:''}
    <div class="tw"><table class="tbl"><thead><tr><th>Produto</th><th>Orig.</th><th>Qtd</th><th>Custo</th><th>Preço</th><th>Subtotal</th><th>Lucro</th></tr></thead><tbody>${p.itens.map(i=>`<tr><td style="font-weight:600">${i.nome}</td><td><span class="bdg ${i.orig==='estoque'?'bg':'bb'}" style="font-size:10px">${i.orig==='estoque'?'Est.':'Forn.'}</span></td><td>${i.qty} ${i.un}</td><td style="color:var(--tx2)">${fmt(i.custo)}</td><td>${fmt(i.preco)}</td><td style="font-weight:600">${fmt(i.qty*i.preco)}</td><td style="color:var(--g)">${fmt((i.preco-i.custo)*i.qty)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="5" style="font-weight:600;padding-top:8px">Total</td><td style="font-weight:600">${fmt(p.total)}</td><td style="font-weight:600;color:var(--g)">${fmt(lucro)}</td></tr></tfoot></table></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" onclick="fecharModal('modal-ped-det')">Fechar</button><button class="btn btn-p" onclick="fecharModal('modal-ped-det');editarPed('${p.id}')">Editar</button></div>`;
  abrirModal('modal-ped-det');
}

function renderFornSel(){
  const s=document.getElementById('cot-forn-sel');const cur=s.value;
  s.innerHTML='<option value="">— selecione —</option>'+(FORNS()||[]).map(f=>`<option value="${f.id}">${f.nome}</option>`).join('');
  s.value=cur;
}

// ════════ COTAÇÃO INTELIGENTE ════════
function renderCotLogs(){
  const el = document.getElementById('cot-logs');
  const logs = CCFG().logs || [];
  if(!logs.length){el.innerHTML='<div style="font-size:13px;color:var(--tx3)">Nenhuma importação ainda.</div>';return;}
  el.innerHTML = logs.map(l => `
    <div class="fb" style="padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px;gap:8px;flex-wrap:wrap">
      <div>
        <span style="font-weight:600">${l.arquivo}</span>
        <span class="bdg bb" style="margin-left:6px">${l.forn}</span>
        ${l.mes ? `<span class="bdg bk" style="margin-left:6px" title="Mês de Referência">📅 ${l.mes.split('-').reverse().join('/')}</span>` : ''}
      </div>
      <div class="fg2">
        <span style="color:var(--tx3);font-size:12px">${l.data}</span>
        <span class="bdg bg">${l.novos} novos</span>
        ${l.atu ? `<span class="bdg ba">${l.atu} atualiz.</span>` : ''}
      </div>
    </div>`).join('');
}

function cotFile(e){
  const file=e.target.files[0];e.target.value='';if(!file)return;
  const fid=document.getElementById('cot-forn-sel').value;if(!fid){toast('Selecione um fornecedor primeiro.');return;}
  const forn=(FORNS()||[]).find(f=>f.id===fid);
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      let rows=[];
      if(file.name.toLowerCase().endsWith('.csv')){
        const text=new TextDecoder().decode(ev.target.result);
        rows=text.split('\n').map(r=>r.split(/[;,\t]/).map(c=>c.trim().replace(/^"|"$/g,'')));
      } else {
        const wb=XLSX.read(ev.target.result,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      }
      rows=rows.filter(r=>r.some(c=>String(c).trim()!==''));
      if(rows.length<2){toast('Planilha vazia.');return;}
      abrirMapaModal(rows,forn,file.name);
    }catch{toast('Erro ao ler o arquivo.');}
  };
  reader.readAsArrayBuffer(file);
}

function abrirMapaModal(rows, forn, filename){
  State._mapaCtx = {rows, forn, filename};
  document.getElementById('mapa-titulo').textContent = 'Importar Cotação — ' + forn.nome;

  let startIdx = 0;
  for(let i = 0; i < Math.min(200, rows.length); i++){
    if(rows[i].some(c => String(c).toUpperCase().includes('DESCRIÇÃO') || String(c).toUpperCase().includes('VALOR UN LIQ'))){
      startIdx = i; break;
    }
  }

  const headers = rows[startIdx].map((h,i) => ({label: String(h || 'Col '+(i+1)), idx: i}));
  const prev = rows.slice(startIdx + 1, startIdx + 4);
  const opts = headers.map(h => `<option value="${h.idx}">${h.label}</option>`).join('');
  const optsN = '<option value="">— não importar —</option>' + opts;

  const aF = kws => Math.max(-1, headers.findIndex(h => kws.some(k => String(h.label).toLowerCase().includes(k))));
  const gN = aF(['descrição','nome','produto','item']);
  const gC = aF(['categoria','família','grupo']);
  const gT = aF(['tabela','bruto']);
  const gD = aF(['desconto','%']);
  const gP = aF(['valor un liq','liquido','líquido','preço','preco','unit']);

  const hoje = new Date();
  const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');

  document.getElementById('mapa-body').innerHTML = `
    <p style="font-size:13px;color:var(--tx2);margin-bottom:10px">Arquivo: <b>${filename}</b></p>
    
    <div class="map-prev" style="overflow-x:auto; margin-bottom:12px">
      <table class="tbl" style="white-space:nowrap">
        <thead><tr>${headers.map(h => `<th>${h.label}</th>`).join('')}</tr></thead>
        <tbody>${prev.map(r => `<tr>${headers.map((_,i) => `<td>${String(r[i]??'').substring(0,25)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>

    <div class="fg c2" style="margin-bottom:10px">
      <div><div class="fl">Mês da Cotação</div><input type="month" class="inp" id="map-mes" value="${mesAtual}"></div>
      <div><div class="fl">Linha inicial dos dados (ignorar topo)</div><input class="inp" type="number" id="map-start" value="${startIdx + 2}" min="1" max="${rows.length}"></div>
    </div>

    <div class="fg c2" style="margin-bottom:10px">
      <div><div class="fl">Descrição (Produto) *</div><select class="inp sel" id="map-nome">${opts.replace(`value="${gN}"`,`value="${gN}" selected`)}</select></div>
      <div><div class="fl">Valor Un Líq (Preço) *</div><select class="inp sel" id="map-preco">${opts.replace(`value="${gP}"`,`value="${gP}" selected`)}</select></div>
      <div><div class="fl">Categoria</div><select class="inp sel" id="map-cat">${optsN.replace(`value="${gC}"`,`value="${gC}" selected`)}</select></div>
      <div><div class="fl">Preço de Tabela (Ref)</div><select class="inp sel" id="map-tabela">${optsN.replace(`value="${gT}"`,`value="${gT}" selected`)}</select></div>
      <div><div class="fl">% Desconto (Ref)</div><select class="inp sel" id="map-desc">${optsN.replace(`value="${gD}"`,`value="${gD}" selected`)}</select></div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn" onclick="fecharModal('modal-mapa')">Cancelar</button>
      <button class="btn btn-p" onclick="confirmarMapa()">Confirmar importação</button>
    </div>`;
  abrirModal('modal-mapa');
}

async function confirmarMapa(){
  const {rows, forn, filename} = State._mapaCtx;
  const mesCotacao = document.getElementById('map-mes').value; 
  const nIdx = parseInt(document.getElementById('map-nome').value);
  const pIdx = parseInt(document.getElementById('map-preco').value);
  const cIdx = document.getElementById('map-cat').value !== '' ? parseInt(document.getElementById('map-cat').value) : -1;
  const start = Math.max(1, parseInt(document.getElementById('map-start').value) || 1) - 1; 

  if(isNaN(nIdx) || isNaN(pIdx)) { toast('Selecione a coluna de Descrição e Valor Un Líq.'); return; }

  const cot = CCFG(); if(!cot.precos) cot.precos = {};
  let novos = 0, atu = 0;
  const linhas = rows.slice(start);

  for(const row of linhas){
    const nome = String(row[nIdx]||'').trim();
    if(!nome || nome.toUpperCase().includes('PROMOÇÕES') || nome.toUpperCase().includes('COMBO') || nome.toUpperCase() === 'DESCRIÇÃO') continue;

    const prStr = String(row[pIdx]||'').replace(/[R$\s]/g,'').replace(',','.');
    const pr = parseFloat(prStr) || 0;
    if(pr <= 0) continue;

    const cat = cIdx >= 0 ? String(row[cIdx]||'').trim() : '';

    let prod = P().find(p => norm(p.nome) === norm(nome));
    let isNew = false;

    if(!prod){
      prod = {
        id: uid(), filial_id: State.FIL, nome, sku: '', un: 'un',
        cat: cat, custo: pr, mkv: 0, mka: 0, pfa: 0, dv: 0, da: 0, qtmin: 0, emin: 0, esal: 0, ecm: pr,
        hist_cot: [] 
      };
      if(!D.produtos[State.FIL]) D.produtos[State.FIL] = [];
      D.produtos[State.FIL].push(prod);
      novos++;
      isNew = true;
    } else {
      if (cat && !prod.cat) prod.cat = cat;
      if (!prod.hist_cot) prod.hist_cot = [];
    }

    const histIdx = prod.hist_cot.findIndex(h => h.mes === mesCotacao && h.forn === forn.nome);
    if(histIdx >= 0) {
        prod.hist_cot[histIdx].preco = pr; 
    } else {
        prod.hist_cot.push({ mes: mesCotacao, forn: forn.nome, preco: pr });
    }

    try{ await SB.upsertProduto(prod); }catch(e){}

    const k = prod.id + '_' + forn.id;
    CPRECOS()[k] = pr;
    try{ await SB.upsertCotPreco({filial_id: State.FIL, produto_id: prod.id, fornecedor_id: forn.id, preco: pr}); }catch(e){}
    if(!isNew) atu++;
  }

  const logs = CCFG().logs || [];
  logs.unshift({arquivo: filename, forn: forn.nome, mes: mesCotacao, data: new Date().toLocaleString('pt-BR'), novos, atu});
  CCFG().logs = logs;
  try{ await SB.upsertCotConfig({filial_id: State.FIL, locked: CCFG().locked, logs: JSON.stringify(logs)}); }catch(e){}

  fecharModal('modal-mapa'); renderCotLogs(); renderProdMet(); renderProdutos();
  toast(`✓ ${novos} novos produtos, ${atu} cotações atualizadas`);
}

function renderCotForns(){
  const cot=CCFG();const el=document.getElementById('cot-forns-lista');const cfors=FORNS();
  if(!cfors.length){el.innerHTML=`<div class="empty"><div class="ico">🏭</div><p>Nenhum fornecedor.</p></div>`;return;}
  el.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Nome</th><th>Contato</th><th>Prazo</th><th>Produtos cotados</th><th></th></tr></thead><tbody>${cfors.map(f=>{
    const cot2=P().filter(p=>{const k=p.id+'_'+f.id;return CPRECOS()[k]>0;}).length;
    return`<tr><td style="font-weight:600">${f.nome}</td><td style="color:var(--tx2)">${f.contato||'—'}</td><td>${f.prazo||'—'}</td><td><span class="bdg ${cot2>0?'bg':'bk'}">${cot2}/${P().length}</span></td><td><button class="ib" onclick="remForn('${f.id}')">✕</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

async function salvarForn(){
  const nome=document.getElementById('fn-nome').value.trim();
  if(!nome){toast('Informe o nome.');return;}
  const forn = {
    id: uid(), filial_id: State.FIL, nome,
    contato: document.getElementById('fn-contato').value.trim(),
    prazo: document.getElementById('fn-prazo').value
  };
  try { await SB.upsertFornecedor(forn); } catch(e) { toast('Erro ao salvar: ' + e.message); return; }
  if(!D.fornecedores[State.FIL]) D.fornecedores[State.FIL] = [];
  D.fornecedores[State.FIL].push(forn);
  fecharModal('modal-forn'); renderCotForns(); renderFornSel();
  document.getElementById('fn-nome').value=''; document.getElementById('fn-contato').value=''; document.getElementById('fn-prazo').value='';
  toast('Fornecedor salvo!');
}

async function remForn(id){
  if(!confirm('Remover fornecedor?')) return;
  try { await SB.deleteFornecedor(id); } catch(e) { toast('Erro ao remover: ' + e.message); return; }
  D.fornecedores[State.FIL] = (FORNS()).filter(f=>f.id!==id);
  Object.keys(CPRECOS()).forEach(k=>{if(k.includes('_'+id)) delete CPRECOS()[k];});
  renderCotForns(); renderFornSel(); toast('Fornecedor removido!');
}

function cotLock(){
  const cot = CCFG();
  cot.locked=!cot.locked;
  document.getElementById('cot-lock-btn').textContent=cot.locked?'🔓 Destravar':'🔒 Travar';
  document.getElementById('cot-lock-alert').style.display=cot.locked?'flex':'none';
  renderCotTabela();toast(cot.locked?'Cotação travada!':'Destravada.');
}
function renderCotTabela(){
  const cot=CCFG();const prods=P();const forns=FORNS();const precos=CPRECOS();
  const el=document.getElementById('cot-tabela');const mc=document.getElementById('cot-met');
  if(!prods.length||!forns.length){el.innerHTML=`<div class="empty"><div class="ico">📊</div><p>Adicione produtos e fornecedores.</p></div>`;mc.innerHTML='';return;}
  let filled=0;const fTot={};forns.forEach(f=>fTot[f.id]=0);
  let html=`<div class="tw"><table class="tbl"><thead><tr><th>Produto</th><th>Un</th>${forns.map(f=>`<th style="text-align:right">${f.nome}</th>`).join('')}<th style="text-align:center">Melhor</th></tr></thead><tbody>`;
  prods.forEach(p=>{
    const prices=forns.map(f=>{const k=p.id+'_'+f.id;const v=precos[k];return(v!==undefined&&v>0)?parseFloat(v):null;});
    const valid=prices.filter(x=>x!==null);const minP=valid.length?Math.min(...valid):null;const maxP=valid.length?Math.max(...valid):null;
    html+=`<tr><td style="font-weight:600">${p.nome}</td><td style="color:var(--tx2)">${p.un}</td>`;
    forns.forEach((f,i)=>{
      const k=p.id+'_'+f.id;const val=precos[k]!==undefined?parseFloat(precos[k]):null;
      if(val!==null&&val>0){fTot[f.id]+=val;filled++;}
      const isBest=val!==null&&val===minP&&valid.length>1;const isWorst=val!==null&&val===maxP&&valid.length>1&&minP!==maxP;
      const bg=isBest?'background:var(--gbg)':isWorst?'background:var(--rbg)':'';
      html+=`<td style="text-align:right;${bg}">`;
      if(cot.locked)html+=val!==null&&val>0?fmt(val):'—';else html+=`<input class="inp" type="number" value="${val!==null?val.toFixed(2):''}" placeholder="0,00" min="0" step="0.01" style="width:100%;text-align:right;font-size:12px;padding:5px 6px" onchange="updPreco('${p.id}','${f.id}',this.value)">`;
      html+=`</td>`;
    });
    html+=`<td style="text-align:center">${minP!==null?`<span class="bdg bg">${fmt(minP)}</span>`:'—'}</td></tr>`;
  });
  const allTot=Object.values(fTot).filter(v=>v>0);const bestTot=allTot.length?Math.min(...allTot):null;
  html+=`<tr style="font-weight:600;border-top:1px solid var(--bd)"><td colspan="2" style="color:var(--tx2)">Total</td>${forns.map(f=>{const t=fTot[f.id];const isBest=t>0&&t===bestTot&&allTot.length>1;return`<td style="text-align:right;font-weight:600;${isBest?'background:var(--gbg)':''}">${fmt(t)}</td>`;}).join('')}<td></td></tr></tbody></table></div>`;
  el.innerHTML=html;const pct2=prods.length*forns.length?Math.round(filled/(prods.length*forns.length)*100):0;
  let bestForn=null;if(bestTot!==null)Object.entries(fTot).forEach(([fid,t])=>{if(t===bestTot)bestForn=forns.find(f=>f.id===fid);});
  mc.innerHTML=`<div class="met"><div class="ml">Produtos</div><div class="mv">${prods.length}</div></div><div class="met"><div class="ml">Fornecedores</div><div class="mv">${forns.length}</div></div><div class="met"><div class="ml">Preenchimento</div><div class="mv">${pct2}%</div></div><div class="met"><div class="ml">Melhor fornecedor</div><div class="mv" style="font-size:14px">${bestForn?bestForn.nome:'—'}</div></div>`;
}
function updPreco(pid,fid,val){
  const cot=CCFG();if(cot.locked)return;
  const k=pid+'_'+fid;const v=parseFloat(val);
  if(!isNaN(v)&&v>=0)cot.precos[k]=v;else delete cot.precos[k];
  renderCotTabela();
}

function calcSaldos(){
  const map={};P().forEach(p=>{map[p.id]={saldo:p.esal||0,cm:p.ecm||p.custo||0};});
  [...(MOVS()||[])].sort((a,b)=>a.ts-b.ts).forEach(m=>{
    if(!map[m.prodId])return;const c=map[m.prodId];
    if(m.tipo==='entrada'){const q=m.qty||0,cu=m.custo||c.cm||0,ns=c.saldo+q;c.cm=ns>0?(c.saldo*c.cm+q*cu)/ns:cu;c.saldo=ns;}
    else if(m.tipo==='saida'||m.tipo==='transf')c.saldo-=(m.qty||0);
    else if(m.tipo==='ajuste')c.saldo=m.saldo_real||m.saldoReal||0;
  });
  return map;
}
function calcSaldosMulti(filIds){
  const map={};
  filIds.forEach(fid=>{
    const prods=D.produtos[fid]||[];prods.forEach(p=>{map[fid+'_'+p.id]={saldo:p.esal||0,cm:p.ecm||p.custo||0};});
    const movs=(D.movs[fid]||[]);
    [...movs].sort((a,b)=>a.ts-b.ts).forEach(m=>{
      const mPid=m.prodId||m.prod_id;const key=fid+'_'+mPid;if(!map[key])return;const c=map[key];
      if(m.tipo==='entrada'){const q=m.qty||0,cu=m.custo||c.cm||0,ns=c.saldo+q;c.cm=ns>0?(c.saldo*c.cm+q*cu)/ns:cu;c.saldo=ns;}
      else if(m.tipo==='saida'||m.tipo==='transf')c.saldo-=(m.qty||0);
      else if(m.tipo==='ajuste')c.saldo=m.saldo_real||m.saldoReal||0;
    });
  });
  return map;
}
function atualizarBadgeEst(){const saldos=calcSaldos();const al=P().filter(p=>{const s=saldos[p.id];return s&&p.emin>0&&s.saldo<p.emin;});const b=document.getElementById('est-badge');b.style.display=al.length?'inline-flex':'none';b.textContent=al.length;}
function renderEstAlerts(){
  const saldos=calcSaldos();const crit=P().filter(p=>{const s=saldos[p.id];return s&&s.saldo<=0;});const baixo=P().filter(p=>{const s=saldos[p.id];return s&&p.emin>0&&s.saldo>0&&s.saldo<p.emin;});let h='';
  if(crit.length)h+=`<div class="alert al-r">🚨 <b>${crit.length} zerado(s):</b> ${crit.map(p=>p.nome).join(', ')}</div>`;
  if(baixo.length)h+=`<div class="alert al-a">⚠ <b>${baixo.length} abaixo do mínimo:</b> ${baixo.map(p=>p.nome).join(', ')}</div>`;
  document.getElementById('est-alerts').innerHTML=h;atualizarBadgeEst();
}
function renderEstPosicao(){
  const saldos=calcSaldos();const q=(document.getElementById('est-busca').value||'').toLowerCase();const f=document.getElementById('est-fil').value;
  let tv=0;P().forEach(p=>{const s=saldos[p.id]||{saldo:0,cm:0};tv+=s.saldo*s.cm;});
  const atv=P().filter(p=>{const s=saldos[p.id];return s&&p.emin>0&&s.saldo>0&&s.saldo<p.emin;}).length;const zt=P().filter(p=>{const s=saldos[p.id];return s&&s.saldo<=0;}).length;
  document.getElementById('est-met').innerHTML=`<div class="met"><div class="ml">Produtos</div><div class="mv">${P().length}</div></div><div class="met"><div class="ml">Valor em estoque</div><div class="mv" style="font-size:15px">${fmt(tv)}</div></div><div class="met"><div class="ml">Em alerta</div><div class="mv" style="color:var(--a)">${atv}</div></div><div class="met"><div class="ml">Zerados</div><div class="mv" style="color:var(--r)">${zt}</div></div>`;
  const filtered=P().filter(p=>{
    const s=saldos[p.id]||{saldo:0,cm:0};const mq=!q||p.nome.toLowerCase().includes(q)||(p.sku||'').toLowerCase().includes(q);const min=p.emin||0;let mf=true;
    if(f==='ok')mf=s.saldo>=min&&s.saldo>0;else if(f==='baixo')mf=min>0&&s.saldo>0&&s.saldo<min;else if(f==='zerado')mf=s.saldo<=0;
    return mq&&mf;
  });
  const el=document.getElementById('est-posicao');
  if(!filtered.length){el.innerHTML=`<div class="empty"><div class="ico">📦</div><p>${P().length?'Nenhum encontrado.':'Cadastre produtos em "Produtos".'}</p></div>`;return;}
  el.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Produto</th><th>SKU</th><th>Saldo</th><th>Custo médio</th><th>Valor total</th><th>Mínimo</th><th>Status</th><th></th></tr></thead><tbody>${filtered.map(p=>{
    const s=saldos[p.id]||{saldo:0,cm:0};const min=p.emin||0;const pct2=min>0?Math.min(100,Math.max(0,s.saldo/min*100)):100;
    let stC,stL;if(s.saldo<=0){stC='br';stL='Zerado';}else if(min>0&&s.saldo<min){stC='ba';stL='Baixo';}else{stC='bg';stL='OK';}
    return`<tr><td style="font-weight:600">${p.nome}</td><td style="color:var(--tx3);font-size:12px">${p.sku||'—'}</td><td><div style="font-weight:600">${fmtQ(s.saldo)} ${p.un}</div>${min>0?`<div class="sbar"><div class="sbar-f" style="width:${pct2}%;background:${s.saldo<=0?'var(--r)':s.saldo<min?'var(--a)':'var(--g)'}"></div></div>`:''}</td><td>${fmt(s.cm)}</td><td style="font-weight:600">${fmt(s.saldo*s.cm)}</td><td style="color:var(--tx2)">${min>0?fmtQ(min)+' '+p.un:'—'}</td><td><span class="bdg ${stC}">${stL}</span></td><td><button class="ib" onclick="abrirMovProd('${p.id}')">📥</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function renderEstHist(){
  const q=(document.getElementById('est-hist-busca').value||'').toLowerCase();const tf=document.getElementById('est-hist-tipo').value;
  const movs=[...(MOVS()||[])].sort((a,b)=>b.ts-a.ts).filter(m=>{const p=P().find(x=>x.id===m.prodId);return(!q||(p&&p.nome.toLowerCase().includes(q))||(m.obs||'').toLowerCase().includes(q))&&(!tf||m.tipo===tf);});
  const el=document.getElementById('est-hist');
  if(!movs.length){el.innerHTML=`<div class="empty"><div class="ico">📋</div><p>Nenhuma movimentação.</p></div>`;return;}
  const tiInfo={entrada:{ico:'📥',lbl:'Entrada'},saida:{ico:'📤',lbl:'Saída'},ajuste:{ico:'⚖',lbl:'Ajuste'},transf:{ico:'🔄',lbl:'Transferência'}};
  el.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th></th><th>Produto</th><th>Data</th><th>Tipo</th><th>Qtd</th><th>Custo</th><th>Obs</th><th></th></tr></thead><tbody>${movs.map(m=>{
    const prodId2=m.prodId||m.prod_id;const p=P().find(x=>x.id===prodId2);const ti=tiInfo[m.tipo]||{ico:'?',lbl:m.tipo};
    const sinal=m.tipo==='entrada'?'+':m.tipo==='saida'?'-':'±';const cor=m.tipo==='entrada'?'var(--g)':m.tipo==='saida'?'var(--r)':'var(--tx)';
    const qShow=m.tipo==='ajuste'?`→ ${fmtQ(m.saldoReal)}`:sinal+fmtQ(m.qty||0);
    return`<tr><td><div style="width:26px;height:26px;border-radius:50%;background:var(--surf2);display:flex;align-items:center;justify-content:center;font-size:12px">${ti.ico}</div></td><td style="font-weight:600">${p?p.nome:'—'}</td><td style="color:var(--tx2);font-size:12px">${m.data||'—'}</td><td><span class="bdg bk">${ti.lbl}</span></td><td style="font-weight:600;color:${cor}">${qShow} ${p?p.un:''}</td><td style="color:var(--tx2)">${m.custo>0?fmt(m.custo):'—'}</td><td style="font-size:12px;color:var(--tx2)">${m.obs||'—'}</td><td><button class="ib" onclick="excluirMov('${m.id}')">✕</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function excluirMov(id){if(!confirm('Excluir movimentação?'))return;D.movs[State.FIL]=(D.movs[State.FIL]||[]).filter(m=>m.id!==id);renderEstPosicao();renderEstHist();renderEstAlerts();}
function refreshMovSel(){const s=document.getElementById('mov-prod');const cur=s.value;s.innerHTML='<option value="">— selecione —</option>'+P().map(p=>`<option value="${p.id}">${p.nome} (${p.un})</option>`).join('');if(cur)s.value=cur;}
function refreshDestSel(){const s=document.getElementById('mov-dest');s.innerHTML='<option value="">— selecione —</option>'+D.filiais.filter(f=>f.id!==State.FIL).map(f=>`<option value="${f.id}">${f.nome}</option>`).join('');}
function resetMov(){
  State.movTipo='entrada';setTipo('entrada');
  document.getElementById('mov-prod').value='';document.getElementById('mov-data').value=new Date().toISOString().split('T')[0];
  document.getElementById('mov-qty').value='';document.getElementById('mov-custo').value='';
  document.getElementById('mov-obs').value='';document.getElementById('mov-real').value='';
  document.getElementById('mov-saldo-panel').style.display='none';document.getElementById('mov-preview').style.display='none';
  refreshMovSel();refreshDestSel();
}
function abrirMovProd(id){resetMov();setTimeout(()=>{document.getElementById('mov-prod').value=id;movLoadProd();},50);abrirModal('modal-mov');}
function setTipo(t){
  State.movTipo=t;
  ['entrada','saida','ajuste','transf'].forEach(x=>document.getElementById('tc-'+x).classList.toggle('sel',x===t));
  document.getElementById('mov-ajuste-row').style.display=t==='ajuste'?'grid':'none';
  document.getElementById('mov-transf-row').style.display=t==='transf'?'grid':'none';
  document.getElementById('mov-qty-row').style.display=t==='ajuste'?'none':'grid';
  document.getElementById('mov-custo-wrap').style.display=t==='entrada'?'block':'none';
  const lbls={entrada:'Quantidade recebida',saida:'Quantidade saída',transf:'Quantidade transferida'};
  document.getElementById('mov-qty-lbl').textContent=lbls[t]||'Quantidade';
  movCalc();
}
function movLoadProd(){
  const id=document.getElementById('mov-prod').value;const saldos=calcSaldos();
  if(!id){document.getElementById('mov-saldo-panel').style.display='none';return;}
  const p=P().find(x=>x.id===id);const s=saldos[id]||{saldo:0,cm:0};
  document.getElementById('ms-saldo').textContent=fmtQ(s.saldo)+' '+(p?p.un:'');
  document.getElementById('ms-cm').textContent=fmt(s.cm);
  document.getElementById('mov-custo').placeholder=s.cm>0?fmtN(s.cm):'0,00';
  document.getElementById('mov-saldo-panel').style.display='block';
  movCalc();
}
function movCalc(){
  const id=document.getElementById('mov-prod').value;if(!id)return;
  if(State.movTipo==='ajuste'){movCalcAjuste();return;}
  const saldos=calcSaldos();const s=saldos[id]||{saldo:0,cm:0};const p=P().find(x=>x.id===id);
  const qty=parseFloat(document.getElementById('mov-qty').value)||0;const custo=parseFloat(document.getElementById('mov-custo').value)||s.cm||0;
  const prev=document.getElementById('mov-preview');
  if(qty<=0){prev.style.display='none';return;}
  let ns=s.saldo,nc=s.cm;
  if(State.movTipo==='entrada'){ns=s.saldo+qty;nc=ns>0?(s.saldo*s.cm+qty*custo)/ns:custo;}else ns=s.saldo-qty;
  document.getElementById('mp-saldo').textContent=fmtQ(ns)+' '+(p?p.un:'');document.getElementById('mp-cm').textContent=fmt(nc);
  document.getElementById('mp-val').textContent=State.movTipo==='entrada'?fmt(qty*custo):'—';document.getElementById('mp-val-wrap').style.display=State.movTipo==='entrada'?'inline':'none';
  prev.style.display='block';
}
function movCalcAjuste(){
  const id=document.getElementById('mov-prod').value;if(!id)return;
  const saldos=calcSaldos();const p=P().find(x=>x.id===id);const real=parseFloat(document.getElementById('mov-real').value);
  const prev=document.getElementById('mov-preview');
  if(isNaN(real)){prev.style.display='none';return;}
  const s=saldos[id]||{saldo:0};const diff=real-s.saldo;
  document.getElementById('mp-saldo').textContent=fmtQ(real)+' '+(p?p.un:'');document.getElementById('mp-cm').textContent='—';
  document.getElementById('mp-val').textContent=(diff>=0?'+':'')+fmtQ(diff)+' '+(p?p.un:'');document.getElementById('mp-val-wrap').style.display='inline';
  document.getElementById('mp-cm').parentElement.style.display='none';prev.style.display='block';
}
async function salvarMov(){
  const prodId=document.getElementById('mov-prod').value;if(!prodId){toast('Selecione produto.');return;}
  const data=document.getElementById('mov-data').value;const obs=document.getElementById('mov-obs').value.trim();const custo=parseFloat(document.getElementById('mov-custo').value)||0;
  let mov={id:uid(),prodId,tipo:State.movTipo,data,obs,ts:Date.now(),custo};
  if(State.movTipo==='ajuste'){
    const real=parseFloat(document.getElementById('mov-real').value);if(isNaN(real)||real<0){toast('Informe o saldo real.');return;}
    mov.saldoReal=real;mov.saldo_real=real;
  } else {
    const qty=parseFloat(document.getElementById('mov-qty').value)||0;if(qty<=0){toast('Informe a quantidade.');return;}
    mov.qty=qty;
    if(State.movTipo==='transf'){
      const dest=document.getElementById('mov-dest').value;if(!dest){toast('Selecione filial destino.');return;}
      mov.destFil=dest;const nomeOrig=(P().find(p=>p.id===prodId)||{}).nome||'';const destProd=(D.produtos[dest]||[]).find(p=>norm(p.nome)===norm(nomeOrig));
      if(destProd){
        const destMov={id:uid(),filial_id:dest,prod_id:destProd.id,tipo:'entrada',data,obs:'Transferência de '+(D.filiais.find(f=>f.id===State.FIL)||{}).nome,ts:Date.now()+1,custo,qty};
        try{await SB.insertMov(destMov);}catch(e){}
        if(!D.movs[dest])D.movs[dest]=[];D.movs[dest].push({...destMov,prodId:destProd.id});
      }
    }
    if(State.movTipo==='saida'||State.movTipo==='transf'){
      const saldos=calcSaldos();const x=saldos[prodId]||{saldo:0};
      if(qty>x.saldo&&!confirm(`Saldo atual: ${fmtQ(x.saldo)}. Registrar assim mesmo?`))return;
    }
  }
  const est={movs:MOVS()};if(!est.movs)est.movs=[];est.movs.push(mov);
  fecharModal('modal-mov');renderEstPosicao();renderEstAlerts();renderEstHist();toast('Movimentação registrada!');
}

function exportCSV(tipo){
  const saldos=calcSaldos();let rows=[],name='';
  if(tipo==='produtos'){
    name='produtos';
    rows=[['Nome','SKU','Un','Categoria','Custo','Mk Varejo%','Mg Varejo%','Preço Varejo','Mk Atacado%','Preço Atacado','Est. Min','Saldo Atual'],...P().map(p=>{const pv=prV(p.custo,p.mkv);const pa=p.pfa>0?p.pfa:(p.mka>0?prV(p.custo,p.mka):0);const s=saldos[p.id]||{saldo:0};return[p.nome,p.sku||'',p.un,p.cat||'',fmtN(p.custo),fmtN(p.mkv),fmtN(mk2mg(p.mkv)),fmtN(pv),fmtN(p.mka),pa>0?fmtN(pa):'',p.emin||'',fmtN(s.saldo)];})];
  } else if(tipo==='clientes'){
    name='clientes';
    rows=[['Nome','Apelido','CPF/CNPJ','Tipo','Status','Telefone','Email','Segmento','Tabela','Prazo','Cidade'],...C().map(c=>[c.nome,c.apelido||'',c.doc||'',c.tipo,c.status,c.tel||'',c.email||'',c.seg||'',c.tab,c.prazo,c.cidade||''])];
  } else if(tipo==='pedidos'){
    name='pedidos';
    rows=[['Nº','Cliente','Data','Status','Tipo','Pagamento','Prazo','Total','Lucro','Obs'],...PD().map(p=>{const lucro=p.itens.reduce((a,i)=>a+(i.preco-i.custo)*i.qty,0);return[p.num,p.cli,p.data,p.status,p.tipo,p.pgto,p.prazo,fmtN(p.total),fmtN(lucro),p.obs||''];})];
  } else if(tipo==='cotacao'){
    name='cotacao';const cot=CCFG();const forns=cot.forns||[];
    if(!P().length||!forns.length){toast('Sem dados para exportar.');return;}
    rows=[['Produto','Un',...forns.map(f=>f.nome),'Melhor preço','Melhor fornecedor'],...P().map(p=>{const prices=forns.map(f=>{const k=p.id+'_'+f.id;return(cot.precos||{})[k]!==undefined?parseFloat((cot.precos||{})[k]):'';});const valid=prices.filter(v=>v!==''&&v>0);const mp=valid.length?Math.min(...valid):'';const bi=prices.findIndex(v=>v===mp);return[p.nome,p.un,...prices,mp!==''?fmtN(mp):'',bi>=0?forns[bi].nome:''];})];
  } else if(tipo==='estoque'){
    name='estoque';
    rows=[['Produto','SKU','Un','Saldo','Custo Médio','Valor Total','Est. Mín','Status'],...P().map(p=>{const s=saldos[p.id]||{saldo:0,cm:0};const min=p.emin||0;const st=s.saldo<=0?'Zerado':min>0&&s.saldo<min?'Baixo':'OK';return[p.nome,p.sku||'',p.un,fmtN(s.saldo),fmtN(s.cm),fmtN(s.saldo*s.cm),min||'',st];})];
  }
  if(!rows.length){toast('Sem dados para exportar.');return;}
  const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name+'.csv';a.click();toast('CSV exportado!');
}
function exportarTudo(){['produtos','clientes','pedidos','cotacao','estoque'].forEach((t,i)=>setTimeout(()=>exportCSV(t),i*200));}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>{renderSetup();});}else{renderSetup();}

// EXPORT PARA O HTML
window.abrirModal = abrirModal; window.fecharModal = fecharModal; window.criarPrimeiraFilial = criarPrimeiraFilial;
window.entrar = entrar; window.voltarSetup = voltarSetup; window.selFilial = selFilial; window.fecharSb = fecharSb;
window.abrirSb = abrirSb; window.ir = ir; window.switchTab = switchTab; window.exportarTudo = exportarTudo;
window.exportCSV = exportCSV; window.renderDash = renderDash; window.setP = setP; window.renderProdutos = renderProdutos;
window.limparFormProd = limparFormProd; window.salvarProduto = salvarProduto; window.editarProd = editarProd;
window.removerProd = removerProd; window.calcProdPreview = calcProdPreview; window.syncV = syncV; window.syncA = syncA;
window.renderClientes = renderClientes; window.limparFormCli = limparFormCli; window.salvarCliente = salvarCliente;
window.editarCli = editarCli; window.removerCli = removerCli; window.renderCliSegs = renderCliSegs; window.abrirCliDet = abrirCliDet;
window.addNota = addNota; window.renderPedidos = renderPedidos; window.limparFormPed = limparFormPed; window.salvarPedido = salvarPedido;
window.editarPed = editarPed; window.removerPed = removerPed; window.verPed = verPed; window.addItem = addItem;
window.remItem = remItem; window.renderCotForns = renderCotForns; window.renderCotTabela = renderCotTabela; window.cotFile = cotFile;
window.cotLock = cotLock; window.salvarForn = salvarForn; window.remForn = remForn; window.confirmarMapa = confirmarMapa;
window.updPreco = updPreco; window.renderEstPosicao = renderEstPosicao; window.renderEstHist = renderEstHist; window.resetMov = resetMov;
window.abrirMovProd = abrirMovProd; window.setTipo = setTipo; window.movLoadProd = movLoadProd; window.movCalc = movCalc;
window.movCalcAjuste = movCalcAjuste; window.salvarMov = salvarMov; window.excluirMov = excluirMov; window.salvarFilial = salvarFilial;
window.limparFormFilial = limparFormFilial; window.editarFilial = editarFilial; window.removerFilial = removerFilial; window.trocarFilial = trocarFilial;
