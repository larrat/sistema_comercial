import { SB } from '../js/api.js';
import { D, State, P, MOVS } from '../js/store.js';
import { uid, fmt, fmtQ, toast, abrirModal, fecharModal } from '../core/utils.js';

function calcSaldos(){
  const map = {};

  P().forEach(p => {
    map[p.id] = {
      saldo: p.esal || 0,
      cm: p.ecm || p.custo || 0
    };
  });

  [...(MOVS() || [])]
    .sort((a, b) => (a.ts || 0) - (b.ts || 0))
    .forEach(m => {
      const prodId = m.prodId || m.prod_id;
      if(!map[prodId]) return;

      const c = map[prodId];

      if(m.tipo === 'entrada'){
        const q = m.qty || 0;
        const cu = m.custo || c.cm || 0;
        const ns = c.saldo + q;
        c.cm = ns > 0 ? ((c.saldo * c.cm) + (q * cu)) / ns : cu;
        c.saldo = ns;
      }else if(m.tipo === 'saida' || m.tipo === 'transf'){
        c.saldo -= (m.qty || 0);
      }else if(m.tipo === 'ajuste'){
        c.saldo = m.saldo_real || m.saldoReal || 0;
      }
    });

  return map;
}

let refreshMovSelCb = () => {};
let refreshDestSelCb = () => {};
let atualizarBadgeEstCb = () => {};

export function initEstoqueModule(callbacks = {}){
  refreshMovSelCb = callbacks.refreshMovSel || (() => {});
  refreshDestSelCb = callbacks.refreshDestSel || (() => {});
  atualizarBadgeEstCb = callbacks.atualizarBadgeEst || (() => {});
}

export function atualizarBadgeEst(){
  const saldos = calcSaldos();
  const al = P().filter(p => {
    const s = saldos[p.id];
    return s && p.emin > 0 && s.saldo < p.emin;
  });

  const b = document.getElementById('est-badge');
  if(!b) return;

  b.style.display = al.length ? 'inline-flex' : 'none';
  b.textContent = al.length;
}

export function renderEstAlerts(){
  const saldos = calcSaldos();

  const crit = P().filter(p => {
    const s = saldos[p.id];
    return s && s.saldo <= 0;
  });

  const baixo = P().filter(p => {
    const s = saldos[p.id];
    return s && p.emin > 0 && s.saldo > 0 && s.saldo < p.emin;
  });

  let h = '';
  if(crit.length){
    h += `<div class="alert al-r">🚨 <b>${crit.length} zerado(s):</b> ${crit.map(p => p.nome).join(', ')}</div>`;
  }
  if(baixo.length){
    h += `<div class="alert al-a">⚠ <b>${baixo.length} abaixo do mínimo:</b> ${baixo.map(p => p.nome).join(', ')}</div>`;
  }

  const el = document.getElementById('est-alerts');
  if(el) el.innerHTML = h;

  atualizarBadgeEst();
}

export function renderEstPosicao(){
  const saldos = calcSaldos();
  const q = (document.getElementById('est-busca')?.value || '').toLowerCase();
  const f = document.getElementById('est-fil')?.value || '';

  let tv = 0;
  P().forEach(p => {
    const s = saldos[p.id] || { saldo: 0, cm: 0 };
    tv += s.saldo * s.cm;
  });

  const atv = P().filter(p => {
    const s = saldos[p.id];
    return s && p.emin > 0 && s.saldo > 0 && s.saldo < p.emin;
  }).length;

  const zt = P().filter(p => {
    const s = saldos[p.id];
    return s && s.saldo <= 0;
  }).length;

  const met = document.getElementById('est-met');
  if(met){
    met.innerHTML = `
      <div class="met"><div class="ml">Produtos</div><div class="mv">${P().length}</div></div>
      <div class="met"><div class="ml">Valor em estoque</div><div class="mv" style="font-size:15px">${fmt(tv)}</div></div>
      <div class="met"><div class="ml">Em alerta</div><div class="mv" style="color:var(--a)">${atv}</div></div>
      <div class="met"><div class="ml">Zerados</div><div class="mv" style="color:var(--r)">${zt}</div></div>
    `;
  }

  const filtered = P().filter(p => {
    const s = saldos[p.id] || { saldo: 0, cm: 0 };
    const mq = !q || p.nome.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
    const min = p.emin || 0;
    let mf = true;

    if(f === 'ok') mf = s.saldo >= min && s.saldo > 0;
    else if(f === 'baixo') mf = min > 0 && s.saldo > 0 && s.saldo < min;
    else if(f === 'zerado') mf = s.saldo <= 0;

    return mq && mf;
  });

  const el = document.getElementById('est-posicao');
  if(!el) return;

  if(!filtered.length){
    el.innerHTML = `<div class="empty"><div class="ico">📦</div><p>${P().length ? 'Nenhum encontrado.' : 'Cadastre produtos em "Produtos".'}</p></div>`;
    return;
  }

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Produto</th>
            <th>SKU</th>
            <th>Saldo</th>
            <th>Custo Médio</th>
            <th>Valor Total</th>
            <th>Mínimo</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(p => {
            const s = saldos[p.id] || { saldo: 0, cm: 0 };
            const min = p.emin || 0;
            const pct2 = min > 0 ? Math.min(100, Math.max(0, (s.saldo / min) * 100)) : 100;

            let stC, stL;
            if(s.saldo <= 0){
              stC = 'br';
              stL = 'Zerado';
            }else if(min > 0 && s.saldo < min){
              stC = 'ba';
              stL = 'Baixo';
            }else{
              stC = 'bg';
              stL = 'OK';
            }

            return `
              <tr>
                <td style="font-weight:600">${p.nome}</td>
                <td style="color:var(--tx3);font-size:12px">${p.sku || '—'}</td>
                <td>
                  <div style="font-weight:600">${fmtQ(s.saldo)} ${p.un}</div>
                  ${min > 0 ? `
                    <div class="sbar">
                      <div class="sbar-f" style="width:${pct2}%;background:${s.saldo <= 0 ? 'var(--r)' : s.saldo < min ? 'var(--a)' : 'var(--g)'}"></div>
                    </div>
                  ` : ''}
                </td>
                <td>${fmt(s.cm)}</td>
                <td style="font-weight:600">${fmt(s.saldo * s.cm)}</td>
                <td style="color:var(--tx2)">${min > 0 ? fmtQ(min) + ' ' + p.un : '—'}</td>
                <td><span class="bdg ${stC}">${stL}</span></td>
                <td><button class="ib" onclick="abrirMovProd('${p.id}')">📥</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderEstHist(){
  const q = (document.getElementById('est-hist-busca')?.value || '').toLowerCase();
  const tf = document.getElementById('est-hist-tipo')?.value || '';

  const movs = [...(MOVS() || [])]
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .filter(m => {
      const prodId = m.prodId || m.prod_id;
      const p = P().find(x => x.id === prodId);

      return (
        (!q || (p && p.nome.toLowerCase().includes(q)) || (m.obs || '').toLowerCase().includes(q)) &&
        (!tf || m.tipo === tf)
      );
    });

  const el = document.getElementById('est-hist');
  if(!el) return;

  if(!movs.length){
    el.innerHTML = `<div class="empty"><div class="ico">📋</div><p>Nenhuma movimentação.</p></div>`;
    return;
  }

  const tiInfo = {
    entrada:{ ico:'📥', lbl:'Entrada' },
    saida:{ ico:'📤', lbl:'Saída' },
    ajuste:{ ico:'⚖', lbl:'Ajuste' },
    transf:{ ico:'🔄', lbl:'Transferência' }
  };

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th></th>
            <th>Produto</th>
            <th>Data</th>
            <th>Tipo</th>
            <th>Qtd</th>
            <th>Custo</th>
            <th>Obs</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${movs.map(m => {
            const prodId = m.prodId || m.prod_id;
            const p = P().find(x => x.id === prodId);
            const ti = tiInfo[m.tipo] || { ico:'?', lbl:m.tipo };

            const sinal = m.tipo === 'entrada' ? '+' : m.tipo === 'saida' ? '-' : '±';
            const cor = m.tipo === 'entrada' ? 'var(--g)' : m.tipo === 'saida' ? 'var(--r)' : 'var(--tx)';
            const qShow = m.tipo === 'ajuste'
              ? `→ ${fmtQ(m.saldoReal || m.saldo_real)}`
              : sinal + fmtQ(m.qty || 0);

            return `
              <tr>
                <td><div style="width:26px;height:26px;border-radius:50%;background:var(--surf2);display:flex;align-items:center;justify-content:center;font-size:12px">${ti.ico}</div></td>
                <td style="font-weight:600">${p ? p.nome : '—'}</td>
                <td style="color:var(--tx2);font-size:12px">${m.data || '—'}</td>
                <td><span class="bdg bk">${ti.lbl}</span></td>
                <td style="font-weight:600;color:${cor}">${qShow} ${p ? p.un : ''}</td>
                <td style="color:var(--tx2)">${m.custo > 0 ? fmt(m.custo) : '—'}</td>
                <td style="font-size:12px;color:var(--tx2)">${m.obs || '—'}</td>
                <td><button class="ib" onclick="excluirMov('${m.id}')">✕</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export async function excluirMov(id){
  if(!confirm('Excluir movimentação?')) return;

  try{
    await SB.deleteMov(id);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  D.movs[State.FIL] = (D.movs[State.FIL] || []).filter(m => m.id !== id);

  renderEstPosicao();
  renderEstHist();
  renderEstAlerts();
}

export function refreshMovSel(){
  const s = document.getElementById('mov-prod');
  if(!s) return;

  const cur = s.value;
  s.innerHTML = '<option value="">— selecione —</option>' + P().map(p => `<option value="${p.id}">${p.nome} (${p.un})</option>`).join('');
  if(cur) s.value = cur;
}

export function refreshDestSel(){
  const s = document.getElementById('mov-dest');
  if(!s) return;

  s.innerHTML =
    '<option value="">— selecione —</option>' +
    D.filiais
      .filter(f => f.id !== State.FIL)
      .map(f => `<option value="${f.id}">${f.nome}</option>`)
      .join('');
}

export function resetMov(){
  State.movTipo = 'entrada';
  setTipo('entrada');

  const ids = ['mov-prod','mov-data','mov-qty','mov-custo','mov-obs','mov-real'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;

    if(id === 'mov-data') el.value = new Date().toISOString().split('T')[0];
    else el.value = '';
  });

  const saldoPanel = document.getElementById('mov-saldo-panel');
  const preview = document.getElementById('mov-preview');
  if(saldoPanel) saldoPanel.style.display = 'none';
  if(preview) preview.style.display = 'none';

  refreshMovSelCb();
  refreshDestSelCb();
}

export function abrirMovProd(id){
  resetMov();
  setTimeout(() => {
    const el = document.getElementById('mov-prod');
    if(el) el.value = id;
    movLoadProd();
  }, 50);

  abrirModal('modal-mov');
}

export function setTipo(t){
  State.movTipo = t;

  ['entrada','saida','ajuste','transf'].forEach(x => {
    const el = document.getElementById('tc-' + x);
    if(el) el.classList.toggle('sel', x === t);
  });

  const ajusteRow = document.getElementById('mov-ajuste-row');
  const transfRow = document.getElementById('mov-transf-row');
  const qtyRow = document.getElementById('mov-qty-row');
  const custoWrap = document.getElementById('mov-custo-wrap');
  const qtyLbl = document.getElementById('mov-qty-lbl');

  if(ajusteRow) ajusteRow.style.display = t === 'ajuste' ? 'grid' : 'none';
  if(transfRow) transfRow.style.display = t === 'transf' ? 'grid' : 'none';
  if(qtyRow) qtyRow.style.display = t === 'ajuste' ? 'none' : 'grid';
  if(custoWrap) custoWrap.style.display = t === 'entrada' ? 'block' : 'none';

  const lbls = {
    entrada:'Quantidade recebida',
    saida:'Quantidade saída',
    transf:'Quantidade transferida'
  };

  if(qtyLbl) qtyLbl.textContent = lbls[t] || 'Quantidade';

  movCalc();
}

export function movLoadProd(){
  const id = document.getElementById('mov-prod')?.value;
  const saldos = calcSaldos();

  if(!id){
    const panel = document.getElementById('mov-saldo-panel');
    if(panel) panel.style.display = 'none';
    return;
  }

  const p = P().find(x => x.id === id);
  const s = saldos[id] || { saldo: 0, cm: 0 };

  const msSaldo = document.getElementById('ms-saldo');
  const msCm = document.getElementById('ms-cm');
  const movCusto = document.getElementById('mov-custo');
  const panel = document.getElementById('mov-saldo-panel');

  if(msSaldo) msSaldo.textContent = fmtQ(s.saldo) + ' ' + (p ? p.un : '');
  if(msCm) msCm.textContent = fmt(s.cm);
  if(movCusto) movCusto.placeholder = s.cm > 0 ? String(s.cm.toFixed(2)) : '0,00';
  if(panel) panel.style.display = 'block';

  movCalc();
}

export function movCalc(){
  const id = document.getElementById('mov-prod')?.value;
  if(!id) return;

  if(State.movTipo === 'ajuste'){
    movCalcAjuste();
    return;
  }

  const saldos = calcSaldos();
  const s = saldos[id] || { saldo: 0, cm: 0 };
  const p = P().find(x => x.id === id);

  const qty = parseFloat(document.getElementById('mov-qty')?.value) || 0;
  const custo = parseFloat(document.getElementById('mov-custo')?.value) || s.cm || 0;
  const prev = document.getElementById('mov-preview');

  if(qty <= 0){
    if(prev) prev.style.display = 'none';
    return;
  }

  let ns = s.saldo;
  let nc = s.cm;

  if(State.movTipo === 'entrada'){
    ns = s.saldo + qty;
    nc = ns > 0 ? ((s.saldo * s.cm) + (qty * custo)) / ns : custo;
  } else {
    ns = s.saldo - qty;
  }

  const mpSaldo = document.getElementById('mp-saldo');
  const mpCm = document.getElementById('mp-cm');
  const mpVal = document.getElementById('mp-val');
  const mpValWrap = document.getElementById('mp-val-wrap');
  const mpCmParent = mpCm?.parentElement;

  if(mpSaldo) mpSaldo.textContent = fmtQ(ns) + ' ' + (p ? p.un : '');
  if(mpCm) mpCm.textContent = fmt(nc);
  if(mpVal) mpVal.textContent = State.movTipo === 'entrada' ? fmt(qty * custo) : '—';
  if(mpValWrap) mpValWrap.style.display = State.movTipo === 'entrada' ? 'inline' : 'none';
  if(mpCmParent) mpCmParent.style.display = '';

  if(prev) prev.style.display = 'block';
}

export function movCalcAjuste(){
  const id = document.getElementById('mov-prod')?.value;
  if(!id) return;

  const saldos = calcSaldos();
  const p = P().find(x => x.id === id);
  const real = parseFloat(document.getElementById('mov-real')?.value);
  const prev = document.getElementById('mov-preview');

  if(isNaN(real)){
    if(prev) prev.style.display = 'none';
    return;
  }

  const s = saldos[id] || { saldo: 0 };
  const diff = real - s.saldo;

  const mpSaldo = document.getElementById('mp-saldo');
  const mpCm = document.getElementById('mp-cm');
  const mpVal = document.getElementById('mp-val');
  const mpValWrap = document.getElementById('mp-val-wrap');

  if(mpSaldo) mpSaldo.textContent = fmtQ(real) + ' ' + (p ? p.un : '');
  if(mpCm) mpCm.textContent = '—';
  if(mpVal) mpVal.textContent = (diff >= 0 ? '+' : '') + fmtQ(diff) + ' ' + (p ? p.un : '');
  if(mpValWrap) mpValWrap.style.display = 'inline';
  if(mpCm?.parentElement) mpCm.parentElement.style.display = 'none';

  if(prev) prev.style.display = 'block';
}

export async function salvarMov(){
  const prodId = document.getElementById('mov-prod')?.value;
  if(!prodId){
    toast('Selecione produto.');
    return;
  }

  const data = document.getElementById('mov-data')?.value || '';
  const obs = document.getElementById('mov-obs')?.value.trim() || '';
  const custo = parseFloat(document.getElementById('mov-custo')?.value) || 0;

  let mov = {
    id: uid(),
    filial_id: State.FIL,
    prod_id: prodId,
    prodId,
    tipo: State.movTipo,
    data,
    obs,
    ts: Date.now(),
    custo
  };

  if(State.movTipo === 'ajuste'){
    const real = parseFloat(document.getElementById('mov-real')?.value);
    if(isNaN(real) || real < 0){
      toast('Informe o saldo real.');
      return;
    }
    mov.saldoReal = real;
    mov.saldo_real = real;
  }else{
    const qty = parseFloat(document.getElementById('mov-qty')?.value) || 0;
    if(qty <= 0){
      toast('Informe a quantidade.');
      return;
    }

    mov.qty = qty;

    if(State.movTipo === 'transf'){
      const dest = document.getElementById('mov-dest')?.value;
      if(!dest){
        toast('Selecione filial destino.');
        return;
      }

      mov.destFil = dest;

      const nomeOrig = (P().find(p => p.id === prodId) || {}).nome || '';
      const destProd = (D.produtos[dest] || []).find(p => String(p.nome || '').toLowerCase().trim() === nomeOrig.toLowerCase().trim());

      if(destProd){
        const destMov = {
          id: uid(),
          filial_id: dest,
          prod_id: destProd.id,
          prodId: destProd.id,
          tipo:'entrada',
          data,
          obs:'Transferência de ' + ((D.filiais.find(f => f.id === State.FIL) || {}).nome || ''),
          ts: Date.now() + 1,
          custo,
          qty
        };

        try{
          await SB.insertMov(destMov);
        }catch(e){
          console.error(e);
        }

        if(!D.movs[dest]) D.movs[dest] = [];
        D.movs[dest].push(destMov);
      }
    }

    if(State.movTipo === 'saida' || State.movTipo === 'transf'){
      const saldos = calcSaldos();
      const x = saldos[prodId] || { saldo: 0 };
      if(qty > x.saldo && !confirm(`Saldo atual: ${fmtQ(x.saldo)}. Registrar assim mesmo?`)){
        return;
      }
    }
  }

  try{
    await SB.insertMov(mov);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  if(!D.movs[State.FIL]) D.movs[State.FIL] = [];
  D.movs[State.FIL].push(mov);

  fecharModal('modal-mov');
  renderEstPosicao();
  renderEstAlerts();
  renderEstHist();

  toast('Movimentação registrada!');
}