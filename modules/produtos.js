import { SB } from '../js/api.js';
import { D, State, P } from '../js/store.js';
import { abrirModal, fecharModal, uid, fmt, fmtQ, mk2mg, mg2mk, prV, toast, notify, focusField } from '../core/utils.js';
import { SEVERITY } from '../core/messages.js';

let calcSaldosSafe = () => ({});

export function initProdutosModule(callbacks = {}){
  calcSaldosSafe = callbacks.calcSaldos || (() => ({}));
}

export function renderProdMet(){
  const prods = P();
  const cats = [...new Set(prods.map(p => p.cat).filter(Boolean))];

  const met = document.getElementById('prod-met');
  if(met){
    met.innerHTML = `
      <div class="met"><div class="ml">Produtos</div><div class="mv">${prods.length}</div></div>
      <div class="met"><div class="ml">Categorias</div><div class="mv">${cats.length}</div></div>
      <div class="met"><div class="ml">Com precificação</div><div class="mv">${prods.filter(p => p.mkv > 0).length}</div></div>
    `;
  }

  const sel = document.getElementById('prod-cat-fil');
  if(sel){
    const cur = sel.value;
    sel.innerHTML =
      '<option value="">Todas as categorias</option>' +
      cats.sort().map(c => `<option value="${c}">${c}</option>`).join('');
    sel.value = cur;
  }
}

export function renderProdutos(){
  const buscaEl = document.getElementById('prod-busca');
  const catEl = document.getElementById('prod-cat-fil');
  const el = document.getElementById('prod-lista');

  if(!el) return;

  const q = (buscaEl?.value || '').toLowerCase();
  const cat = catEl?.value || '';
  const saldos = calcSaldosSafe();

  const filtrados = P().filter(p =>
    (!q || p.nome.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) &&
    (!cat || p.cat === cat)
  );

  if(!filtrados.length){
    el.innerHTML = `<div class="empty"><div class="ico">📦</div><p>${P().length ? 'Nenhum encontrado.' : 'Cadastre o primeiro produto desta filial.'}</p></div>`;
    return;
  }

  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  if(isMobile){
    el.innerHTML = filtrados.map(p => {
      const pv = prV(p.custo, p.mkv);
      const pa = p.pfa > 0 ? p.pfa : (p.mka > 0 ? prV(p.custo, p.mka) : 0);
      const s = saldos[p.id] || { saldo: 0, cm: 0 };
      const zero = s.saldo <= 0;
      const baixo = p.emin > 0 && s.saldo > 0 && s.saldo < p.emin;
      const st = zero ? '<span class="bdg br">Zerado</span>' : (baixo ? '<span class="bdg ba">Baixo</span>' : '<span class="bdg bg">OK</span>');

      return `
        <div class="card mobile-card">
          <div class="mobile-card-head">
            <div style="min-width:0">
              <div class="mobile-card-title">${p.nome}</div>
              <div class="mobile-card-sub">${p.sku || 'Sem SKU'}${p.cat ? ` • ${p.cat}` : ''}</div>
            </div>
            <div>${st}</div>
          </div>

          <div class="mobile-card-meta">
            <div>Custo: <b style="color:var(--tx)">${fmt(p.custo)}</b></div>
            <div>Varejo: <b style="color:var(--tx)">${p.mkv > 0 ? fmt(pv) : '—'}</b> ${p.mkv > 0 ? `<span class="bdg bb" style="font-size:10px">${p.mkv.toFixed(0)}%</span>` : ''}</div>
            <div>Atacado: <b style="color:var(--tx)">${pa > 0 ? fmt(pa) : '—'}</b></div>
            <div>Saldo: <b style="color:${zero ? 'var(--r)' : baixo ? 'var(--a)' : 'var(--tx)'}">${fmtQ(s.saldo)} ${p.un}</b> ${p.emin > 0 ? `• mín. ${fmtQ(p.emin)}` : ''}</div>
          </div>

          <div class="mobile-card-actions">
            <button class="ib" title="Movimentar estoque" onclick="abrirMovProd('${p.id}')">MOV</button>
            <button class="ib" title="Editar produto" onclick="editarProd('${p.id}')">EDT</button>
            <button class="ib" title="Excluir produto" onclick="removerProd('${p.id}')">DEL</button>
          </div>
        </div>
      `;
    }).join('');
    return;
  }

  el.innerHTML = `
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>Nome</th>
            <th>SKU</th>
            <th>Un</th>
            <th>Cat.</th>
            <th>Custo</th>
            <th>Varejo</th>
            <th>Atacado</th>
            <th>Saldo</th>
            <th>Mín.</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${filtrados.map(p => {
            const pv = prV(p.custo, p.mkv);
            const pa = p.pfa > 0 ? p.pfa : (p.mka > 0 ? prV(p.custo, p.mka) : 0);
            const s = saldos[p.id] || { saldo: 0, cm: 0 };
            const zero = s.saldo <= 0;
            const baixo = p.emin > 0 && s.saldo > 0 && s.saldo < p.emin;

            return `
              <tr>
                <td style="font-weight:600">${p.nome}</td>
                <td style="color:var(--tx3);font-size:12px">${p.sku || '—'}</td>
                <td>${p.un}</td>
                <td>${p.cat ? `<span class="bdg bk">${p.cat}</span>` : '—'}</td>
                <td>${fmt(p.custo)}</td>
                <td>${p.mkv > 0 ? `${fmt(pv)} <span class="bdg bb" style="font-size:10px">${p.mkv.toFixed(0)}%</span>` : '—'}</td>
                <td>${pa > 0 ? fmt(pa) : '—'}</td>
                <td><span style="font-weight:600;color:${zero ? 'var(--r)' : baixo ? 'var(--a)' : 'inherit'}">${fmtQ(s.saldo)} ${p.un}</span></td>
                <td style="color:var(--tx2)">${p.emin > 0 ? fmtQ(p.emin) : '—'}</td>
                <td>
                  <div class="fg2">
                    <button class="ib" title="Movimentar estoque" onclick="abrirMovProd('${p.id}')">MOV</button>
                    <button class="ib" title="Editar produto" onclick="editarProd('${p.id}')">EDT</button>
                    <button class="ib" title="Excluir produto" onclick="removerProd('${p.id}')">DEL</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function limparFormProd(){
  State.editIds.prod = null;

  const titulo = document.getElementById('prod-modal-titulo');
  if(titulo) titulo.textContent = 'Novo produto';
  const saveBtn = document.getElementById('prod-flow-save');
  if(saveBtn) saveBtn.textContent = 'Salvar produto';

  [
    'p-nome','p-sku','p-cat','p-mkv','p-mgv','p-qtmin','p-dv',
    'p-mka','p-mga','p-pfa','p-da','p-emin','p-esal','p-ecm','p-custo'
  ].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });

  const un = document.getElementById('p-un');
  if(un) un.value = 'un';

  const preview = document.getElementById('prod-preview');
  if(preview) preview.style.display = 'none';

  const histEl = document.getElementById('p-hist-cot');
  if(histEl) histEl.style.display = 'none';

  if(window.setFlowStep) window.setFlowStep('prod', 1);
}

export function editarProd(id){
  const p = P().find(x => x.id === id);
  if(!p) return;

  State.editIds.prod = id;

  const titulo = document.getElementById('prod-modal-titulo');
  if(titulo) titulo.textContent = 'Editar produto';
  const saveBtn = document.getElementById('prod-flow-save');
  if(saveBtn) saveBtn.textContent = 'Atualizar produto';

  document.getElementById('p-nome').value = p.nome;
  document.getElementById('p-sku').value = p.sku || '';
  document.getElementById('p-un').value = p.un || 'un';
  document.getElementById('p-cat').value = p.cat || '';
  document.getElementById('p-custo').value = p.custo ?? '';
  document.getElementById('p-mkv').value = Number(p.mkv || 0).toFixed(1);
  document.getElementById('p-mgv').value = mk2mg(Number(p.mkv || 0)).toFixed(1);
  document.getElementById('p-qtmin').value = p.qtmin || '';
  document.getElementById('p-dv').value = p.dv || '';
  document.getElementById('p-mka').value = Number(p.mka || 0).toFixed(1);
  document.getElementById('p-mga').value = mk2mg(Number(p.mka || 0)).toFixed(1);
  document.getElementById('p-pfa').value = p.pfa || '';
  document.getElementById('p-da').value = p.da || '';
  document.getElementById('p-emin').value = p.emin || '';
  document.getElementById('p-esal').value = p.esal || '';
  document.getElementById('p-ecm').value = p.ecm || '';

  let histEl = document.getElementById('p-hist-cot');
  if(!histEl){
    histEl = document.createElement('div');
    histEl.id = 'p-hist-cot';
    histEl.className = 'panel';
    histEl.style.marginTop = '12px';
    const btnRow = document.querySelector('#modal-produto .modal-box > div:last-child');
    if(btnRow?.parentNode) btnRow.parentNode.insertBefore(histEl, btnRow);
  }

  if(p.hist_cot && p.hist_cot.length > 0){
    const sortedHist = [...p.hist_cot].sort((a, b) => String(b.mes).localeCompare(String(a.mes)));
    histEl.innerHTML = `
      <div class="pt">Oscilação de Preço do Fornecedor</div>
      <table class="tbl" style="margin-top:8px">
        <thead><tr><th>Mês ref.</th><th>Fornecedor</th><th>Preço Cotado</th></tr></thead>
        <tbody>
          ${sortedHist.map(h => `
            <tr>
              <td>${String(h.mes || '').split('-').reverse().join('/')}</td>
              <td>${h.forn || ''}</td>
              <td style="font-weight:600;color:var(--tx2)">${fmt(h.preco || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    histEl.style.display = 'block';
  } else {
    histEl.style.display = 'none';
  }

  calcProdPreview();
  if(window.setFlowStep) window.setFlowStep('prod', 1);
  abrirModal('modal-produto');
}

export function syncV(t){
  const mk = parseFloat(document.getElementById('p-mkv').value) || 0;
  const mg = parseFloat(document.getElementById('p-mgv').value) || 0;

  if(t === 'mk' && mk > 0){
    document.getElementById('p-mgv').value = mk2mg(mk).toFixed(1);
  } else if(t === 'mg' && mg > 0){
    document.getElementById('p-mkv').value = mg2mk(mg).toFixed(1);
  }

  calcProdPreview();
}

export function syncA(t){
  const mk = parseFloat(document.getElementById('p-mka').value) || 0;
  const mg = parseFloat(document.getElementById('p-mga').value) || 0;

  if(t === 'mk' && mk > 0){
    document.getElementById('p-mga').value = mk2mg(mk).toFixed(1);
  } else if(t === 'mg' && mg > 0){
    document.getElementById('p-mka').value = mg2mk(mg).toFixed(1);
  }

  calcProdPreview();
}

export function calcProdPreview(){
  const c = parseFloat(document.getElementById('p-custo').value) || 0;
  const mkv = parseFloat(document.getElementById('p-mkv').value) || 0;
  const mka = parseFloat(document.getElementById('p-mka').value) || 0;
  const pfa = parseFloat(document.getElementById('p-pfa').value) || 0;
  const dv = parseFloat(document.getElementById('p-dv').value) || 0;
  const da = parseFloat(document.getElementById('p-da').value) || 0;
  const prev = document.getElementById('prod-preview');

  if(!prev) return;

  if(c > 0 && mkv > 0){
    const pv = prV(c, mkv);
    const pa = pfa > 0 ? pfa : (mka > 0 ? prV(c, mka) : 0);

    document.getElementById('ppv-v').textContent = fmt(pv);
    document.getElementById('ppv-vmin').textContent = dv > 0 ? fmt(pv * (1 - dv / 100)) : '—';
    document.getElementById('ppv-a').textContent = pa > 0 ? fmt(pa) : '—';
    document.getElementById('ppv-amin').textContent = (pa > 0 && da > 0) ? fmt(pa * (1 - da / 100)) : '—';

    prev.style.display = 'block';
  } else {
    prev.style.display = 'none';
  }
}

export async function salvarProduto(){
  const nome = document.getElementById('p-nome').value.trim();
  const custo = parseFloat(document.getElementById('p-custo').value) || 0;

  if(!nome || custo <= 0){
    notify(
      'Atenção: nome e custo são obrigatórios. Impacto: produto não pode ser salvo. Ação: preencha nome e custo maior que zero.',
      SEVERITY.WARNING
    );
    if(!nome) focusField('p-nome', { markError: true });
    else focusField('p-custo', { markError: true });
    return;
  }

  const existing = State.editIds.prod ? P().find(x => x.id === State.editIds.prod) : null;

  const p = {
    id: State.editIds.prod || uid(),
    filial_id: State.FIL,
    nome,
    sku: document.getElementById('p-sku').value.trim(),
    un: document.getElementById('p-un').value,
    cat: document.getElementById('p-cat').value.trim(),
    custo,
    mkv: parseFloat(document.getElementById('p-mkv').value) || 0,
    mka: parseFloat(document.getElementById('p-mka').value) || 0,
    pfa: parseFloat(document.getElementById('p-pfa').value) || 0,
    dv: parseFloat(document.getElementById('p-dv').value) || 0,
    da: parseFloat(document.getElementById('p-da').value) || 0,
    qtmin: parseFloat(document.getElementById('p-qtmin').value) || 0,
    emin: parseFloat(document.getElementById('p-emin').value) || 0,
    esal: parseFloat(document.getElementById('p-esal').value) || 0,
    ecm: parseFloat(document.getElementById('p-ecm').value) || custo,
    hist_cot: existing ? (existing.hist_cot || []) : []
  };

  try{
    await SB.upsertProduto(p);
  }catch(e){
    notify(
      `Erro: falha ao salvar produto (${String(e?.message || 'erro desconhecido')}). Impacto: cadastro não foi concluído. Ação: valide os campos e tente novamente.`,
      SEVERITY.ERROR
    );
    return;
  }

  if(State.editIds.prod){
    D.produtos[State.FIL] = P().map(x => x.id === State.editIds.prod ? p : x);
  } else {
    if(!D.produtos[State.FIL]) D.produtos[State.FIL] = [];
    D.produtos[State.FIL].push(p);
  }

  fecharModal('modal-produto');
  renderProdMet();
  renderProdutos();
  refreshProdSel();

  if(window.refreshMovSel) window.refreshMovSel();

  const pv = p.custo > 0 && p.mkv > 0 ? prV(p.custo, p.mkv) : 0;
  const pa = p.pfa > 0 ? p.pfa : (p.custo > 0 && p.mka > 0 ? prV(p.custo, p.mka) : 0);
  notify(
    State.editIds.prod
      ? `Produto atualizado: ${p.nome} • Varejo ${pv > 0 ? fmt(pv) : '—'} • Atacado ${pa > 0 ? fmt(pa) : '—'}`
      : `Produto salvo: ${p.nome} • Varejo ${pv > 0 ? fmt(pv) : '—'} • Atacado ${pa > 0 ? fmt(pa) : '—'}`,
    SEVERITY.SUCCESS
  );
}

export async function removerProd(id){
  if(!confirm('Remover produto?')) return;

  try{
    await SB.deleteProduto(id);
  }catch(e){
    toast('Erro: ' + e.message);
    return;
  }

  D.produtos[State.FIL] = P().filter(p => p.id !== id);
  if(D.movs?.[State.FIL]){
    D.movs[State.FIL] = D.movs[State.FIL].filter(m => (m.prod_id || m.prodId) !== id);
  }

  renderProdMet();
  renderProdutos();
  refreshProdSel();

  if(window.refreshMovSel) window.refreshMovSel();

  toast('Removido.');
}

export function refreshProdSel(){
  const s = document.getElementById('pi-prod');
  if(!s) return;

  const cur = s.value;
  s.innerHTML =
    '<option value="">— selecione —</option>' +
    P().map(p => `<option value="${p.id}">${p.nome} (${p.un})</option>`).join('');
  s.value = cur;
}
