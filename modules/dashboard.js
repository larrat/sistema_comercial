import { D, State } from '../js/store.js';
import { fmt, fmtQ, fmtN, pct } from '../core/utils.js';

const MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

let calcSaldosMultiCb = () => ({});
let atualizarBadgeEstCb = () => {};

export function initDashboardModule(callbacks = {}){
  calcSaldosMultiCb = callbacks.calcSaldosMulti || (() => ({}));
  atualizarBadgeEstCb = callbacks.atualizarBadgeEst || (() => {});
}

function getRange(){
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if(State.dashP === 'semana'){
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0,0,0,0);
    return [d, now];
  }

  if(State.dashP === 'mes'){
    return [new Date(y, m, 1), now];
  }

  if(State.dashP === 'ano'){
    return [new Date(y, 0, 1), now];
  }

  return [new Date(2000, 0, 1), now];
}

function inR(ds, [from, to]){
  if(!ds) return false;
  const d = new Date(ds + 'T00:00:00');
  return d >= from && d <= to;
}

function fmtK(v){
  return v >= 1000 ? 'R$ ' + (v / 1000).toFixed(1) + 'k' : 'R$ ' + v.toFixed(0);
}

export function setP(p, btn){
  State.dashP = p;
  document.querySelectorAll('#dash-pseg button').forEach(b => b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  renderDash();
}

export function renderDashFilSel(){
  const s = document.getElementById('dash-fil');
  if(!s) return;

  const cur = s.value;
  s.innerHTML =
    '<option value="todas">Todas as filiais</option>' +
    D.filiais.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');

  s.value = cur || 'todas';
}

export function renderDash(){
  const fsel = document.getElementById('dash-fil')?.value || 'todas';
  const range = getRange();

  const pLabels = {
    semana:'Esta semana',
    mes:'Este mês',
    ano:'Este ano',
    tudo:'Todos os períodos'
  };

  const fLabel = fsel === 'todas'
    ? 'Consolidado'
    : D.filiais.find(f => f.id === fsel)?.nome || '';

  const desc = document.getElementById('dash-desc');
  if(desc) desc.textContent = fLabel + ' — ' + pLabels[State.dashP];

  const filIds = fsel === 'todas'
    ? D.filiais.map(f => f.id)
    : [fsel];

  const allPeds = filIds.flatMap(fid =>
    (D.pedidos[fid] || []).map(p => ({ ...p, _fid: fid }))
  );

  const entregues = allPeds.filter(p => p.status === 'entregue' && inR(p.data, range));
  const fat = entregues.reduce((a, p) => a + (p.total || 0), 0);
  const lucro = entregues.reduce(
    (a, p) => a + (p.itens || []).reduce((b, i) => b + ((i.preco - i.custo) * i.qty), 0),
    0
  );

  const mg = fat > 0 ? (lucro / fat) * 100 : 0;
  const tk = entregues.length ? fat / entregues.length : 0;
  const abertos = allPeds.filter(p => ['orcamento','confirmado','em_separacao'].includes(p.status)).length;

  const met = document.getElementById('dash-met');
  if(met){
    met.innerHTML = `
      <div class="met"><div class="ml">Faturamento</div><div class="mv" style="font-size:16px">${fmt(fat)}</div><div class="ms">${entregues.length} entregue(s)</div></div>
      <div class="met"><div class="ml">Lucro bruto</div><div class="mv" style="font-size:16px;color:${lucro >= 0 ? 'var(--g)' : 'var(--r)'}">${fmt(lucro)}</div></div>
      <div class="met"><div class="ml">Margem</div><div class="mv" style="color:${mg >= 15 ? 'var(--g)' : mg >= 8 ? 'var(--a)' : 'var(--r)'}">${pct(mg)}</div></div>
      <div class="met"><div class="ml">Ticket médio</div><div class="mv" style="font-size:16px">${fmt(tk)}</div></div>
      <div class="met"><div class="ml">Em aberto</div><div class="mv" style="color:var(--a)">${abertos}</div></div>
    `;
  }

  const saldos = calcSaldosMultiCb(filIds);

  const allProds = filIds.flatMap(fid =>
    (D.produtos[fid] || []).map(p => ({ ...p, _fid: fid }))
  );

  const crit = allProds.filter(p => {
    const s = saldos[p._fid + '_' + p.id];
    return s && s.saldo <= 0;
  });

  const baixo = allProds.filter(p => {
    const s = saldos[p._fid + '_' + p.id];
    return s && p.emin > 0 && s.saldo > 0 && s.saldo < p.emin;
  });

  let ah = '';
  if(crit.length){
    ah += `<div class="alert al-r">🚨 <b>${crit.length} produto(s) zerado(s):</b> ${crit.slice(0,4).map(p => p.nome).join(', ')}${crit.length > 4 ? '…' : ''}</div>`;
  }
  if(baixo.length){
    ah += `<div class="alert al-a">⚠ <b>${baixo.length} abaixo do mínimo:</b> ${baixo.slice(0,4).map(p => p.nome).join(', ')}${baixo.length > 4 ? '…' : ''}</div>`;
  }

  const alerts = document.getElementById('dash-alerts');
  if(alerts) alerts.innerHTML = ah;

  const chartEl = document.getElementById('dash-chart');
  const emEl = document.getElementById('dash-chart-empty');

  const grupos = {};
  entregues.forEach(p => {
    const d = new Date(p.data + 'T00:00:00');
    const k = State.dashP === 'ano'
      ? MES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2)
      : p.data;

    if(!grupos[k]) grupos[k] = { fat: 0, lucro: 0 };
    grupos[k].fat += p.total || 0;
    grupos[k].lucro += (p.itens || []).reduce((a, i) => a + ((i.preco - i.custo) * i.qty), 0);
  });

  const gkeys = Object.keys(grupos).sort().slice(-10);

  if(chartEl && emEl){
    if(!gkeys.length){
      chartEl.style.display = 'none';
      emEl.style.display = 'block';
    }else{
      chartEl.style.display = 'flex';
      emEl.style.display = 'none';

      const mxF = Math.max(...gkeys.map(k => grupos[k].fat), 1);

      chartEl.innerHTML = gkeys.map(k => {
        const g = grupos[k];
        const hF = Math.round((g.fat / mxF) * 100);
        const hL = Math.round((Math.max(0, g.lucro) / mxF) * 100);
        const lbl = State.dashP === 'ano' ? k : k.split('-').slice(1).join('/');

        return `
          <div class="bc-col">
            <div class="bc-val">${fmtK(g.fat)}</div>
            <div style="display:flex;align-items:flex-end;gap:2px;flex:1;width:100%">
              <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end">
                <div class="bc-bar" style="height:${hF}%;background:#163F80;opacity:.82"></div>
              </div>
              <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end">
                <div class="bc-bar" style="height:${hL}%;background:#156038;opacity:.82"></div>
              </div>
            </div>
            <div class="bc-lbl">${lbl}</div>
          </div>
        `;
      }).join('');
    }
  }

  const stMap = {
    orcamento:0,
    confirmado:0,
    em_separacao:0,
    entregue:0,
    cancelado:0
  };

  allPeds.forEach(p => {
    if(p.status in stMap) stMap[p.status]++;
  });

  const stLbl = {
    orcamento:'Orçamento',
    confirmado:'Confirmado',
    em_separacao:'Em separação',
    entregue:'Entregue',
    cancelado:'Cancelado'
  };

  const stCls = {
    orcamento:'bk',
    confirmado:'bb',
    em_separacao:'ba',
    entregue:'bg',
    cancelado:'br'
  };

  const tot = allPeds.length || 1;
  const dashStatus = document.getElementById('dash-status');
  if(dashStatus){
    dashStatus.innerHTML = Object.entries(stMap).map(([k, v]) => `
      <div class="rrow">
        <span class="bdg ${stCls[k]}">${stLbl[k]}</span>
        <div class="rbar"><div class="rbar-f" style="width:${Math.round((v / tot) * 100)}%;background:var(--bd2)"></div></div>
        <span style="font-size:13px;font-weight:600;min-width:20px;text-align:right">${v}</span>
      </div>
    `).join('');
  }

  const pq = {};
  entregues.forEach(p => {
    (p.itens || []).forEach(i => {
      if(!pq[i.nome]) pq[i.nome] = { fat: 0 };
      pq[i.nome].fat += i.qty * i.preco;
    });
  });

  const tp = Object.entries(pq).sort((a, b) => b[1].fat - a[1].fat).slice(0, 5);
  const mxP = tp.length ? tp[0][1].fat : 1;

  const dashTp = document.getElementById('dash-tp');
  if(dashTp){
    dashTp.innerHTML = tp.length
      ? tp.map(([n, d], i) => `
          <div class="rrow">
            <span class="rnum">${i + 1}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:${i === 0 ? 600 : 400}">${n}</span>
            <div class="rbar"><div class="rbar-f" style="width:${Math.round((d.fat / mxP) * 100)}%;background:#163F80"></div></div>
            <span class="rval">${fmtK(d.fat)}</span>
          </div>
        `).join('')
      : `<div class="empty" style="padding:12px"><p>Sem vendas</p></div>`;
  }

  const alertProds = allProds.filter(p => {
    const s = saldos[p._fid + '_' + p.id];
    return s && p.emin > 0 && s.saldo < p.emin;
  }).slice(0, 5);

  const dashEa = document.getElementById('dash-ea');
  if(dashEa){
    dashEa.innerHTML = alertProds.length
      ? alertProds.map(p => {
          const s = saldos[p._fid + '_' + p.id];
          return `
            <div class="rrow">
              <span style="width:8px;height:8px;border-radius:50%;background:${s.saldo <= 0 ? 'var(--r)' : 'var(--a)'};flex-shrink:0;display:inline-block"></span>
              <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nome}</span>
              <span class="bdg ${s.saldo <= 0 ? 'br' : 'ba'}" style="font-size:10px">${s.saldo <= 0 ? 'Zerado' : fmtQ(s.saldo)}</span>
            </div>
          `;
        }).join('')
      : `<div class="empty" style="padding:12px"><p>✓ Sem alertas</p></div>`;
  }

  const fu = {};
  filIds.forEach(fid => {
    (D.cotConfig[fid]?.logs || []).forEach(l => {
      if(!fu[l.forn]) fu[l.forn] = 0;
      fu[l.forn]++;
    });
  });

  const tf = Object.entries(fu).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const mxF2 = tf.length ? tf[0][1] : 1;

  const dashForn = document.getElementById('dash-forn');
  if(dashForn){
    dashForn.innerHTML = tf.length
      ? tf.map(([n, c], i) => `
          <div class="rrow">
            <span class="rnum">${i + 1}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</span>
            <div class="rbar"><div class="rbar-f" style="width:${Math.round((c / mxF2) * 100)}%;background:#156038"></div></div>
            <span class="rval" style="color:var(--tx2)">${c}x</span>
          </div>
        `).join('')
      : `<div class="empty" style="padding:12px"><p>Nenhuma importação</p></div>`;
  }

  const mp = {};
  entregues.forEach(p => {
    (p.itens || []).forEach(i => {
      if(!mp[i.nome]) mp[i.nome] = { fat: 0, lucro: 0, qty: 0 };
      mp[i.nome].fat += i.qty * i.preco;
      mp[i.nome].lucro += (i.preco - i.custo) * i.qty;
      mp[i.nome].qty += i.qty;
    });
  });

  const tmg = Object.entries(mp).sort((a, b) => b[1].fat - a[1].fat).slice(0, 8);

  const dashMargem = document.getElementById('dash-margem');
  if(dashMargem){
    dashMargem.innerHTML = tmg.length
      ? `
        <div class="tw">
          <table class="tbl">
            <thead>
              <tr>
                <th>Produto</th>
                <th style="text-align:right">Qtd</th>
                <th style="text-align:right">Faturamento</th>
                <th style="text-align:right">Lucro</th>
                <th style="text-align:right">Margem</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tmg.map(([n, d]) => {
                const mgv = d.fat > 0 ? (d.lucro / d.fat) * 100 : 0;
                return `
                  <tr>
                    <td style="font-weight:600">${n}</td>
                    <td style="text-align:right;color:var(--tx2)">${fmtN(d.qty, 1)}</td>
                    <td style="text-align:right">${fmt(d.fat)}</td>
                    <td style="text-align:right;color:var(--g)">${fmt(d.lucro)}</td>
                    <td style="text-align:right;font-weight:600">${pct(mgv)}</td>
                    <td><span class="bdg ${mgv >= 20 ? 'bg' : mgv >= 10 ? 'ba' : 'br'}">${mgv >= 20 ? 'Boa' : mgv >= 10 ? 'Regular' : 'Baixa'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `
      : `<div class="empty" style="padding:12px"><p>Sem vendas no período</p></div>`;
  }

  atualizarBadgeEstCb();
}