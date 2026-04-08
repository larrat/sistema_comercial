import { SB } from '../js/api.js';
import { D, State, P } from '../js/store.js';
import { createScreenDom } from '../core/dom.js';
import { abrirModal, fecharModal, uid, fmt, fmtQ, mk2mg, mg2mk, prV, toast, notify, focusField } from '../core/utils.js';
import { SEVERITY } from '../core/messages.js';

let calcSaldosSafe = () => ({});
let setFlowStepSafe = () => {};
let refreshMovSelSafe = () => {};
const prodDom = createScreenDom('produtos', [
  'prod-met',
  'prod-cat-fil',
  'prod-busca',
  'prod-lista',
  'prod-modal-titulo',
  'prod-flow-save',
  'p-un',
  'prod-preview',
  'p-hist-cot',
  'ppv-v',
  'ppv-vmin',
  'ppv-a',
  'ppv-amin',
  'pi-prod'
]);
const PROD_FORM_IDS = [
  'p-nome','p-sku','p-cat','p-mkv','p-mgv','p-qtmin','p-dv',
  'p-mka','p-mga','p-pfa','p-da','p-emin','p-esal','p-ecm','p-custo'
];

export function initProdutosModule(callbacks = {}){
  calcSaldosSafe = callbacks.calcSaldos || (() => ({}));
  setFlowStepSafe = callbacks.setFlowStep || (() => {});
  refreshMovSelSafe = callbacks.refreshMovSel || (() => {});
}

export function renderProdMet(){
  const prods = P();
  const cats = [...new Set(prods.map(p => p.cat).filter(Boolean))];
  const cur = prodDom.get('prod-cat-fil')?.value || '';

  prodDom.html('metrics', 'prod-met', `
    <div class="met"><div class="ml">Produtos</div><div class="mv">${prods.length}</div></div>
    <div class="met"><div class="ml">Categorias</div><div class="mv">${cats.length}</div></div>
    <div class="met"><div class="ml">Com precificacao</div><div class="mv">${prods.filter(p => p.mkv > 0).length}</div></div>
  `, 'produtos:metrics');

  prodDom.select(
    'filters',
    'prod-cat-fil',
    '<option value="">Todas as categorias</option>' +
      cats.sort().map(c => `<option value="${c}">${c}</option>`).join(''),
    cur,
    'produtos:categorias'
  );
}

export function renderProdutos(){
  const buscaEl = prodDom.get('prod-busca');
  const catEl = prodDom.get('prod-cat-fil');
  const el = prodDom.get('prod-lista');

  if(!el) return;

  const q = (buscaEl?.value || '').toLowerCase();
  const cat = catEl?.value || '';
  const saldos = calcSaldosSafe();

  const filtrados = P().filter(p =>
    (!q || p.nome.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) &&
    (!cat || p.cat === cat)
  );

  if(!filtrados.length){
    prodDom.html('list', 'prod-lista', `<div class="empty"><div class="ico">PR</div><p>${P().length ? 'Nenhum encontrado.' : 'Cadastre o primeiro produto desta filial.'}</p></div>`, 'produtos:lista-vazia');
    return;
  }

  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  if(isMobile){
    prodDom.html('list', 'prod-lista', filtrados.map(p => {
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
              <div class="mobile-card-sub">${p.sku || 'Sem SKU'}${p.cat ? ` - ${p.cat}` : ''}</div>
            </div>
            <div>${st}</div>
          </div>

          <div class="mobile-card-meta">
            <div>Custo: <b style="color:var(--tx)">${fmt(p.custo)}</b></div>
            <div>Varejo: <b style="color:var(--tx)">${p.mkv > 0 ? fmt(pv) : '-'}</b> ${p.mkv > 0 ? `<span class="bdg bb" style="font-size:10px">${p.mkv.toFixed(0)}%</span>` : ''}</div>
            <div>Atacado: <b style="color:var(--tx)">${pa > 0 ? fmt(pa) : '-'}</b></div>
            <div>Saldo: <b style="color:${zero ? 'var(--r)' : baixo ? 'var(--a)' : 'var(--tx)'}">${fmtQ(s.saldo)} ${p.un}</b> ${p.emin > 0 ? `- min. ${fmtQ(p.emin)}` : ''}</div>
          </div>

          <div class="mobile-card-actions">
            <button class="ib" title="Movimentar estoque" data-click="abrirMovProd('${p.id}')">MOV</button>
            <button class="ib" title="Editar produto" data-click="editarProd('${p.id}')">EDT</button>
            <button class="ib" title="Excluir produto" data-click="removerProd('${p.id}')">DEL</button>
          </div>
        </div>
      `;
    }).join(''), 'produtos:lista-mobile');
    return;
  }

  prodDom.html('list', 'prod-lista', `
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
            <th>Min.</th>
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
                <td style="color:var(--tx3);font-size:12px">${p.sku || '-'}</td>
                <td>${p.un}</td>
                <td>${p.cat ? `<span class="bdg bk">${p.cat}</span>` : '-'}</td>
                <td>${fmt(p.custo)}</td>
                <td>${p.mkv > 0 ? `${fmt(pv)} <span class="bdg bb" style="font-size:10px">${p.mkv.toFixed(0)}%</span>` : '-'}</td>
                <td>${pa > 0 ? fmt(pa) : '-'}</td>
                <td><span style="font-weight:600;color:${zero ? 'var(--r)' : baixo ? 'var(--a)' : 'inherit'}">${fmtQ(s.saldo)} ${p.un}</span></td>
                <td style="color:var(--tx2)">${p.emin > 0 ? fmtQ(p.emin) : '-'}</td>
                <td>
                  <div class="fg2">
                    <button class="ib" title="Movimentar estoque" data-click="abrirMovProd('${p.id}')">MOV</button>
                    <button class="ib" title="Editar produto" data-click="editarProd('${p.id}')">EDT</button>
                    <button class="ib" title="Excluir produto" data-click="removerProd('${p.id}')">DEL</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `, 'produtos:lista-desktop');
}

export function limparFormProd(){
  State.editIds.prod = null;

  const titulo = prodDom.get('prod-modal-titulo');
  if(titulo) titulo.textContent = 'Novo produto';
  const saveBtn = prodDom.get('prod-flow-save');
  if(saveBtn) saveBtn.textContent = 'Salvar produto';

  PROD_FORM_IDS.forEach(id => prodDom.value(id, ''));

  const un = prodDom.get('p-un');
  if(un) un.value = 'un';

  const preview = prodDom.get('prod-preview');
  if(preview) preview.style.display = 'none';

  const histEl = prodDom.get('p-hist-cot');
  if(histEl) histEl.style.display = 'none';

  setFlowStepSafe('prod', 1);
}

export function editarProd(id){
  const p = P().find(x => x.id === id);
  if(!p) return;

  State.editIds.prod = id;

  const titulo = prodDom.get('prod-modal-titulo');
  if(titulo) titulo.textContent = 'Editar produto';
  const saveBtn = prodDom.get('prod-flow-save');
  if(saveBtn) saveBtn.textContent = 'Atualizar produto';

  prodDom.value('p-nome', p.nome);
  prodDom.value('p-sku', p.sku || '');
  prodDom.value('p-un', p.un || 'un');
  prodDom.value('p-cat', p.cat || '');
  prodDom.value('p-custo', p.custo ?? '');
  prodDom.value('p-mkv', Number(p.mkv || 0).toFixed(1));
  prodDom.value('p-mgv', mk2mg(Number(p.mkv || 0)).toFixed(1));
  prodDom.value('p-qtmin', p.qtmin || '');
  prodDom.value('p-dv', p.dv || '');
  prodDom.value('p-mka', Number(p.mka || 0).toFixed(1));
  prodDom.value('p-mga', mk2mg(Number(p.mka || 0)).toFixed(1));
  prodDom.value('p-pfa', p.pfa || '');
  prodDom.value('p-da', p.da || '');
  prodDom.value('p-emin', p.emin || '');
  prodDom.value('p-esal', p.esal || '');
  prodDom.value('p-ecm', p.ecm || '');

  let histEl = prodDom.get('p-hist-cot');
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
    const histHtml = `
      <div class="pt">Oscilacao de Preco do Fornecedor</div>
      <table class="tbl" style="margin-top:8px">
        <thead><tr><th>Mes ref.</th><th>Fornecedor</th><th>Preco cotado</th></tr></thead>
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
    if(histEl.id === 'p-hist-cot'){
      prodDom.html('history', 'p-hist-cot', histHtml, 'produtos:historico-cotacao');
    } else {
      histEl.innerHTML = histHtml;
    }
    histEl.style.display = 'block';
  } else {
    histEl.style.display = 'none';
  }

  calcProdPreview();
  setFlowStepSafe('prod', 1);
  abrirModal('modal-produto');
}

export function syncV(t){
  const mk = parseFloat(prodDom.get('p-mkv')?.value) || 0;
  const mg = parseFloat(prodDom.get('p-mgv')?.value) || 0;

  if(t === 'mk' && mk > 0){
    prodDom.value('p-mgv', mk2mg(mk).toFixed(1));
  } else if(t === 'mg' && mg > 0){
    prodDom.value('p-mkv', mg2mk(mg).toFixed(1));
  }

  calcProdPreview();
}

export function syncA(t){
  const mk = parseFloat(prodDom.get('p-mka')?.value) || 0;
  const mg = parseFloat(prodDom.get('p-mga')?.value) || 0;

  if(t === 'mk' && mk > 0){
    prodDom.value('p-mga', mk2mg(mk).toFixed(1));
  } else if(t === 'mg' && mg > 0){
    prodDom.value('p-mka', mg2mk(mg).toFixed(1));
  }

  calcProdPreview();
}

export function calcProdPreview(){
  const c = parseFloat(prodDom.get('p-custo')?.value) || 0;
  const mkv = parseFloat(prodDom.get('p-mkv')?.value) || 0;
  const mka = parseFloat(prodDom.get('p-mka')?.value) || 0;
  const pfa = parseFloat(prodDom.get('p-pfa')?.value) || 0;
  const dv = parseFloat(prodDom.get('p-dv')?.value) || 0;
  const da = parseFloat(prodDom.get('p-da')?.value) || 0;
  const prev = prodDom.get('prod-preview');

  if(!prev) return;

  if(c > 0 && mkv > 0){
    const pv = prV(c, mkv);
    const pa = pfa > 0 ? pfa : (mka > 0 ? prV(c, mka) : 0);

    prodDom.text('preview', 'ppv-v', fmt(pv), 'produtos:preview');
    prodDom.text('preview', 'ppv-vmin', dv > 0 ? fmt(pv * (1 - dv / 100)) : '-', 'produtos:preview');
    prodDom.text('preview', 'ppv-a', pa > 0 ? fmt(pa) : '-', 'produtos:preview');
    prodDom.text('preview', 'ppv-amin', (pa > 0 && da > 0) ? fmt(pa * (1 - da / 100)) : '-', 'produtos:preview');
    prodDom.display('preview', 'prod-preview', 'block', 'produtos:preview');
  } else {
    prodDom.display('preview', 'prod-preview', 'none', 'produtos:preview');
  }
}

export async function salvarProduto(){
  const nome = prodDom.get('p-nome')?.value.trim() || '';
  const custo = parseFloat(prodDom.get('p-custo')?.value) || 0;

  if(!nome || custo <= 0){
    notify(
      'Atencao: nome e custo sao obrigatorios. Impacto: produto nao pode ser salvo. Acao: preencha nome e custo maior que zero.',
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
    sku: prodDom.get('p-sku')?.value.trim() || '',
    un: prodDom.get('p-un')?.value || 'un',
    cat: prodDom.get('p-cat')?.value.trim() || '',
    custo,
    mkv: parseFloat(prodDom.get('p-mkv')?.value) || 0,
    mka: parseFloat(prodDom.get('p-mka')?.value) || 0,
    pfa: parseFloat(prodDom.get('p-pfa')?.value) || 0,
    dv: parseFloat(prodDom.get('p-dv')?.value) || 0,
    da: parseFloat(prodDom.get('p-da')?.value) || 0,
    qtmin: parseFloat(prodDom.get('p-qtmin')?.value) || 0,
    emin: parseFloat(prodDom.get('p-emin')?.value) || 0,
    esal: parseFloat(prodDom.get('p-esal')?.value) || 0,
    ecm: parseFloat(prodDom.get('p-ecm')?.value) || custo,
    hist_cot: existing ? (existing.hist_cot || []) : []
  };

  try{
    await SB.upsertProduto(p);
  }catch(e){
    notify(
      `Erro: falha ao salvar produto (${String(e?.message || 'erro desconhecido')}). Impacto: cadastro nao foi concluido. Acao: valide os campos e tente novamente.`,
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

  refreshMovSelSafe();

  const pv = p.custo > 0 && p.mkv > 0 ? prV(p.custo, p.mkv) : 0;
  const pa = p.pfa > 0 ? p.pfa : (p.custo > 0 && p.mka > 0 ? prV(p.custo, p.mka) : 0);
  notify(
    State.editIds.prod
      ? `Produto atualizado: ${p.nome} - Varejo ${pv > 0 ? fmt(pv) : '-'} - Atacado ${pa > 0 ? fmt(pa) : '-'}`
      : `Produto salvo: ${p.nome} - Varejo ${pv > 0 ? fmt(pv) : '-'} - Atacado ${pa > 0 ? fmt(pa) : '-'}`,
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

  refreshMovSelSafe();

  toast('Removido.');
}

export function refreshProdSel(){
  const s = prodDom.get('pi-prod');
  if(!s) return;

  const cur = s.value;
  prodDom.select(
    'selectors',
    'pi-prod',
    '<option value="">- selecione -</option>' +
      P().map(p => `<option value="${p.id}">${p.nome} (${p.un})</option>`).join(''),
    cur,
    'produtos:pedido-selector'
  );
}
