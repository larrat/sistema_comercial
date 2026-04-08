// @ts-check

import { SB } from '../app/api.js';
import { D, State, P, MOVS } from '../app/store.js';
import { createScreenDom } from '../shared/dom.js';
import { abrirModal, fecharModal, fmt, fmtN, fmtQ, toast } from '../shared/utils.js';

/** @typedef {import('../types/domain').MovimentoEstoque} MovimentoEstoque */
/** @typedef {import('../types/domain').ScreenDom} ScreenDom */

/** @type {ScreenDom} */
const estDom = createScreenDom('estoque', [
  'est-badge',
  'est-alerts',
  'est-busca',
  'est-fil',
  'est-met',
  'est-posicao',
  'est-hist-busca',
  'est-hist-tipo',
  'est-hist',
  'mov-prod',
  'mov-data',
  'mov-qty',
  'mov-custo',
  'mov-obs',
  'mov-real',
  'mov-saldo-panel',
  'mov-preview',
  'mov-dest',
  'mov-ajuste-row',
  'mov-transf-row',
  'mov-qty-row',
  'mov-custo-wrap',
  'mov-qty-lbl',
  'ms-saldo',
  'ms-cm',
  'mp-saldo',
  'mp-cm',
  'mp-val',
  'mp-val-wrap'
]);

/** @returns {Record<string, { saldo: number; cm: number }>} */
export function calcSaldos(){
  /** @type {Record<string, { saldo: number; cm: number }>} */
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
      } else if(m.tipo === 'saida' || m.tipo === 'transf'){
        c.saldo -= (m.qty || 0);
      } else if(m.tipo === 'ajuste'){
        c.saldo = m.saldo_real || m.saldoReal || 0;
      }
    });

  return map;
}

/**
 * @param {string[]} filIds
 * @returns {Record<string, { saldo: number; cm: number }>}
 */
export function calcSaldosMulti(filIds){
  /** @type {Record<string, { saldo: number; cm: number }>} */
  const map = {};

  filIds.forEach(fid => {
    const prods = D.produtos[fid] || [];
    prods.forEach(p => {
      map[fid + '_' + p.id] = {
        saldo: p.esal || 0,
        cm: p.ecm || p.custo || 0
      };
    });

    const movs = D.movs[fid] || [];
    [...movs]
      .sort((a, b) => (a.ts || 0) - (b.ts || 0))
      .forEach(m => {
        const pid = m.prodId || m.prod_id;
        const key = fid + '_' + pid;
        if(!map[key]) return;

        const c = map[key];

        if(m.tipo === 'entrada'){
          const q = m.qty || 0;
          const cu = m.custo || c.cm || 0;
          const ns = c.saldo + q;
          c.cm = ns > 0 ? ((c.saldo * c.cm) + (q * cu)) / ns : cu;
          c.saldo = ns;
        } else if(m.tipo === 'saida' || m.tipo === 'transf'){
          c.saldo -= (m.qty || 0);
        } else if(m.tipo === 'ajuste'){
          c.saldo = m.saldo_real || m.saldoReal || 0;
        }
      });
  });

  return map;
}

export function atualizarBadgeEst(){
  const saldos = calcSaldos();
  const al = P().filter(p => {
    const s = saldos[p.id];
    return s && p.emin > 0 && s.saldo < p.emin;
  });

  const b = estDom.get('est-badge');
  if(!b) return;

  b.style.display = al.length ? 'inline-flex' : 'none';
  b.textContent = String(al.length);
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
    h += `<div class="alert al-r"><b>${crit.length} zerado(s):</b> ${crit.map(p => p.nome).join(', ')}</div>`;
  }
  if(baixo.length){
    h += `<div class="alert al-a"><b>${baixo.length} abaixo do minimo:</b> ${baixo.map(p => p.nome).join(', ')}</div>`;
  }

  estDom.html('alerts', 'est-alerts', h, 'estoque:alerts');

  atualizarBadgeEst();
}

export function renderEstPosicao(){
  const saldos = calcSaldos();
  const q = (estDom.get('est-busca')?.value || '').toLowerCase();
  const f = estDom.get('est-fil')?.value || '';

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

  estDom.html('metrics', 'est-met', `
    <div class="met"><div class="ml">Produtos</div><div class="mv">${P().length}</div></div>
    <div class="met"><div class="ml">Valor em estoque</div><div class="mv kpi-value-sm">${fmt(tv)}</div></div>
    <div class="met"><div class="ml">Em alerta</div><div class="mv tone-warning">${atv}</div></div>
    <div class="met"><div class="ml">Zerados</div><div class="mv tone-danger">${zt}</div></div>
  `, 'estoque:metrics');

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

  const el = estDom.get('est-posicao');
  if(!el) return;

  if(!filtered.length){
    estDom.html('position', 'est-posicao', `<div class="empty"><div class="ico">ES</div><p>${P().length ? 'Nenhum encontrado.' : 'Cadastre produtos em "Produtos".'}</p></div>`, 'estoque:posicao-vazia');
    return;
  }

  const isMobile = window.matchMedia('(max-width: 1280px)').matches;
  if(isMobile){
    estDom.html('position', 'est-posicao', filtered.map(p => {
      const s = saldos[p.id] || { saldo: 0, cm: 0 };
      const min = p.emin || 0;
      const valor = s.saldo * s.cm;
      let stC = 'bg';
      let stL = 'OK';
      if(s.saldo <= 0){ stC = 'br'; stL = 'Zerado'; }
      else if(min > 0 && s.saldo < min){ stC = 'ba'; stL = 'Baixo'; }
      return `
        <div class="card mobile-card">
          <div class="mobile-card-head">
            <div class="mobile-card-grow">
              <div class="mobile-card-title">${p.nome}</div>
              <div class="mobile-card-sub">${p.sku || 'Sem SKU'} - ${p.un}</div>
            </div>
            <span class="bdg ${stC}">${stL}</span>
          </div>
          <div class="mobile-card-meta">
            <div>Saldo: <b class="meta-emphasis">${fmtQ(s.saldo)} ${p.un}</b>${min > 0 ? ` - min. ${fmtQ(min)}` : ''}</div>
            <div>Custo medio: <b class="meta-emphasis">${fmt(s.cm)}</b></div>
            <div>Valor em estoque: <b class="meta-emphasis">${fmt(valor)}</b></div>
          </div>
          <div class="mobile-card-actions">
            <button class="btn btn-p btn-sm" title="Movimentar produto" data-click="abrirMovProd('${p.id}')">Movimentar</button>
          </div>
        </div>
      `;
    }).join(''), 'estoque:posicao-mobile');
    return;
  }

  estDom.html('position', 'est-posicao', `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Produto</th>
            <th>SKU</th>
            <th>Saldo</th>
            <th>Custo medio</th>
            <th>Valor Total</th>
            <th>Minimo</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(p => {
            const s = saldos[p.id] || { saldo: 0, cm: 0 };
            const min = p.emin || 0;
            const pctBar = min > 0 ? Math.min(100, Math.max(0, (s.saldo / min) * 100)) : 100;

            let stC, stL;
            if(s.saldo <= 0){
              stC = 'br';
              stL = 'Zerado';
            } else if(min > 0 && s.saldo < min){
              stC = 'ba';
              stL = 'Baixo';
            } else {
              stC = 'bg';
              stL = 'OK';
            }

            return `
              <tr>
                <td class="table-cell-strong">${p.nome}</td>
                <td class="table-cell-caption table-cell-muted">${p.sku || '-'}</td>
                <td>
                  <div class="table-cell-strong">${fmtQ(s.saldo)} ${p.un}</div>
                  ${min > 0 ? `<div class="sbar"><div class="sbar-f" style="width:${pctBar}%;background:${s.saldo <= 0 ? 'var(--r)' : s.saldo < min ? 'var(--a)' : 'var(--g)'}"></div></div>` : ''}
                </td>
                <td>${fmt(s.cm)}</td>
                <td class="table-cell-strong">${fmt(s.saldo * s.cm)}</td>
                <td class="table-cell-muted">${min > 0 ? fmtQ(min) + ' ' + p.un : '-'}</td>
                <td><span class="bdg ${stC}">${stL}</span></td>
                <td><button class="btn btn-sm" title="Movimentar produto" data-click="abrirMovProd('${p.id}')">Movimentar</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `, 'estoque:posicao-desktop');
}

export function renderEstHist(){
  const q = (estDom.get('est-hist-busca')?.value || '').toLowerCase();
  const tf = estDom.get('est-hist-tipo')?.value || '';

  const movs = [...(MOVS() || [])]
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .filter(m => {
      const pid = m.prodId || m.prod_id;
      const p = P().find(x => x.id === pid);
      return (
        (!q || (p && p.nome.toLowerCase().includes(q)) || (m.obs || '').toLowerCase().includes(q)) &&
        (!tf || m.tipo === tf)
      );
    });

  const el = estDom.get('est-hist');
  if(!el) return;

  if(!movs.length){
    estDom.html('history', 'est-hist', `<div class="empty"><div class="ico">MV</div><p>Nenhuma movimentacao.</p></div>`, 'estoque:hist-vazio');
    return;
  }

  const tiInfo = {
    entrada:{ ico:'EN', lbl:'Entrada' },
    saida:{ ico:'SA', lbl:'Saida' },
    ajuste:{ ico:'AJ', lbl:'Ajuste' },
    transf:{ ico:'TR', lbl:'Transferencia' }
  };

  const isMobile = window.matchMedia('(max-width: 1280px)').matches;
  if(isMobile){
    estDom.html('history', 'est-hist', movs.map(m => {
      const prodId = m.prodId || m.prod_id;
      const p = P().find(x => x.id === prodId);
      const ti = tiInfo[m.tipo] || { ico:'?', lbl:m.tipo };
      const sinal = m.tipo === 'entrada' ? '+' : m.tipo === 'saida' ? '-' : '+/-';
      const cor = m.tipo === 'entrada' ? 'var(--g)' : m.tipo === 'saida' ? 'var(--r)' : 'var(--tx)';
      const qShow = m.tipo === 'ajuste'
        ? `-> ${fmtQ(m.saldoReal || m.saldo_real)}`
        : sinal + fmtQ(m.qty || 0);
      return `
        <div class="card mobile-card">
          <div class="mobile-card-head">
            <div class="mobile-card-grow">
              <div class="mobile-card-title">${p ? p.nome : '-'}</div>
              <div class="mobile-card-sub">${m.data || '-'} - ${ti.lbl}</div>
            </div>
            <span class="bdg bk">${ti.ico}</span>
          </div>
          <div class="mobile-card-meta">
            <div>Quantidade: <b style="color:${cor}">${qShow} ${p ? p.un : ''}</b></div>
            <div>Custo: <b class="meta-emphasis">${m.custo > 0 ? fmt(m.custo) : '-'}</b></div>
            <div>Obs: <b class="table-cell-muted">${m.obs || '-'}</b></div>
          </div>
          <div class="mobile-card-actions">
            <button class="btn btn-sm" title="Excluir movimentacao" data-click="excluirMov('${m.id}')">Excluir</button>
          </div>
        </div>
      `;
    }).join(''), 'estoque:hist-mobile');
    return;
  }

  estDom.html('history', 'est-hist', `
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

            const sinal = m.tipo === 'entrada' ? '+' : m.tipo === 'saida' ? '-' : '+/-';
            const cor = m.tipo === 'entrada' ? 'var(--g)' : m.tipo === 'saida' ? 'var(--r)' : 'var(--tx)';
            const qShow = m.tipo === 'ajuste'
              ? `-> ${fmtQ(m.saldoReal || m.saldo_real)}`
              : sinal + fmtQ(m.qty || 0);

            return `
              <tr>
                <td><div class="mono-token mono-token-sm">${ti.ico}</div></td>
                <td class="table-cell-strong">${p ? p.nome : '-'}</td>
                <td class="table-cell-caption table-cell-muted">${m.data || '-'}</td>
                <td><span class="bdg bk">${ti.lbl}</span></td>
                <td class="table-cell-strong" style="color:${cor}">${qShow} ${p ? p.un : ''}</td>
                <td class="table-cell-muted">${m.custo > 0 ? fmt(m.custo) : '-'}</td>
                <td class="table-cell-caption table-cell-muted">${m.obs || '-'}</td>
                <td><button class="btn btn-sm" title="Excluir movimentacao" data-click="excluirMov('${m.id}')">Excluir</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `, 'estoque:hist-desktop');
}

export async function excluirMov(id){
  if(!confirm('Excluir movimentacao?')) return;

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
  const s = estDom.get('mov-prod');
  if(!s) return;

  const cur = s.value;
  estDom.select(
    'selectors',
    'mov-prod',
    '<option value="">- selecione -</option>' +
      P().map(p => `<option value="${p.id}">${p.nome} (${p.un})</option>`).join(''),
    cur,
    'estoque:mov-produtos'
  );
}

export function refreshDestSel(){
  const s = estDom.get('mov-dest');
  if(!s) return;

  estDom.select(
    'selectors',
    'mov-dest',
    '<option value="">- selecione -</option>' +
      (D.filiais || [])
        .filter(f => f.id !== State.FIL)
        .map(f => `<option value="${f.id}">${f.nome}</option>`)
        .join(''),
    s.value,
    'estoque:mov-destinos'
  );
}

export function resetMov(){
  State.movTipo = 'entrada';
  setTipo('entrada');

  estDom.value('mov-prod', '');
  estDom.value('mov-data', new Date().toISOString().split('T')[0]);
  estDom.value('mov-qty', '');
  estDom.value('mov-custo', '');
  estDom.value('mov-obs', '');
  estDom.value('mov-real', '');
  estDom.display('movement', 'mov-saldo-panel', 'none', 'estoque:mov-reset');
  estDom.display('movement', 'mov-preview', 'none', 'estoque:mov-reset');

  refreshMovSel();
  refreshDestSel();
}

export function abrirMovProd(id){
  resetMov();
  setTimeout(() => {
    const el = estDom.get('mov-prod');
    if(el){
      el.value = id;
      movLoadProd();
    }
  }, 50);
  abrirModal('modal-mov');
}

export function setTipo(t){
  State.movTipo = t;

  ['entrada','saida','ajuste','transf'].forEach(x => {
    const el = document.getElementById('tc-' + x);
    if(el) el.classList.toggle('sel', x === t);
  });

  const ajusteRow = estDom.get('mov-ajuste-row');
  const transfRow = estDom.get('mov-transf-row');
  const qtyRow = estDom.get('mov-qty-row');
  const custoWrap = estDom.get('mov-custo-wrap');
  const qtyLbl = estDom.get('mov-qty-lbl');

  if(ajusteRow) ajusteRow.style.display = t === 'ajuste' ? 'grid' : 'none';
  if(transfRow) transfRow.style.display = t === 'transf' ? 'grid' : 'none';
  if(qtyRow) qtyRow.style.display = t === 'ajuste' ? 'none' : 'grid';
  if(custoWrap) custoWrap.style.display = t === 'entrada' ? 'block' : 'none';

  const lbls = {
    entrada:'Quantidade recebida',
    saida:'Quantidade saida',
    transf:'Quantidade transferida'
  };

  if(qtyLbl) qtyLbl.textContent = lbls[t] || 'Quantidade';

  movCalc();
}

export function movLoadProd(){
  const id = estDom.get('mov-prod')?.value;
  const saldos = calcSaldos();

  if(!id){
    const panel = estDom.get('mov-saldo-panel');
    if(panel) panel.style.display = 'none';
    return;
  }

  const p = P().find(x => x.id === id);
  const s = saldos[id] || { saldo: 0, cm: 0 };

  const msSaldo = estDom.get('ms-saldo');
  const msCm = estDom.get('ms-cm');
  const custo = estDom.get('mov-custo');
  const panel = estDom.get('mov-saldo-panel');

  if(msSaldo) msSaldo.textContent = fmtQ(s.saldo) + ' ' + (p ? p.un : '');
  if(msCm) msCm.textContent = fmt(s.cm);
  if(custo instanceof HTMLInputElement) custo.placeholder = s.cm > 0 ? fmtN(s.cm) : '0,00';
  if(panel) panel.style.display = 'block';

  movCalc();
}

export function movCalc(){
  const id = estDom.get('mov-prod')?.value;
  if(!id) return;

  if(State.movTipo === 'ajuste'){
    movCalcAjuste();
    return;
  }

  const saldos = calcSaldos();
  const s = saldos[id] || { saldo: 0, cm: 0 };
  const p = P().find(x => x.id === id);
  const qty = parseFloat(estDom.get('mov-qty')?.value) || 0;
  const custo = parseFloat(estDom.get('mov-custo')?.value) || s.cm || 0;
  const prev = estDom.get('mov-preview');

  if(!prev) return;

  if(qty <= 0){
    prev.style.display = 'none';
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

  const mpSaldo = estDom.get('mp-saldo');
  const mpCm = estDom.get('mp-cm');
  const mpVal = estDom.get('mp-val');
  const mpValWrap = estDom.get('mp-val-wrap');

  if(mpSaldo) mpSaldo.textContent = fmtQ(ns) + ' ' + (p ? p.un : '');
  if(mpCm) mpCm.textContent = fmt(nc);
  if(mpVal) mpVal.textContent = State.movTipo === 'entrada' ? fmt(qty * custo) : '-';
  if(mpValWrap) mpValWrap.style.display = State.movTipo === 'entrada' ? 'inline' : 'none';
  if(mpCm?.parentElement) mpCm.parentElement.style.display = '';

  prev.style.display = 'block';
}

export function movCalcAjuste(){
  const id = estDom.get('mov-prod')?.value;
  if(!id) return;

  const saldos = calcSaldos();
  const p = P().find(x => x.id === id);
  const real = parseFloat(estDom.get('mov-real')?.value);
  const prev = estDom.get('mov-preview');

  if(!prev) return;

  if(isNaN(real)){
    prev.style.display = 'none';
    return;
  }

  const s = saldos[id] || { saldo: 0 };
  const diff = real - s.saldo;

  const mpSaldo = estDom.get('mp-saldo');
  const mpCm = estDom.get('mp-cm');
  const mpVal = estDom.get('mp-val');
  const mpValWrap = estDom.get('mp-val-wrap');

  if(mpSaldo) mpSaldo.textContent = fmtQ(real) + ' ' + (p ? p.un : '');
  if(mpCm) mpCm.textContent = '-';
  if(mpVal) mpVal.textContent = (diff >= 0 ? '+' : '') + fmtQ(diff) + ' ' + (p ? p.un : '');
  if(mpValWrap) mpValWrap.style.display = 'inline';
  if(mpCm?.parentElement) mpCm.parentElement.style.display = 'none';

  prev.style.display = 'block';
}

export async function salvarMov(){
  const prodId = estDom.get('mov-prod')?.value;
  if(!prodId){
    toast('Selecione produto.');
    return;
  }

  const data = estDom.get('mov-data')?.value || '';
  const obs = estDom.get('mov-obs')?.value.trim() || '';
  const custo = parseFloat(estDom.get('mov-custo')?.value) || 0;

  let mov = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2,8),
    filial_id: State.FIL,
    prod_id: prodId,
    tipo: State.movTipo,
    data,
    obs,
    ts: Date.now(),
    custo
  };

  if(State.movTipo === 'ajuste'){
    const real = parseFloat(estDom.get('mov-real')?.value);
    if(isNaN(real) || real < 0){
      toast('Informe o saldo real.');
      return;
    }
    mov.saldo_real = real;
  } else {
    const qty = parseFloat(estDom.get('mov-qty')?.value) || 0;
    if(qty <= 0){
      toast('Informe a quantidade.');
      return;
    }
    mov.qty = qty;

    if(State.movTipo === 'transf'){
      const dest = estDom.get('mov-dest')?.value;
      if(!dest){
        toast('Selecione filial destino.');
        return;
      }

      mov.dest_fil = dest;

      const nomeOrig = (P().find(p => p.id === prodId) || {}).nome || '';
      const destProd = (D.produtos[dest] || []).find(p => String(p.nome || '').toLowerCase().trim() === nomeOrig.toLowerCase().trim());

      if(destProd){
        const destMov = {
          id: Date.now() + '-dest-' + Math.random().toString(36).slice(2,8),
          filial_id: dest,
          prod_id: destProd.id,
          tipo: 'entrada',
          data,
          obs: 'Transferencia de ' + ((D.filiais.find(f => f.id === State.FIL) || {}).nome || ''),
          ts: Date.now() + 1,
          custo,
          qty
        };

        try{
          await SB.insertMov(destMov);
        }catch(e){
          console.error('Erro ao registrar movimento destino', e);
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

  toast('Movimentacao registrada!');
}

