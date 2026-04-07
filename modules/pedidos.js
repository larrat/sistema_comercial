import { SB } from '../js/api.js';
import { D, State, P, PD } from '../js/store.js';
import { abrirModal, fecharModal, uid, fmt, toast, prV } from '../core/utils.js';

let refreshProdSelSafe = () => {};
let refreshCliDLSafe = () => {};

export function initPedidosModule(callbacks = {}){
  refreshProdSelSafe = callbacks.refreshProdSel || (() => {});
  refreshCliDLSafe = callbacks.refreshCliDL || (() => {});
}

const ST_PED = {
  orcamento:'<span class="bdg bk">Orçamento</span>',
  confirmado:'<span class="bdg bb">Confirmado</span>',
  em_separacao:'<span class="bdg ba">Em separação</span>',
  entregue:'<span class="bdg bg">Entregue</span>',
  cancelado:'<span class="bdg br">Cancelado</span>'
};

export function renderPedMet(){
  const peds = PD();
  const fat = peds.filter(p => p.status === 'entregue').reduce((a, p) => a + (p.total || 0), 0);
  const lucro = peds
    .filter(p => p.status === 'entregue')
    .reduce((a, p) => a + (p.itens || []).reduce((b, i) => b + ((i.preco - i.custo) * i.qty), 0), 0);
  const ab = peds.filter(p => ['orcamento', 'confirmado', 'em_separacao'].includes(p.status)).length;

  const el = document.getElementById('ped-met');
  if(!el) return;

  el.innerHTML = `
    <div class="met"><div class="ml">Total</div><div class="mv">${peds.length}</div></div>
    <div class="met"><div class="ml">Faturamento</div><div class="mv" style="font-size:16px">${fmt(fat)}</div></div>
    <div class="met"><div class="ml">Lucro</div><div class="mv" style="font-size:16px;color:var(--g)">${fmt(lucro)}</div></div>
    <div class="met"><div class="ml">Em aberto</div><div class="mv" style="color:var(--a)">${ab}</div></div>
  `;
}

export function renderPedidos(){
  const buscaEl = document.getElementById('ped-busca');
  const stEl = document.getElementById('ped-fil-st');
  const el = document.getElementById('ped-lista');
  if(!el) return;

  const q = (buscaEl?.value || '').toLowerCase();
  const st = stEl?.value || '';

  const f = [...PD()]
    .sort((a, b) => (b.num || 0) - (a.num || 0))
    .filter(p =>
      (!q || String(p.cli || '').toLowerCase().includes(q) || String(p.num || '').includes(q)) &&
      (!st || p.status === st)
    );

  if(!f.length){
    el.innerHTML = `<div class="empty"><div class="ico">🛒</div><p>${PD().length ? 'Nenhum encontrado.' : 'Nenhum pedido ainda.'}</p></div>`;
    return;
  }

  const pgtoLbl = {
    a_vista:'À vista',
    pix:'PIX',
    boleto:'Boleto',
    cartao:'Cartão',
    cheque:'Cheque'
  };

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Cliente</th>
            <th>Data</th>
            <th>Tipo</th>
            <th>Itens</th>
            <th>Total</th>
            <th>Pgto</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${f.map(p => `
            <tr>
              <td style="font-weight:600;color:var(--tx2)">#${p.num}</td>
              <td style="font-weight:600">${p.cli}</td>
              <td style="color:var(--tx2)">${p.data || '—'}</td>
              <td>${p.tipo === 'atacado' ? '<span class="bdg ba">Atacado</span>' : '<span class="bdg bb">Varejo</span>'}</td>
              <td style="color:var(--tx2)">${(p.itens || []).length}</td>
              <td style="font-weight:600">${fmt(p.total || 0)}</td>
              <td style="font-size:12px;color:var(--tx2)">${pgtoLbl[p.pgto] || p.pgto || '—'}</td>
              <td>${ST_PED[p.status] || ''}</td>
              <td>
                <div class="fg2">
                  <button class="ib" onclick="verPed('${p.id}')">👁</button>
                  <button class="ib" onclick="editarPed('${p.id}')">✏</button>
                  <button class="ib" onclick="removerPed('${p.id}')">✕</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function limparFormPed(){
  State.editIds.ped = null;
  State.pedItens = [];

  const titulo = document.getElementById('ped-modal-titulo');
  if(titulo) titulo.textContent = 'Novo pedido';

  ['pd-cli', 'pd-obs'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });

  const dataEl = document.getElementById('pd-data');
  if(dataEl) dataEl.value = new Date().toISOString().split('T')[0];

  const statusEl = document.getElementById('pd-status');
  const pgtoEl = document.getElementById('pd-pgto');
  const prazoEl = document.getElementById('pd-prazo');
  const tipoEl = document.getElementById('pd-tipo');
  const prodEl = document.getElementById('pi-prod');
  const qtyEl = document.getElementById('pi-qty');
  const precoEl = document.getElementById('pi-preco');

  if(statusEl) statusEl.value = 'orcamento';
  if(pgtoEl) pgtoEl.value = 'a_vista';
  if(prazoEl) prazoEl.value = 'imediato';
  if(tipoEl) tipoEl.value = 'varejo';
  if(prodEl) prodEl.value = '';
  if(qtyEl) qtyEl.value = 1;
  if(precoEl) precoEl.value = '';

  refreshProdSelSafe();
  refreshCliDLSafe();
  renderItens();
}

export function editarPed(id){
  const p = PD().find(x => x.id === id);
  if(!p) return;

  State.editIds.ped = id;
  State.pedItens = [...(p.itens || []).map(i => ({ ...i }))];

  const titulo = document.getElementById('ped-modal-titulo');
  if(titulo) titulo.textContent = 'Editar pedido #' + p.num;

  document.getElementById('pd-cli').value = p.cli || '';
  document.getElementById('pd-data').value = p.data || '';
  document.getElementById('pd-status').value = p.status || 'orcamento';
  document.getElementById('pd-pgto').value = p.pgto || 'a_vista';
  document.getElementById('pd-prazo').value = p.prazo || 'imediato';
  document.getElementById('pd-tipo').value = p.tipo || 'varejo';
  document.getElementById('pd-obs').value = p.obs || '';

  refreshProdSelSafe();
  refreshCliDLSafe();
  renderItens();
  abrirModal('modal-pedido');
}

export function addItem(){
  const pid = document.getElementById('pi-prod')?.value;
  const qty = parseFloat(document.getElementById('pi-qty')?.value) || 1;
  const pm = parseFloat(document.getElementById('pi-preco')?.value) || 0;
  const orig = document.getElementById('pi-orig')?.value || 'estoque';

  if(!pid){
    toast('Selecione um produto.');
    return;
  }

  const prod = P().find(p => p.id === pid);
  if(!prod) return;

  const tipo = document.getElementById('pd-tipo')?.value || 'varejo';
  const pa = tipo === 'atacado' && (prod.mka > 0 || prod.pfa > 0)
    ? (prod.pfa > 0 ? prod.pfa : prV(prod.custo, prod.mka))
    : prV(prod.custo, prod.mkv);

  const pf = pm > 0 ? pm : ((isNaN(pa) || pa <= 0) ? prod.custo : pa);

  if(!State.pedItens) State.pedItens = [];
  State.pedItens.push({
    prodId: pid,
    nome: prod.nome,
    un: prod.un,
    qty,
    preco: pf,
    custo: prod.custo,
    orig
  });

  const prodEl = document.getElementById('pi-prod');
  const qtyEl = document.getElementById('pi-qty');
  const precoEl = document.getElementById('pi-preco');

  if(prodEl) prodEl.value = '';
  if(qtyEl) qtyEl.value = 1;
  if(precoEl) precoEl.value = '';

  renderItens();
}

export function remItem(i){
  if(!State.pedItens) State.pedItens = [];
  State.pedItens.splice(i, 1);
  renderItens();
}

export function renderItens(){
  const el = document.getElementById('ped-itens');
  const tb = document.getElementById('ped-total');
  if(!el || !tb) return;

  if(!State.pedItens || !State.pedItens.length){
    el.innerHTML = '<div style="font-size:13px;color:var(--tx3);padding:8px 0">Nenhum item.</div>';
    tb.style.display = 'none';
    return;
  }

  const tot = State.pedItens.reduce((a, i) => a + (i.qty * i.preco), 0);

  el.innerHTML = `
    <table class="tbl" style="margin-bottom:8px">
      <thead>
        <tr>
          <th>Produto</th>
          <th>Origem</th>
          <th>Qtd</th>
          <th>Preço</th>
          <th>Subtotal</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${State.pedItens.map((it, i) => `
          <tr>
            <td style="font-weight:600">${it.nome}</td>
            <td><span class="bdg ${it.orig === 'estoque' ? 'bg' : 'bb'}">${it.orig === 'estoque' ? 'Estoque' : 'Fornecedor'}</span></td>
            <td>${it.qty} ${it.un}</td>
            <td>${fmt(it.preco)}</td>
            <td style="font-weight:600">${fmt(it.qty * it.preco)}</td>
            <td><button class="ib" onclick="remItem(${i})">✕</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const totalVal = document.getElementById('ped-total-val');
  if(totalVal) totalVal.textContent = fmt(tot);
  tb.style.display = 'block';
}

export async function salvarPedido(){
  const cli = document.getElementById('pd-cli')?.value.trim();
  if(!cli){
    toast('Informe o cliente.');
    return;
  }

  if(!State.pedItens || !State.pedItens.length){
    toast('Adicione pelo menos um item.');
    return;
  }

  const total = State.pedItens.reduce((a, i) => a + (i.qty * i.preco), 0);
  const peds = PD();
  const allNums = peds.map(p => p.num).filter(n => typeof n === 'number' && !isNaN(n));
  const nextNum = allNums.length ? Math.max(...allNums) + 1 : 1;

  const ped = {
    id: State.editIds.ped || uid(),
    filial_id: State.FIL,
    num: State.editIds.ped
      ? ((peds.find(p => p.id === State.editIds.ped) || {}).num || nextNum)
      : nextNum,
    cli,
    data: document.getElementById('pd-data')?.value || '',
    status: document.getElementById('pd-status')?.value || 'orcamento',
    pgto: document.getElementById('pd-pgto')?.value || 'a_vista',
    prazo: document.getElementById('pd-prazo')?.value || 'imediato',
    tipo: document.getElementById('pd-tipo')?.value || 'varejo',
    obs: document.getElementById('pd-obs')?.value.trim() || '',
    itens: State.pedItens,
    total
  };

  const pedSB = { ...ped, itens: JSON.stringify(ped.itens) };

  try{
    await SB.upsertPedido(pedSB);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  if(State.editIds.ped){
    D.pedidos[State.FIL] = peds.map(p => p.id === State.editIds.ped ? ped : p);
  } else {
    if(!D.pedidos[State.FIL]) D.pedidos[State.FIL] = [];
    D.pedidos[State.FIL].push(ped);
  }

  fecharModal('modal-pedido');
  renderPedMet();
  renderPedidos();

  toast(State.editIds.ped ? 'Pedido atualizado!' : 'Pedido #' + ped.num + ' criado!');
}

export async function removerPed(id){
  if(!confirm('Remover pedido?')) return;

  try{
    await SB.deletePedido(id);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  D.pedidos[State.FIL] = PD().filter(p => p.id !== id);
  renderPedMet();
  renderPedidos();
  toast('Removido.');
}

export function verPed(id){
  const p = PD().find(x => x.id === id);
  if(!p) return;

  const lucro = (p.itens || []).reduce((a, i) => a + ((i.preco - i.custo) * i.qty), 0);

  const pgtoLbl = {
    a_vista:'À vista',
    pix:'PIX',
    boleto:'Boleto',
    cartao:'Cartão',
    cheque:'Cheque'
  };

  const prazoLbl = {
    imediato:'Imediato',
    '7d':'7 dias',
    '15d':'15 dias',
    '30d':'30 dias',
    '60d':'60 dias'
  };

  const box = document.getElementById('ped-det-box');
  if(!box) return;

  box.innerHTML = `
    <div class="fb" style="margin-bottom:16px">
      <div class="mt" style="margin:0">Pedido #${p.num}</div>
      ${ST_PED[p.status] || ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;font-size:13px">
      ${[
        ['Cliente', p.cli],
        ['Data', p.data || '—'],
        ['Tipo', p.tipo === 'atacado' ? 'Atacado' : 'Varejo'],
        ['Pagamento', pgtoLbl[p.pgto] || p.pgto],
        ['Prazo', prazoLbl[p.prazo] || p.prazo],
        ['Lucro estimado', `<span style="color:var(--g);font-weight:600">${fmt(lucro)}</span>`]
      ].map(([l, v]) => `
        <div>
          <div style="font-size:11px;color:var(--tx3)">${l}</div>
          <div>${v}</div>
        </div>
      `).join('')}
    </div>

    ${p.obs ? `
      <div class="panel" style="margin-bottom:12px">
        <div class="pt">Observações</div>
        <p style="font-size:13px">${p.obs}</p>
      </div>
    ` : ''}

    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Orig.</th>
            <th>Qtd</th>
            <th>Custo</th>
            <th>Preço</th>
            <th>Subtotal</th>
            <th>Lucro</th>
          </tr>
        </thead>
        <tbody>
          ${(p.itens || []).map(i => `
            <tr>
              <td style="font-weight:600">${i.nome}</td>
              <td><span class="bdg ${i.orig === 'estoque' ? 'bg' : 'bb'}" style="font-size:10px">${i.orig === 'estoque' ? 'Est.' : 'Forn.'}</span></td>
              <td>${i.qty} ${i.un}</td>
              <td style="color:var(--tx2)">${fmt(i.custo)}</td>
              <td>${fmt(i.preco)}</td>
              <td style="font-weight:600">${fmt(i.qty * i.preco)}</td>
              <td style="color:var(--g)">${fmt((i.preco - i.custo) * i.qty)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="font-weight:600;padding-top:8px">Total</td>
            <td style="font-weight:600">${fmt(p.total || 0)}</td>
            <td style="font-weight:600;color:var(--g)">${fmt(lucro)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn" onclick="fecharModal('modal-ped-det')">Fechar</button>
      <button class="btn btn-p" onclick="fecharModal('modal-ped-det');editarPed('${p.id}')">Editar</button>
    </div>
  `;

  abrirModal('modal-ped-det');
}