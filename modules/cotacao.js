import { SB } from '../api.js';
import { D, State, P, FORNS, CPRECOS, CCFG } from '../store.js';
import { uid, fmt, toast } from '../core/utils.js';
import { cotFile, confirmarMapa, renderMapaBody, setImportacaoCallbacks } from '../cotacao/importacao.js';

export function initCotacaoModule(callbacks = {}){
  setImportacaoCallbacks(callbacks);
}

export function renderFornSel(){
  const s = document.getElementById('cot-forn-sel');
  if(!s) return;
  const cur = s.value;
  s.innerHTML = '<option value="">— selecione —</option>' + (FORNS() || []).map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  s.value = cur;
}

export function renderCotLogs(){
  const el = document.getElementById('cot-logs');
  if(!el) return;

  const logs = CCFG().logs || [];
  if(!logs.length){
    el.innerHTML = '<div style="font-size:13px;color:var(--tx3)">Nenhuma importação ainda.</div>';
    return;
  }

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
    </div>
  `).join('');
}

export function renderCotForns(){
  const el = document.getElementById('cot-forns-lista');
  const cfors = FORNS();

  if(!el) return;

  if(!cfors.length){
    el.innerHTML = `<div class="empty"><div class="ico">🏭</div><p>Nenhum fornecedor.</p></div>`;
    return;
  }

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Contato</th>
            <th>Prazo</th>
            <th>Produtos cotados</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${cfors.map(f => {
            const cot2 = P().filter(p => {
              const k = p.id + '_' + f.id;
              return CPRECOS()[k] > 0;
            }).length;

            return `
              <tr>
                <td style="font-weight:600">${f.nome}</td>
                <td style="color:var(--tx2)">${f.contato || '—'}</td>
                <td>${f.prazo || '—'}</td>
                <td><span class="bdg ${cot2 > 0 ? 'bg' : 'bk'}">${cot2}/${P().length}</span></td>
                <td><button class="ib" onclick="remForn('${f.id}')">✕</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export async function salvarForn(){
  const nome = document.getElementById('fn-nome').value.trim();
  if(!nome){
    toast('Informe o nome.');
    return;
  }

  const forn = {
    id: uid(),
    filial_id: State.FIL,
    nome,
    contato: document.getElementById('fn-contato').value.trim(),
    prazo: document.getElementById('fn-prazo').value
  };

  try{
    await SB.upsertFornecedor(forn);
  }catch(e){
    toast('Erro ao salvar: ' + e.message);
    return;
  }

  if(!D.fornecedores[State.FIL]) D.fornecedores[State.FIL] = [];
  D.fornecedores[State.FIL].push(forn);

  const modal = document.getElementById('modal-forn');
  if(modal) modal.classList.remove('on');

  renderCotForns();
  renderFornSel();

  document.getElementById('fn-nome').value = '';
  document.getElementById('fn-contato').value = '';
  document.getElementById('fn-prazo').value = '';

  toast('Fornecedor salvo!');
}

export async function remForn(id){
  if(!confirm('Remover fornecedor?')) return;

  try{
    await SB.deleteFornecedor(id);
  }catch(e){
    toast('Erro ao remover: ' + e.message);
    return;
  }

  D.fornecedores[State.FIL] = FORNS().filter(f => f.id !== id);

  Object.keys(CPRECOS()).forEach(k => {
    if(k.includes('_' + id)) delete CPRECOS()[k];
  });

  renderCotForns();
  renderFornSel();
  toast('Fornecedor removido!');
}

export function cotLock(){
  const cot = CCFG();
  cot.locked = !cot.locked;
  document.getElementById('cot-lock-btn').textContent = cot.locked ? '🔓 Destravar' : '🔒 Travar';
  document.getElementById('cot-lock-alert').style.display = cot.locked ? 'flex' : 'none';
  renderCotTabela();
  toast(cot.locked ? 'Cotação travada!' : 'Destravada.');
}

export function renderCotTabela(){
  const cot = CCFG();
  const prods = P();
  const forns = FORNS();
  const precos = CPRECOS();

  const el = document.getElementById('cot-tabela');
  const mc = document.getElementById('cot-met');

  if(!el || !mc) return;

  if(!prods.length || !forns.length){
    el.innerHTML = `<div class="empty"><div class="ico">📊</div><p>Adicione produtos e fornecedores.</p></div>`;
    mc.innerHTML = '';
    return;
  }

  let filled = 0;
  const fTot = {};
  forns.forEach(f => fTot[f.id] = 0);

  let html = `<div class="tw"><table class="tbl"><thead><tr><th>Produto</th><th>Un</th>${forns.map(f => `<th style="text-align:right">${f.nome}</th>`).join('')}<th style="text-align:center">Melhor</th></tr></thead><tbody>`;

  prods.forEach(p => {
    const prices = forns.map(f => {
      const k = p.id + '_' + f.id;
      const v = precos[k];
      return (v !== undefined && v > 0) ? parseFloat(v) : null;
    });

    const valid = prices.filter(x => x !== null);
    const minP = valid.length ? Math.min(...valid) : null;
    const maxP = valid.length ? Math.max(...valid) : null;

    html += `<tr><td style="font-weight:600">${p.nome}</td><td style="color:var(--tx2)">${p.un}</td>`;

    forns.forEach((f, i) => {
      const k = p.id + '_' + f.id;
      const val = precos[k] !== undefined ? parseFloat(precos[k]) : null;

      if(val !== null && val > 0){
        fTot[f.id] += val;
        filled++;
      }

      const isBest = val !== null && val === minP && valid.length > 1;
      const isWorst = val !== null && val === maxP && valid.length > 1 && minP !== maxP;
      const bg = isBest ? 'background:var(--gbg)' : isWorst ? 'background:var(--rbg)' : '';

      html += `<td style="text-align:right;${bg}">`;
      if(cot.locked){
        html += val !== null && val > 0 ? fmt(val) : '—';
      }else{
        html += `<input class="inp" type="number" value="${val !== null ? val.toFixed(2) : ''}" placeholder="0,00" min="0" step="0.01" style="width:100%;text-align:right;font-size:12px;padding:5px 6px" onchange="updPreco('${p.id}','${f.id}',this.value)">`;
      }
      html += `</td>`;
    });

    html += `<td style="text-align:center">${minP !== null ? `<span class="bdg bg">${fmt(minP)}</span>` : '—'}</td></tr>`;
  });

  const allTot = Object.values(fTot).filter(v => v > 0);
  const bestTot = allTot.length ? Math.min(...allTot) : null;

  html += `<tr style="font-weight:600;border-top:1px solid var(--bd)"><td colspan="2" style="color:var(--tx2)">Total</td>${forns.map(f => {
    const t = fTot[f.id];
    const isBest = t > 0 && t === bestTot && allTot.length > 1;
    return `<td style="text-align:right;font-weight:600;${isBest ? 'background:var(--gbg)' : ''}">${fmt(t)}</td>`;
  }).join('')}<td></td></tr></tbody></table></div>`;

  el.innerHTML = html;

  const pct2 = prods.length * forns.length ? Math.round(filled / (prods.length * forns.length) * 100) : 0;
  let bestForn = null;
  if(bestTot !== null){
    Object.entries(fTot).forEach(([fid, t]) => {
      if(t === bestTot) bestForn = forns.find(f => f.id === fid);
    });
  }

  mc.innerHTML = `
    <div class="met"><div class="ml">Produtos</div><div class="mv">${prods.length}</div></div>
    <div class="met"><div class="ml">Fornecedores</div><div class="mv">${forns.length}</div></div>
    <div class="met"><div class="ml">Preenchimento</div><div class="mv">${pct2}%</div></div>
    <div class="met"><div class="ml">Melhor fornecedor</div><div class="mv" style="font-size:14px">${bestForn ? bestForn.nome : '—'}</div></div>
  `;
}

export function updPreco(pid, fid, val){
  const cot = CCFG();
  if(cot.locked) return;

  const k = pid + '_' + fid;
  const v = parseFloat(val);

  if(!isNaN(v) && v >= 0) cot.precos[k] = v;
  else delete cot.precos[k];

  renderCotTabela();
}

export {
  cotFile,
  confirmarMapa,
  renderMapaBody
};