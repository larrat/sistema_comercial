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
    D.produtos[filId]=prods||[];
    D.clientes[filId]=clis||[];
    D.pedidos[filId]=peds||[];
    D.fornecedores[filId]=forns||[];
    D.cotPrecos[filId]={};
    (precos||[]).forEach(p=>{D.cotPrecos[filId][p.produto_id+'_'+p.fornecedor_id]=p.preco;});
    const logs=cfg?.logs?(typeof cfg.logs==='string'?JSON.parse(cfg.logs):cfg.logs):[];
    D.cotConfig[filId]={filial_id:filId,locked:cfg?.locked||false,logs};
    D.movs[filId]=movs||[];
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

  const fu={};filIds.forEach(fid=>(D.cotConfig[fid]?.logs||[]).forEach(l=>{if(!fu[l.forn])fu[l.forn]=0;fu[l.forn]++;}));
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
function renderMapaBody(){
  const ctx = State._mapaCtx;
  const sheet = getMapaSheetAtual();
  const rows = (sheet?.rows || []).filter(r => r.some(c => String(c).trim() !== ''));

  if(!rows.length){
    document.getElementById('mapa-body').innerHTML = '<p>Nenhum dado na aba selecionada.</p>';
    return;
  }

  const startIdx = detectarCabecalho(rows);
  const headers = rows[startIdx].map((h, i) => ({ label: String(h || 'Col ' + (i + 1)), idx: i }));
  const prev = rows.slice(startIdx + 1, startIdx + 4);

  const opts = headers.map(h => `<option value="${h.idx}">${h.label}</option>`).join('');
  const optsN = '<option value="">— não importar —</option>' + opts;

  const aF = kws => Math.max(-1, headers.findIndex(h =>
    kws.some(k => String(h.label).toLowerCase().includes(k))
  ));

  const gN = aF(['descrição','descricao','nome','produto','item']);
  const gC = aF(['categoria','família','familia','grupo','linha']);
  const gT = aF(['tabela','bruto','valor tabela','preço tabela','preco tabela']);
  const gD = aF(['desconto','%']);
  const gP = aF(['valor un liq','valor unitário','valor unitario','líquido','liquido','preço','preco','unit']);

  const hoje = new Date();
  const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');

  document.getElementById('mapa-body').innerHTML = `
    <p style="font-size:13px;color:var(--tx2);margin-bottom:10px">
      Arquivo: <b>${ctx.filename}</b>
      ${ctx.sheets.length > 1 ? `&nbsp;&nbsp;•&nbsp;&nbsp;Aba: <b>${sheet.name}</b>` : ''}
    </p>

    ${ctx.sheets.length > 1 ? `
      <div style="margin-bottom:12px">
        <div class="fl">Aba da planilha</div>
        <select class="inp sel" id="map-sheet" onchange="renderMapaBody()">
          ${ctx.sheets.map((s, i) => `<option value="${i}" ${i === (ctx.sheetIdx || 0) ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
      </div>
    ` : ''}

    <div class="map-prev" style="overflow-x:auto; margin-bottom:12px">
      <table class="tbl" style="white-space:nowrap">
        <thead><tr>${headers.map(h => `<th>${h.label}</th>`).join('')}</tr></thead>
        <tbody>
          ${prev.map(r => `<tr>${headers.map((_,i) => `<td>${String(r[i] ?? '').substring(0, 35)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="fg c2" style="margin-bottom:10px">
      <div>
        <div class="fl">Mês da Cotação</div>
        <input type="month" class="inp" id="map-mes" value="${ctx.mesCotacao || mesAtual}">
      </div>
      <div>
        <div class="fl">Linha inicial dos dados</div>
        <input class="inp" type="number" id="map-start" value="${ctx.startLine || (startIdx + 2)}" min="1" max="${rows.length}">
      </div>
    </div>

    <div class="fg c2" style="margin-bottom:10px">
      <div><div class="fl">Descrição (Produto) *</div><select class="inp sel" id="map-nome">${opts.replace(`value="${gN}"`,`value="${gN}" selected`)}</select></div>
      <div><div class="fl">Valor Un Líq (Preço) *</div><select class="inp sel" id="map-preco">${opts.replace(`value="${gP}"`,`value="${gP}" selected`)}</select></div>
      <div><div class="fl">Categoria</div><select class="inp sel" id="map-cat">${optsN.replace(`value="${gC}"`,`value="${gC}" selected`)}</select></div>
      <div><div class="fl">Preço de Tabela</div><select class="inp sel" id="map-tabela">${optsN.replace(`value="${gT}"`,`value="${gT}" selected`)}</select></div>
      <div><div class="fl">% Desconto</div><select class="inp sel" id="map-desc">${optsN.replace(`value="${gD}"`,`value="${gD}" selected`)}</select></div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn" onclick="fecharModal('modal-mapa')">Cancelar</button>
      <button class="btn btn-p" onclick="confirmarMapa()">Confirmar importação</button>
    </div>
  `;
}

function abrirMapaModal(ctx){
  State._mapaCtx = {
    ...ctx,
    sheetIdx: 0
  };

  document.getElementById('mapa-titulo').textContent = 'Importar Cotação — ' + ctx.forn.nome;
  abrirModal('modal-mapa');
  renderMapaBody();
}

async function confirmarMapa(){
  const ctx = State._mapaCtx;
  const sheetSel = document.getElementById('map-sheet');
  if(sheetSel) ctx.sheetIdx = parseInt(sheetSel.value || '0', 10);

  const sheet = getMapaSheetAtual();
  const rows = sheet?.rows || [];

  const mesCotacao = document.getElementById('map-mes').value;
  const nIdx = parseInt(document.getElementById('map-nome').value, 10);
  const pIdx = parseInt(document.getElementById('map-preco').value, 10);
  const cIdx = document.getElementById('map-cat').value !== '' ? parseInt(document.getElementById('map-cat').value, 10) : -1;
  const tIdx = document.getElementById('map-tabela').value !== '' ? parseInt(document.getElementById('map-tabela').value, 10) : -1;
  const dIdx = document.getElementById('map-desc').value !== '' ? parseInt(document.getElementById('map-desc').value, 10) : -1;
  const start = Math.max(1, parseInt(document.getElementById('map-start').value, 10) || 1) - 1;

  ctx.mesCotacao = mesCotacao;
  ctx.startLine = start + 1;

  if(!mesCotacao){
    toast('Informe o mês da cotação.');
    return;
  }

  if(isNaN(nIdx) || isNaN(pIdx)){
    toast('Selecione a coluna de Descrição e Valor Un Líq.');
    return;
  }

  const forn = ctx.forn;
  const linhas = rows.slice(start);

  if(!D.produtos[State.FIL]) D.produtos[State.FIL] = [];
  if(!D.cotPrecos[State.FIL]) D.cotPrecos[State.FIL] = {};

  let novos = 0;
  let atu = 0;
  let falhas = 0;

  for(let i = 0; i < linhas.length; i++){
    const row = linhas[i];

    const nomeOriginal = String(row[nIdx] || '').trim();
    if(
      !nomeOriginal ||
      nomeOriginal.toUpperCase() === 'DESCRIÇÃO' ||
      nomeOriginal.toUpperCase() === 'DESCRICAO' ||
      nomeOriginal.toUpperCase().includes('PROMOÇÕES') ||
      nomeOriginal.toUpperCase().includes('PROMOCOES') ||
      nomeOriginal.toUpperCase().includes('COMBO')
    ){
      continue;
    }

    const precoLiq = normalizarNumeroBR(row[pIdx]);
    if(precoLiq <= 0) continue;

    const categoria = cIdx >= 0 ? String(row[cIdx] || '').trim() : '';
    const precoTabela = tIdx >= 0 ? normalizarNumeroBR(row[tIdx]) : null;
    const percDesconto = dIdx >= 0 ? normalizarNumeroBR(row[dIdx]) : null;

    let prod = P().find(p =>
      norm(p.nome) === norm(nomeOriginal) ||
      norm(p.descricao_padrao || '') === norm(nomeOriginal)
    );

    if(!prod){
      prod = {
        id: uid(),
        filial_id: State.FIL,
        nome: nomeOriginal,
        sku: '',
        un: 'un',
        unidade: 'un',
        cat: categoria,
        categoria: categoria,
        descricao_padrao: nomeOriginal,
        codigo_fornecedor: null,
        codigo_barras: null,
        custo: precoLiq,
        ecm: precoLiq,
        mkv: 0,
        mka: 0,
        pfa: 0,
        dv: 0,
        da: 0,
        qtmin: 0,
        emin: 0,
        esal: 0,
        hist_cot: [{
          mes: mesCotacao,
          forn: forn.nome,
          preco: precoLiq,
          tabela: precoTabela,
          desconto: percDesconto
        }]
      };

      D.produtos[State.FIL].push(prod);
      novos++;
    } else {
      if(!prod.hist_cot) prod.hist_cot = [];

      if(categoria){
        if('cat' in prod && !prod.cat) prod.cat = categoria;
        if('categoria' in prod && !prod.categoria) prod.categoria = categoria;
        if(!('cat' in prod) && !('categoria' in prod)) prod.cat = categoria;
      }

      if(!prod.descricao_padrao) prod.descricao_padrao = nomeOriginal;
      prod.custo = precoLiq;
      prod.ecm = precoLiq;

      const histIdx = prod.hist_cot.findIndex(h => h.mes === mesCotacao && h.forn === forn.nome);
      if(histIdx >= 0){
        prod.hist_cot[histIdx] = {
          ...prod.hist_cot[histIdx],
          preco: precoLiq,
          tabela: precoTabela,
          desconto: percDesconto
        };
      } else {
        prod.hist_cot.push({
          mes: mesCotacao,
          forn: forn.nome,
          preco: precoLiq,
          tabela: precoTabela,
          desconto: percDesconto
        });
      }

      atu++;
    }

    try{
      await SB.upsertProduto(prod);

      const k = prod.id + '_' + forn.id;
      CPRECOS()[k] = precoLiq;

      await SB.upsertCotPreco({
        filial_id: State.FIL,
        produto_id: prod.id,
        fornecedor_id: forn.id,
        preco: precoLiq,
        preco_tabela: precoTabela,
        perc_desconto: percDesconto,
        mes_ref: `${mesCotacao}-01`,
        arquivo_origem: ctx.filename
      });

      await SB.upsertCotHistorico({
        filial_id: State.FIL,
        produto_id: prod.id,
        fornecedor_id: forn.id,
        mes_ref: `${mesCotacao}-01`,
        descricao_importada: nomeOriginal,
        categoria_importada: categoria || null,
        preco_tabela: precoTabela,
        perc_desconto: percDesconto,
        preco_liquido: precoLiq,
        arquivo_origem: ctx.filename,
        linha_origem: start + i + 1
      });
    }catch(e){
      falhas++;
      console.error('Erro ao importar linha', { linha: start + i + 1, nomeOriginal, e });
    }
  }

  const logs = CCFG().logs || [];
  logs.unshift({
    arquivo: ctx.filename,
    aba: sheet?.name || '',
    forn: forn.nome,
    mes: mesCotacao,
    data: new Date().toLocaleString('pt-BR'),
    novos,
    atu,
    falhas
  });
  CCFG().logs = logs;

  try{
    await SB.upsertCotConfig({
      filial_id: State.FIL,
      locked: CCFG().locked,
      logs
    });
  }catch(e){
    console.error('Erro ao salvar log de cotação', e);
  }

  fecharModal('modal-mapa');
  renderCotLogs();
  renderProdMet();
  renderProdutos();

  if(falhas > 0){
    toast(`Importação concluída com falhas: ${novos} novos, ${atu} atualizados, ${falhas} erros`);
  } else {
    toast(`✓ ${novos} novos produtos, ${atu} atualizados`);
  }
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
function renderMapaBody(){
  const ctx = State._mapaCtx;
  const sheet = getMapaSheetAtual();
  const rows = (sheet?.rows || []).filter(r => r.some(c => String(c).trim() !== ''));

  if(!rows.length){
    document.getElementById('mapa-body').innerHTML = '<p>Nenhum dado na aba selecionada.</p>';
    return;
  }

  const startIdx = detectarCabecalho(rows);
  const headers = rows[startIdx].map((h, i) => ({ label: String(h || 'Col ' + (i + 1)), idx: i }));
  const prev = rows.slice(startIdx + 1, startIdx + 4);

  const opts = headers.map(h => `<option value="${h.idx}">${h.label}</option>`).join('');
  const optsN = '<option value="">— não importar —</option>' + opts;

  const aF = kws => Math.max(-1, headers.findIndex(h =>
    kws.some(k => String(h.label).toLowerCase().includes(k))
  ));

  const gN = aF(['descrição','descricao','nome','produto','item']);
  const gC = aF(['categoria','família','familia','grupo','linha']);
  const gT = aF(['tabela','bruto','valor tabela','preço tabela','preco tabela']);
  const gD = aF(['desconto','%']);
  const gP = aF(['valor un liq','valor unitário','valor unitario','líquido','liquido','preço','preco','unit']);

  const hoje = new Date();
  const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');

  document.getElementById('mapa-body').innerHTML = `
    <p style="font-size:13px;color:var(--tx2);margin-bottom:10px">
      Arquivo: <b>${ctx.filename}</b>
      ${ctx.sheets.length > 1 ? `&nbsp;&nbsp;•&nbsp;&nbsp;Aba: <b>${sheet.name}</b>` : ''}
    </p>

    ${ctx.sheets.length > 1 ? `
      <div style="margin-bottom:12px">
        <div class="fl">Aba da planilha</div>
        <select class="inp sel" id="map-sheet" onchange="renderMapaBody()">
          ${ctx.sheets.map((s, i) => `<option value="${i}" ${i === (ctx.sheetIdx || 0) ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
      </div>
    ` : ''}

    <div class="map-prev" style="overflow-x:auto; margin-bottom:12px">
      <table class="tbl" style="white-space:nowrap">
        <thead><tr>${headers.map(h => `<th>${h.label}</th>`).join('')}</tr></thead>
        <tbody>
          ${prev.map(r => `<tr>${headers.map((_,i) => `<td>${String(r[i] ?? '').substring(0, 35)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="fg c2" style="margin-bottom:10px">
      <div>
        <div class="fl">Mês da Cotação</div>
        <input type="month" class="inp" id="map-mes" value="${ctx.mesCotacao || mesAtual}">
      </div>
      <div>
        <div class="fl">Linha inicial dos dados</div>
        <input class="inp" type="number" id="map-start" value="${ctx.startLine || (startIdx + 2)}" min="1" max="${rows.length}">
      </div>
    </div>

    <div class="fg c2" style="margin-bottom:10px">
      <div><div class="fl">Descrição (Produto) *</div><select class="inp sel" id="map-nome">${opts.replace(`value="${gN}"`,`value="${gN}" selected`)}</select></div>
      <div><div class="fl">Valor Un Líq (Preço) *</div><select class="inp sel" id="map-preco">${opts.replace(`value="${gP}"`,`value="${gP}" selected`)}</select></div>
      <div><div class="fl">Categoria</div><select class="inp sel" id="map-cat">${optsN.replace(`value="${gC}"`,`value="${gC}" selected`)}</select></div>
      <div><div class="fl">Preço de Tabela</div><select class="inp sel" id="map-tabela">${optsN.replace(`value="${gT}"`,`value="${gT}" selected`)}</select></div>
      <div><div class="fl">% Desconto</div><select class="inp sel" id="map-desc">${optsN.replace(`value="${gD}"`,`value="${gD}" selected`)}</select></div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn" onclick="fecharModal('modal-mapa')">Cancelar</button>
      <button class="btn btn-p" onclick="confirmarMapa()">Confirmar importação</button>
    </div>
  `;
}

function abrirMapaModal(ctx){
  State._mapaCtx = {
    ...ctx,
    sheetIdx: 0
  };

  document.getElementById('mapa-titulo').textContent = 'Importar Cotação — ' + ctx.forn.nome;
  abrirModal('modal-mapa');
  renderMapaBody();
}

async function confirmarMapa(){
  const ctx = State._mapaCtx;
  const sheetSel = document.getElementById('map-sheet');
  if(sheetSel) ctx.sheetIdx = parseInt(sheetSel.value || '0', 10);

  const sheet = getMapaSheetAtual();
  const rows = sheet?.rows || [];

  const mesCotacao = document.getElementById('map-mes').value;
  const nIdx = parseInt(document.getElementById('map-nome').value, 10);
  const pIdx = parseInt(document.getElementById('map-preco').value, 10);
  const cIdx = document.getElementById('map-cat').value !== '' ? parseInt(document.getElementById('map-cat').value, 10) : -1;
  const tIdx = document.getElementById('map-tabela').value !== '' ? parseInt(document.getElementById('map-tabela').value, 10) : -1;
  const dIdx = document.getElementById('map-desc').value !== '' ? parseInt(document.getElementById('map-desc').value, 10) : -1;
  const start = Math.max(1, parseInt(document.getElementById('map-start').value, 10) || 1) - 1;

  ctx.mesCotacao = mesCotacao;
  ctx.startLine = start + 1;

  if(!mesCotacao){
    toast('Informe o mês da cotação.');
    return;
  }

  if(isNaN(nIdx) || isNaN(pIdx)){
    toast('Selecione a coluna de Descrição e Valor Un Líq.');
    return;
  }

  const forn = ctx.forn;
  const linhas = rows.slice(start);

  if(!D.produtos[State.FIL]) D.produtos[State.FIL] = [];
  if(!D.cotPrecos[State.FIL]) D.cotPrecos[State.FIL] = {};

  let novos = 0;
  let atu = 0;
  let falhas = 0;

  for(let i = 0; i < linhas.length; i++){
    const row = linhas[i];

    const nomeOriginal = String(row[nIdx] || '').trim();
    if(
      !nomeOriginal ||
      nomeOriginal.toUpperCase() === 'DESCRIÇÃO' ||
      nomeOriginal.toUpperCase() === 'DESCRICAO' ||
      nomeOriginal.toUpperCase().includes('PROMOÇÕES') ||
      nomeOriginal.toUpperCase().includes('PROMOCOES') ||
      nomeOriginal.toUpperCase().includes('COMBO')
    ){
      continue;
    }

    const precoLiq = normalizarNumeroBR(row[pIdx]);
    if(precoLiq <= 0) continue;

    const categoria = cIdx >= 0 ? String(row[cIdx] || '').trim() : '';
    const precoTabela = tIdx >= 0 ? normalizarNumeroBR(row[tIdx]) : null;
    const percDesconto = dIdx >= 0 ? normalizarNumeroBR(row[dIdx]) : null;

    let prod = P().find(p =>
      norm(p.nome) === norm(nomeOriginal) ||
      norm(p.descricao_padrao || '') === norm(nomeOriginal)
    );

    if(!prod){
      prod = {
        id: uid(),
        filial_id: State.FIL,
        nome: nomeOriginal,
        sku: '',
        un: 'un',
        unidade: 'un',
        cat: categoria,
        categoria: categoria,
        descricao_padrao: nomeOriginal,
        codigo_fornecedor: null,
        codigo_barras: null,
        custo: precoLiq,
        ecm: precoLiq,
        mkv: 0,
        mka: 0,
        pfa: 0,
        dv: 0,
        da: 0,
        qtmin: 0,
        emin: 0,
        esal: 0,
        hist_cot: [{
          mes: mesCotacao,
          forn: forn.nome,
          preco: precoLiq,
          tabela: precoTabela,
          desconto: percDesconto
        }]
      };

      D.produtos[State.FIL].push(prod);
      novos++;
    } else {
      if(!prod.hist_cot) prod.hist_cot = [];

      if(categoria){
        if('cat' in prod && !prod.cat) prod.cat = categoria;
        if('categoria' in prod && !prod.categoria) prod.categoria = categoria;
        if(!('cat' in prod) && !('categoria' in prod)) prod.cat = categoria;
      }

      if(!prod.descricao_padrao) prod.descricao_padrao = nomeOriginal;
      prod.custo = precoLiq;
      prod.ecm = precoLiq;

      const histIdx = prod.hist_cot.findIndex(h => h.mes === mesCotacao && h.forn === forn.nome);
      if(histIdx >= 0){
        prod.hist_cot[histIdx] = {
          ...prod.hist_cot[histIdx],
          preco: precoLiq,
          tabela: precoTabela,
          desconto: percDesconto
        };
      } else {
        prod.hist_cot.push({
          mes: mesCotacao,
          forn: forn.nome,
          preco: precoLiq,
          tabela: precoTabela,
          desconto: percDesconto
        });
      }

      atu++;
    }

    try{
      await SB.upsertProduto(prod);

      const k = prod.id + '_' + forn.id;
      CPRECOS()[k] = precoLiq;

      await SB.upsertCotPreco({
        filial_id: State.FIL,
        produto_id: prod.id,
        fornecedor_id: forn.id,
        preco: precoLiq,
        preco_tabela: precoTabela,
        perc_desconto: percDesconto,
        mes_ref: `${mesCotacao}-01`,
        arquivo_origem: ctx.filename
      });

      await SB.upsertCotHistorico({
        filial_id: State.FIL,
        produto_id: prod.id,
        fornecedor_id: forn.id,
        mes_ref: `${mesCotacao}-01`,
        descricao_importada: nomeOriginal,
        categoria_importada: categoria || null,
        preco_tabela: precoTabela,
        perc_desconto: percDesconto,
        preco_liquido: precoLiq,
        arquivo_origem: ctx.filename,
        linha_origem: start + i + 1
      });
    }catch(e){
      falhas++;
      console.error('Erro ao importar linha', { linha: start + i + 1, nomeOriginal, e });
    }
  }

  const logs = CCFG().logs || [];
  logs.unshift({
    arquivo: ctx.filename,
    aba: sheet?.name || '',
    forn: forn.nome,
    mes: mesCotacao,
    data: new Date().toLocaleString('pt-BR'),
    novos,
    atu,
    falhas
  });
  CCFG().logs = logs;

  try{
    await SB.upsertCotConfig({
      filial_id: State.FIL,
      locked: CCFG().locked,
      logs
    });
  }catch(e){
    console.error('Erro ao salvar log de cotação', e);
  }

  fecharModal('modal-mapa');
  renderCotLogs();
  renderProdMet();
  renderProdutos();

  if(falhas > 0){
    toast(`Importação concluída com falhas: ${novos} novos, ${atu} atualizados, ${falhas} erros`);
  } else {
    toast(`✓ ${novos} novos produtos, ${atu} atualizados`);
  }
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