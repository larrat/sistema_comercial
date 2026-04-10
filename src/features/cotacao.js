// @ts-check

/** @typedef {import('../types/domain').CotacaoLog} CotacaoLog */

import { SB } from '../app/api.js';
import { D, State, P, FORNS, CPRECOS, CCFG } from '../app/store.js';
import { uid, fmt, toast } from '../shared/utils.js';
import {
  cotFile,
  confirmarMapa,
  renderMapaBody,
  setImportacaoCallbacks
} from './cotacao/importacao.js';

export function initCotacaoModule(callbacks = {}) {
  setImportacaoCallbacks(callbacks);
}

export function renderFornSel() {
  const s = document.getElementById('cot-forn-sel');
  if (!s) return;

  const cur = s.value;
  s.innerHTML =
    '<option value="">- selecione -</option>' +
    (FORNS() || []).map((f) => `<option value="${f.id}">${f.nome}</option>`).join('');

  s.value = cur;
}

export function renderCotLogs() {
  const el = document.getElementById('cot-logs');
  if (!el) return;

  const logs = /** @type {CotacaoLog[]} */ (CCFG().logs || []);

  if (!logs.length) {
    el.innerHTML = '<div class="empty empty-inline"><p>Nenhuma importação ainda.</p></div>';
    return;
  }

  el.innerHTML = logs
    .map(
      (l) => `
    <div class="fb cot-log-row cot-log-row-shell">
      <div>
        <span class="table-cell-strong">${l.arquivo}</span>
        <span class="bdg bb cot-chip-gap">${l.forn}</span>
        ${l.mes ? `<span class="bdg bk cot-chip-gap" title="Mes de referencia">MES ${l.mes.split('-').reverse().join('/')}</span>` : ''}
      </div>
      <div class="fg2 cot-log-meta">
        <span class="table-cell-caption table-cell-muted">${l.data}</span>
        <span class="bdg bg">${l.novos || 0} novos</span>
        ${l.atu ? `<span class="bdg ba">${l.atu} atualizados</span>` : ''}
        ${l.falhas ? `<span class="bdg br">${l.falhas} falha(s)</span>` : ''}
      </div>
    </div>
  `
    )
    .join('');
}

export function renderCotForns() {
  const el = document.getElementById('cot-forns-lista');
  if (!el) return;

  const cfors = FORNS();

  if (!cfors.length) {
    el.innerHTML = `<div class="empty"><div class="ico">FORN</div><p>Nenhum fornecedor cadastrado.</p></div>`;
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
          ${cfors
            .map((f) => {
              const cotados = P().filter((p) => {
                const k = p.id + '_' + f.id;
                return CPRECOS()[k] > 0;
              }).length;

              return `
              <tr>
                <td class="table-cell-strong">${f.nome}</td>
                <td class="table-cell-muted">${f.contato || '-'}</td>
                <td>${f.prazo || '-'}</td>
                <td><span class="bdg ${cotados > 0 ? 'bg' : 'bk'}">${cotados}/${P().length}</span></td>
                <td><button class="btn btn-sm" title="Excluir fornecedor" data-click="remForn('${f.id}')">Excluir</button></td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

export async function salvarForn() {
  const nomeEl = document.getElementById('fn-nome');
  const contatoEl = document.getElementById('fn-contato');
  const prazoEl = document.getElementById('fn-prazo');

  const nome = (nomeEl?.value || '').trim();
  if (!nome) {
    toast('Informe o nome.');
    return;
  }

  const forn = {
    id: uid(),
    filial_id: State.FIL,
    nome,
    contato: (contatoEl?.value || '').trim(),
    prazo: prazoEl?.value || ''
  };

  try {
    await SB.upsertFornecedor(forn);
  } catch (e) {
    toast('Erro ao salvar: ' + e.message);
    return;
  }

  if (!D.fornecedores[State.FIL]) D.fornecedores[State.FIL] = [];
  D.fornecedores[State.FIL].push(forn);

  const modal = document.getElementById('modal-forn');
  if (modal) modal.classList.remove('on');

  renderCotForns();
  renderFornSel();

  if (nomeEl) nomeEl.value = '';
  if (contatoEl) contatoEl.value = '';
  if (prazoEl) prazoEl.value = '';

  toast('Fornecedor salvo!');
}

export async function remForn(id) {
  if (!confirm('Remover fornecedor?')) return;

  try {
    await SB.deleteFornecedor(id);
  } catch (e) {
    toast('Erro ao remover: ' + e.message);
    return;
  }

  D.fornecedores[State.FIL] = FORNS().filter((f) => f.id !== id);

  Object.keys(CPRECOS()).forEach((k) => {
    if (k.endsWith('_' + id)) delete CPRECOS()[k];
  });

  renderCotForns();
  renderFornSel();
  renderCotTabela();

  toast('Fornecedor removido!');
}

export function cotLock() {
  const cot = CCFG();
  cot.locked = !cot.locked;

  const btn = document.getElementById('cot-lock-btn');
  const alert = document.getElementById('cot-lock-alert');

  if (btn) btn.textContent = cot.locked ? 'Destravar' : 'Travar';
  if (alert) alert.style.display = cot.locked ? 'flex' : 'none';

  renderCotTabela();
  toast(cot.locked ? 'Cotação travada!' : 'Cotação destravada.');
}

export function renderCotTabela() {
  const cot = CCFG();
  const prods = P();
  const forns = FORNS();
  const precos = CPRECOS();

  const el = document.getElementById('cot-tabela');
  const mc = document.getElementById('cot-met');

  if (!el || !mc) return;

  if (!prods.length || !forns.length) {
    el.innerHTML = `<div class="empty"><div class="ico">COT</div><p>Adicione produtos e fornecedores para iniciar a cotação.</p></div>`;
    mc.innerHTML = '';
    return;
  }

  let filled = 0;
  const fTot = {};
  forns.forEach((f) => (fTot[f.id] = 0));

  let html = `
    <div class="tw cot-table-wrap">
      <table class="tbl cot-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Un</th>
            ${forns.map((f) => `<th class="table-align-right">${f.nome}</th>`).join('')}
            <th class="table-align-center">Melhor</th>
          </tr>
        </thead>
        <tbody>
  `;

  prods.forEach((p) => {
    const prices = forns.map((f) => {
      const k = p.id + '_' + f.id;
      const v = precos[k];
      return v !== undefined && v > 0 ? Number(v) : null;
    });

    const valid = prices.filter((x) => x !== null);
    const minP = valid.length ? Math.min(...valid) : null;
    const maxP = valid.length ? Math.max(...valid) : null;

    html += `<tr><td class="table-cell-strong">${p.nome}</td><td class="table-cell-muted">${p.un}</td>`;

    forns.forEach((f) => {
      const k = p.id + '_' + f.id;
      const val = precos[k] !== undefined ? Number(precos[k]) : null;

      if (val !== null && val > 0) {
        fTot[f.id] += val;
        filled++;
      }

      const isBest = val !== null && val === minP && valid.length > 1;
      const isWorst = val !== null && val === maxP && valid.length > 1 && minP !== maxP;
      const bg = isBest ? 'background:var(--gbg)' : isWorst ? 'background:var(--rbg)' : '';

      html += `<td class="table-align-right"${bg ? ` style="${bg}"` : ''}>`;

      if (cot.locked) {
        html += val !== null && val > 0 ? fmt(val) : '-';
      } else {
        html += `<input class="inp cot-table-input" type="number" value="${val !== null ? val.toFixed(2) : ''}" placeholder="0,00" min="0" step="0.01" data-change="updPreco('${p.id}','${f.id}',this.value)">`;
      }

      html += `</td>`;
    });

    html += `<td class="table-align-center">${minP !== null ? `<span class="bdg bg">${fmt(minP)}</span>` : '-'}</td></tr>`;
  });

  const allTot = Object.values(fTot).filter((v) => v > 0);
  const bestTot = allTot.length ? Math.min(...allTot) : null;

  html += `
      <tr class="cot-total-row">
        <td colspan="2" class="table-cell-muted">Total</td>
        ${forns
          .map((f) => {
            const t = fTot[f.id];
            const isBest = t > 0 && t === bestTot && allTot.length > 1;
            return `<td class="table-align-right table-cell-strong"${isBest ? ' style="background:var(--gbg)"' : ''}>${fmt(String(t))}</td>`;
          })
          .join('')}
        <td></td>
      </tr>
    </tbody></table></div>
  `;

  el.innerHTML = html;

  const pct2 =
    prods.length * forns.length ? Math.round((filled / (prods.length * forns.length)) * 100) : 0;

  /** @type {import('../types/domain').Fornecedor | null} */
  let bestForn = null;
  if (bestTot !== null) {
    Object.entries(fTot).forEach(([fid, t]) => {
      if (t === bestTot) bestForn = forns.find((f) => f.id === fid);
    });
  }

  mc.innerHTML = `
    <div class="met"><div class="ml">Produtos</div><div class="mv">${prods.length}</div></div>
    <div class="met"><div class="ml">Fornecedores</div><div class="mv">${forns.length}</div></div>
    <div class="met"><div class="ml">Preenchimento</div><div class="mv">${pct2}%</div></div>
    <div class="met"><div class="ml">Melhor fornecedor</div><div class="mv kpi-value-sm">${bestForn ? bestForn.nome : '-'}</div></div>
  `;
}

export function updPreco(pid, fid, val) {
  const cot = CCFG();
  if (cot.locked) return;

  const k = pid + '_' + fid;
  const v = parseFloat(val);

  if (!isNaN(v) && v >= 0) CPRECOS()[k] = v;
  else delete CPRECOS()[k];

  renderCotTabela();
}

export { cotFile, confirmarMapa, renderMapaBody };
