// @ts-check

import { SB } from '../app/api.js';
import { D, State, P } from '../app/store.js';
import { createScreenDom } from '../shared/dom.js';
import {
  abrirModal,
  fecharModal,
  uid,
  fmt,
  fmtQ,
  mk2mg,
  mg2mk,
  prV,
  toast,
  notify,
  focusField
} from '../shared/utils.js';
import { SEVERITY } from '../shared/messages.js';

/** @typedef {import('../types/domain').Produto} Produto */
/** @typedef {import('../types/domain').ProdutoModuleCallbacks} ProdutoModuleCallbacks */
/** @typedef {import('../types/domain').ScreenDom} ScreenDom */

/** @type {NonNullable<ProdutoModuleCallbacks['calcSaldos']>} */
let calcSaldosSafe = () => ({});
/** @type {NonNullable<ProdutoModuleCallbacks['setFlowStep']>} */
let setFlowStepSafe = () => {};
let refreshMovSelSafe = () => {};
/** @type {ScreenDom} */
const prodDom = createScreenDom('produtos', [
  'prod-met',
  'prod-cat-fil',
  'prod-busca',
  'prod-lista',
  'prod-modal-titulo',
  'prod-flow-save',
  'prod-det-box',
  'p-un',
  'p-pai',
  'prod-preview',
  'p-hist-cot',
  'ppv-v',
  'ppv-vmin',
  'ppv-a',
  'ppv-amin',
  'pi-prod'
]);
const PROD_FORM_IDS = [
  'p-nome',
  'p-sku',
  'p-cat',
  'p-pvv',
  'p-mkv',
  'p-mgv',
  'p-qtmin',
  'p-dv',
  'p-mka',
  'p-mga',
  'p-pfa',
  'p-da',
  'p-emin',
  'p-esal',
  'p-ecm',
  'p-custo'
];

/**
 * @param {number | string | null | undefined} custo
 * @param {number | string | null | undefined} preco
 */
function priceToMarkup(custo, preco) {
  const c = Number(custo || 0);
  const p = Number(preco || 0);
  if (c <= 0 || p <= 0) return 0;
  return (p / c - 1) * 100;
}

/**
 * @param {number | string | null | undefined} custo
 * @param {number | string | null | undefined} preco
 */
function priceToMargin(custo, preco) {
  const c = Number(custo || 0);
  const p = Number(preco || 0);
  if (c <= 0 || p <= 0) return 0;
  return ((p - c) / p) * 100;
}

/**
 * @param {ProdutoModuleCallbacks} [callbacks]
 */
export function initProdutosModule(callbacks = {}) {
  calcSaldosSafe = callbacks.calcSaldos || (() => ({}));
  setFlowStepSafe = callbacks.setFlowStep || (() => {});
  refreshMovSelSafe = callbacks.refreshMovSel || (() => {});
}

export function renderProdMet() {
  const prods = P();
  const cats = [...new Set(prods.map((p) => p.cat).filter(Boolean))];
  const cur = prodDom.get('prod-cat-fil')?.value || '';

  prodDom.html(
    'metrics',
    'prod-met',
    `
    <div class="met"><div class="ml">Produtos</div><div class="mv">${prods.length}</div></div>
    <div class="met"><div class="ml">Categorias</div><div class="mv">${cats.length}</div></div>
    <div class="met"><div class="ml">Com precificacao</div><div class="mv">${prods.filter((p) => p.mkv > 0).length}</div></div>
  `,
    'produtos:metrics'
  );

  prodDom.select(
    'filters',
    'prod-cat-fil',
    '<option value="">Todas as categorias</option>' +
      cats
        .sort()
        .map((c) => `<option value="${c}">${c}</option>`)
        .join(''),
    cur,
    'produtos:categorias'
  );
}

export function renderProdutos() {
  const buscaEl = prodDom.get('prod-busca');
  const catEl = prodDom.get('prod-cat-fil');
  const el = prodDom.get('prod-lista');

  if (!el) return;

  const q = (buscaEl?.value || '').toLowerCase();
  const cat = catEl?.value || '';
  const saldos = calcSaldosSafe();

  const todos = P();
  const filtrados = todos.filter(
    (p) =>
      (!q || p.nome.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) &&
      (!cat || p.cat === cat)
  );

  if (!filtrados.length) {
    prodDom.html(
      'list',
      'prod-lista',
      `<div class="empty"><div class="ico">PR</div><p>${todos.length ? 'Nenhum encontrado.' : 'Cadastre o primeiro produto desta filial.'}</p></div>`,
      'produtos:lista-vazia'
    );
    return;
  }

  // Monta mapa pai → variantes (usando todos os produtos, não só os filtrados)
  /** @type {Record<string, import('../types/domain').Produto[]>} */
  const variantesMap = {};
  todos.forEach((p) => {
    if (p.produto_pai_id) {
      if (!variantesMap[p.produto_pai_id]) variantesMap[p.produto_pai_id] = [];
      variantesMap[p.produto_pai_id].push(p);
    }
  });

  // Ordena: pais primeiro (sem produto_pai_id), depois variantes imediatamente após seu pai
  /** @type {Array<{prod: import('../types/domain').Produto, isPai: boolean, isVariante: boolean}>} */
  const ordenados = [];
  const filtradosIds = new Set(filtrados.map((p) => p.id));

  // Pais que aparecem nos filtrados ou cujas variantes aparecem nos filtrados
  const paiIds = new Set(filtrados.filter((p) => p.produto_pai_id).map((p) => p.produto_pai_id));
  const pais = todos
    .filter((p) => !p.produto_pai_id && (filtradosIds.has(p.id) || paiIds.has(p.id)))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Variantes sem pai encontrado nos dados carregados (orfas)
  const paiIdsCarregados = new Set(todos.filter((p) => !p.produto_pai_id).map((p) => p.id));

  pais.forEach((p) => {
    const temFilhos = variantesMap[p.id]?.length > 0;
    ordenados.push({ prod: p, isPai: temFilhos, isVariante: false });
    (variantesMap[p.id] || [])
      .filter((v) => filtradosIds.has(v.id) || !q)
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((v) => ordenados.push({ prod: v, isPai: false, isVariante: true }));
  });

  // Adiciona variantes cujo pai não está carregado
  filtrados
    .filter((p) => p.produto_pai_id && !paiIdsCarregados.has(p.produto_pai_id))
    .forEach((p) => ordenados.push({ prod: p, isPai: false, isVariante: true }));

  const isMobile = window.matchMedia('(max-width: 1280px)').matches;
  if (isMobile) {
    prodDom.html(
      'list',
      'prod-lista',
      ordenados
        .map(({ prod: p, isPai, isVariante }) => {
          const pv = prV(p.custo, p.mkv);
          const pa = p.pfa > 0 ? p.pfa : p.mka > 0 ? prV(p.custo, p.mka) : 0;
          const s = saldos[p.id] || { saldo: 0, cm: 0 };
          const zero = s.saldo <= 0;
          const baixo = p.emin > 0 && s.saldo > 0 && s.saldo < p.emin;
          const st = zero
            ? '<span class="bdg br">Zerado</span>'
            : baixo
              ? '<span class="bdg ba">Baixo</span>'
              : '<span class="bdg bg">OK</span>';
          const paiNome =
            isVariante && p.produto_pai_id
              ? todos.find((x) => x.id === p.produto_pai_id)?.nome || ''
              : '';

          return `
        <div class="mobile-card" style="${isVariante ? 'margin-left:16px;border-left:3px solid var(--b2)' : ''}">
          <div class="mobile-card-head">
            <div style="min-width:0">
              <div class="mobile-card-title">
                ${isVariante ? '<span style="color:var(--tx3);font-size:11px">↳ </span>' : ''}${p.nome}
                ${isPai ? '<span class="bdg bk" style="font-size:10px;margin-left:4px">Família</span>' : ''}
              </div>
              <div class="mobile-card-sub">${p.sku || 'Sem SKU'}${p.cat ? ` - ${p.cat}` : ''}${isVariante && paiNome ? ` · variante de ${paiNome}` : ''}</div>
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
            <button class="btn btn-sm" title="Detalhes do produto" data-click="abrirProdDet('${p.id}')">Detalhes</button>
            <button class="btn btn-sm" title="Movimentar estoque" data-click="abrirMovProd('${p.id}')">Movimentar</button>
            <button class="btn btn-sm" title="Editar produto" data-click="editarProd('${p.id}')">Editar</button>
            <button class="btn btn-sm" title="Excluir produto" data-click="removerProd('${p.id}')">Excluir</button>
          </div>
        </div>
      `;
        })
        .join(''),
      'produtos:lista-mobile'
    );
    return;
  }

  prodDom.html(
    'list',
    'prod-lista',
    `
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
          ${ordenados
            .map(({ prod: p, isPai, isVariante }) => {
              const pv = prV(p.custo, p.mkv);
              const pa = p.pfa > 0 ? p.pfa : p.mka > 0 ? prV(p.custo, p.mka) : 0;
              const s = saldos[p.id] || { saldo: 0, cm: 0 };
              const zero = s.saldo <= 0;
              const baixo = p.emin > 0 && s.saldo > 0 && s.saldo < p.emin;

              return `
              <tr style="${isVariante ? 'background:var(--bg2,rgba(0,0,0,0.02))' : ''}">
                <td style="font-weight:${isPai ? '700' : '600'}">
                  ${isVariante ? '<span style="color:var(--tx3);padding-right:4px">↳</span>' : ''}${p.nome}
                  ${isPai ? '<span class="bdg bk" style="font-size:10px;margin-left:6px">Família</span>' : ''}
                </td>
                <td style="color:var(--tx3);font-size:12px">${p.sku || '-'}</td>
                <td>${p.un}</td>
                <td>${p.cat ? `<span class="bdg bk">${p.cat}</span>` : '-'}</td>
                <td>${fmt(p.custo)}</td>
                <td>${p.mkv > 0 ? `${fmt(pv)} <span class="bdg bb" style="font-size:10px">${p.mkv.toFixed(0)}%</span>` : '-'}</td>
                <td>${pa > 0 ? fmt(pa) : '-'}</td>
                <td><span style="font-weight:600;color:${zero ? 'var(--r)' : baixo ? 'var(--a)' : 'inherit'}">${fmtQ(s.saldo)} ${p.un}</span></td>
                <td style="color:var(--tx2)">${p.emin > 0 ? fmtQ(p.emin) : '-'}</td>
                <td>
                  <div class="fg2 table-row-actions">
                    <button class="btn btn-sm" title="Detalhes do produto" data-click="abrirProdDet('${p.id}')">Detalhes</button>
                    <button class="btn btn-sm" title="Movimentar estoque" data-click="abrirMovProd('${p.id}')">Movimentar</button>
                    <button class="btn btn-sm" title="Editar produto" data-click="editarProd('${p.id}')">Editar</button>
                    <button class="btn btn-sm" title="Excluir produto" data-click="removerProd('${p.id}')">Excluir</button>
                  </div>
                </td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `,
    'produtos:lista-desktop'
  );
}

/**
 * Popula o seletor de produto pai com produtos raiz (sem pai).
 * @param {string | null} [excludeId] - ID do produto atual (excluído da lista para evitar self-reference)
 */
function renderPaiSel(excludeId = null) {
  const sel = prodDom.get('p-pai');
  if (!sel) return;
  const pais = P().filter((p) => !p.produto_pai_id && p.id !== excludeId);
  sel.innerHTML =
    '<option value="">— produto independente —</option>' +
    pais
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((p) => `<option value="${p.id}">${p.nome}${p.sku ? ` [${p.sku}]` : ''}</option>`)
      .join('');
}

export function limparFormProd() {
  State.editIds.prod = null;

  const titulo = prodDom.get('prod-modal-titulo');
  if (titulo) titulo.textContent = 'Novo produto';
  const saveBtn = prodDom.get('prod-flow-save');
  if (saveBtn) saveBtn.textContent = 'Salvar produto';

  PROD_FORM_IDS.forEach((id) => prodDom.value(id, ''));

  const un = prodDom.get('p-un');
  if (un) un.value = 'un';

  renderPaiSel(null);
  const pai = prodDom.get('p-pai');
  if (pai) pai.value = '';

  const preview = prodDom.get('prod-preview');
  if (preview) preview.style.display = 'none';

  const histEl = prodDom.get('p-hist-cot');
  if (histEl) histEl.style.display = 'none';

  setFlowStepSafe('prod', 1);
}

/**
 * @param {string} id
 */
export function editarProd(id) {
  /** @type {Produto | undefined} */
  const p = P().find((x) => x.id === id);
  if (!p) return;

  State.editIds.prod = id;

  const titulo = prodDom.get('prod-modal-titulo');
  if (titulo) titulo.textContent = 'Editar produto';
  const saveBtn = prodDom.get('prod-flow-save');
  if (saveBtn) saveBtn.textContent = 'Atualizar produto';

  renderPaiSel(id);
  const paiSel = prodDom.get('p-pai');
  if (paiSel) paiSel.value = p.produto_pai_id || '';

  prodDom.value('p-nome', p.nome);
  prodDom.value('p-sku', p.sku || '');
  prodDom.value('p-un', p.un || 'un');
  prodDom.value('p-cat', p.cat || '');
  prodDom.value('p-custo', p.custo ?? '');
  prodDom.value('p-pvv', p.mkv > 0 ? prV(Number(p.custo || 0), Number(p.mkv || 0)).toFixed(2) : '');
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
  if (!histEl) {
    histEl = document.createElement('div');
    histEl.id = 'p-hist-cot';
    histEl.className = 'panel';
    histEl.style.marginTop = '12px';
    const btnRow = document.querySelector('#modal-produto .modal-box > div:last-child');
    if (btnRow?.parentNode) btnRow.parentNode.insertBefore(histEl, btnRow);
  }

  if (p.hist_cot && p.hist_cot.length > 0) {
    const sortedHist = [...p.hist_cot].sort((a, b) => String(b.mes).localeCompare(String(a.mes)));
    const histHtml = `
      <div class="pt">Oscilacao de Preco do Fornecedor</div>
      <table class="tbl" style="margin-top:8px">
        <thead><tr><th>Mes ref.</th><th>Fornecedor</th><th>Preco cotado</th></tr></thead>
        <tbody>
          ${sortedHist
            .map(
              (h) => `
            <tr>
              <td>${String(h.mes || '')
                .split('-')
                .reverse()
                .join('/')}</td>
              <td>${h.forn || ''}</td>
              <td style="font-weight:600;color:var(--tx2)">${fmt(h.preco || 0)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
    if (histEl.id === 'p-hist-cot') {
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

/**
 * @param {string} id
 */
export function abrirProdDet(id) {
  /** @type {Produto | undefined} */
  const p = P().find((x) => x.id === id);
  const box = prodDom.get('prod-det-box');
  if (!p || !box) return;

  const saldos = calcSaldosSafe();
  const s = saldos[p.id] || { saldo: 0, cm: 0 };
  const varejo = p.mkv > 0 ? prV(p.custo, p.mkv) : 0;
  const atacado = p.pfa > 0 ? p.pfa : p.mka > 0 ? prV(p.custo, p.mka) : 0;
  const margemV = varejo > 0 ? ((varejo - p.custo) / varejo) * 100 : 0;
  const margemA = atacado > 0 ? ((atacado - p.custo) / atacado) * 100 : 0;
  const status =
    s.saldo <= 0
      ? '<span class="bdg br">Zerado</span>'
      : p.emin > 0 && s.saldo < p.emin
        ? '<span class="bdg ba">Baixo</span>'
        : '<span class="bdg bg">OK</span>';

  prodDom.html(
    'detail',
    'prod-det-box',
    `
    <div class="prod-detail">
      <div class="prod-detail-head fb">
        <div>
          <div class="prod-detail-title">${p.nome}</div>
          <div class="prod-detail-sub">${p.sku || 'Sem SKU'}${p.cat ? ` - ${p.cat}` : ''}</div>
        </div>
        <div class="prod-detail-status">${status}</div>
      </div>

      <div class="prod-detail-grid">
        <div class="prod-detail-kpi">
          <div class="prod-detail-label">Custo</div>
          <div class="prod-detail-value">${fmt(p.custo)}</div>
        </div>
        <div class="prod-detail-kpi">
          <div class="prod-detail-label">Varejo</div>
          <div class="prod-detail-value">${varejo > 0 ? fmt(varejo) : '-'}</div>
          <div class="prod-detail-meta">${margemV > 0 ? `${margemV.toFixed(1)}% margem` : 'Sem regra'}</div>
        </div>
        <div class="prod-detail-kpi">
          <div class="prod-detail-label">Atacado</div>
          <div class="prod-detail-value">${atacado > 0 ? fmt(atacado) : '-'}</div>
          <div class="prod-detail-meta">${margemA > 0 ? `${margemA.toFixed(1)}% margem` : 'Sem regra'}</div>
        </div>
        <div class="prod-detail-kpi">
          <div class="prod-detail-label">Saldo</div>
          <div class="prod-detail-value">${fmtQ(s.saldo)} ${p.un}</div>
          <div class="prod-detail-meta">${p.emin > 0 ? `Min. ${fmtQ(p.emin)}` : 'Sem minimo'}</div>
        </div>
        <div class="prod-detail-kpi">
          <div class="prod-detail-label">Custo medio</div>
          <div class="prod-detail-value">${fmt(s.cm || p.ecm || p.custo)}</div>
        </div>
        <div class="prod-detail-kpi">
          <div class="prod-detail-label">Comercial</div>
          <div class="prod-detail-value">${p.qtmin > 0 ? `${fmtQ(p.qtmin)} un` : '-'}</div>
          <div class="prod-detail-meta">Desc. varejo ${Number(p.dv || 0)}% · atacado ${Number(p.da || 0)}%</div>
        </div>
      </div>

      ${
        p.hist_cot?.length
          ? `
        <div class="panel prod-detail-section">
          <div class="pt">Oscilacao de custo</div>
          <div class="tw">
            <table class="tbl prod-detail-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Fornecedor</th>
                  <th>Preco</th>
                </tr>
              </thead>
              <tbody>
                ${[...p.hist_cot]
                  .sort((a, b) => String(b.mes).localeCompare(String(a.mes)))
                  .map(
                    (h) => `
                  <tr>
                    <td>${String(h.mes || '')
                      .split('-')
                      .reverse()
                      .join('/')}</td>
                    <td>${h.forn || '-'}</td>
                    <td>${fmt(h.preco || 0)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
          : ''
      }

      <div class="prod-detail-actions">
        <button class="btn" data-click="fecharModal('modal-prod-det')">Fechar</button>
        <button class="btn" data-click="fecharModal('modal-prod-det');abrirMovProd('${p.id}')">Movimentar</button>
        <button class="btn btn-p" data-click="fecharModal('modal-prod-det');editarProd('${p.id}')">Editar</button>
      </div>
    </div>
  `,
    'produtos:detalhe'
  );

  abrirModal('modal-prod-det');
}

export function syncV(t) {
  const c = parseFloat(prodDom.get('p-custo')?.value) || 0;
  const pv = parseFloat(prodDom.get('p-pvv')?.value) || 0;
  const mk = parseFloat(prodDom.get('p-mkv')?.value) || 0;
  const mg = parseFloat(prodDom.get('p-mgv')?.value) || 0;

  if (t === 'mk' && mk > 0) {
    prodDom.value('p-mgv', mk2mg(mk).toFixed(1));
    if (c > 0) prodDom.value('p-pvv', prV(c, mk).toFixed(2));
  } else if (t === 'mg' && mg > 0) {
    const mkCalc = mg2mk(mg);
    prodDom.value('p-mkv', mkCalc.toFixed(1));
    if (c > 0) prodDom.value('p-pvv', prV(c, mkCalc).toFixed(2));
  } else if (t === 'pv' && c > 0 && pv > 0) {
    const mkCalc = priceToMarkup(c, pv);
    prodDom.value('p-mkv', mkCalc.toFixed(1));
    prodDom.value('p-mgv', priceToMargin(c, pv).toFixed(1));
  }

  calcProdPreview();
}

export function syncA(t) {
  const c = parseFloat(prodDom.get('p-custo')?.value) || 0;
  const pa = parseFloat(prodDom.get('p-pfa')?.value) || 0;
  const mk = parseFloat(prodDom.get('p-mka')?.value) || 0;
  const mg = parseFloat(prodDom.get('p-mga')?.value) || 0;

  if (t === 'mk' && mk > 0) {
    prodDom.value('p-mga', mk2mg(mk).toFixed(1));
    if (c > 0) prodDom.value('p-pfa', prV(c, mk).toFixed(2));
  } else if (t === 'mg' && mg > 0) {
    const mkCalc = mg2mk(mg);
    prodDom.value('p-mka', mkCalc.toFixed(1));
    if (c > 0) prodDom.value('p-pfa', prV(c, mkCalc).toFixed(2));
  } else if (t === 'pv' && c > 0 && pa > 0) {
    const mkCalc = priceToMarkup(c, pa);
    prodDom.value('p-mka', mkCalc.toFixed(1));
    prodDom.value('p-mga', priceToMargin(c, pa).toFixed(1));
  }

  calcProdPreview();
}

export function syncProdFromCost() {
  syncV('pv');
  syncA('pv');
  calcProdPreview();
}

export function calcProdPreview() {
  const c = parseFloat(prodDom.get('p-custo')?.value) || 0;
  const pvv = parseFloat(prodDom.get('p-pvv')?.value) || 0;
  const mkv = parseFloat(prodDom.get('p-mkv')?.value) || 0;
  const mka = parseFloat(prodDom.get('p-mka')?.value) || 0;
  const pfa = parseFloat(prodDom.get('p-pfa')?.value) || 0;
  const dv = parseFloat(prodDom.get('p-dv')?.value) || 0;
  const da = parseFloat(prodDom.get('p-da')?.value) || 0;
  const prev = prodDom.get('prod-preview');

  if (!prev) return;

  const pv = pvv > 0 ? pvv : c > 0 && mkv > 0 ? prV(c, mkv) : 0;
  const pa = pfa > 0 ? pfa : c > 0 && mka > 0 ? prV(c, mka) : 0;

  if (c > 0 && (pv > 0 || pa > 0)) {
    prodDom.text('preview', 'ppv-v', pv > 0 ? fmt(pv) : '-', 'produtos:preview');
    prodDom.text(
      'preview',
      'ppv-vmin',
      pv > 0 && dv > 0 ? fmt(pv * (1 - dv / 100)) : '-',
      'produtos:preview'
    );
    prodDom.text('preview', 'ppv-a', pa > 0 ? fmt(pa) : '-', 'produtos:preview');
    prodDom.text(
      'preview',
      'ppv-amin',
      pa > 0 && da > 0 ? fmt(pa * (1 - da / 100)) : '-',
      'produtos:preview'
    );
    prodDom.display('preview', 'prod-preview', 'block', 'produtos:preview');
  } else {
    prodDom.display('preview', 'prod-preview', 'none', 'produtos:preview');
  }
}

export async function salvarProduto() {
  const nome = prodDom.get('p-nome')?.value.trim() || '';
  const custo = parseFloat(prodDom.get('p-custo')?.value) || 0;
  const precoVarejo = parseFloat(prodDom.get('p-pvv')?.value) || 0;
  const markupVarejo =
    precoVarejo > 0
      ? priceToMarkup(custo, precoVarejo)
      : parseFloat(prodDom.get('p-mkv')?.value) || 0;

  if (!nome || custo <= 0) {
    notify(
      'Atencao: nome e custo sao obrigatorios. Impacto: produto nao pode ser salvo. Acao: preencha nome e custo maior que zero.',
      SEVERITY.WARNING
    );
    if (!nome) focusField('p-nome', { markError: true });
    else focusField('p-custo', { markError: true });
    return;
  }

  const existing = State.editIds.prod ? P().find((x) => x.id === State.editIds.prod) : null;

  const paiId = prodDom.get('p-pai')?.value || null;

  const p = {
    id: State.editIds.prod || uid(),
    filial_id: State.FIL,
    produto_pai_id: paiId || null,
    nome,
    sku: prodDom.get('p-sku')?.value.trim() || '',
    un: prodDom.get('p-un')?.value || 'un',
    cat: prodDom.get('p-cat')?.value.trim() || '',
    custo,
    mkv: markupVarejo,
    mka: parseFloat(prodDom.get('p-mka')?.value) || 0,
    pfa: parseFloat(prodDom.get('p-pfa')?.value) || 0,
    dv: parseFloat(prodDom.get('p-dv')?.value) || 0,
    da: parseFloat(prodDom.get('p-da')?.value) || 0,
    qtmin: parseFloat(prodDom.get('p-qtmin')?.value) || 0,
    emin: parseFloat(prodDom.get('p-emin')?.value) || 0,
    esal: parseFloat(prodDom.get('p-esal')?.value) || 0,
    ecm: parseFloat(prodDom.get('p-ecm')?.value) || custo,
    hist_cot: existing ? existing.hist_cot || [] : []
  };

  try {
    await SB.upsertProduto(p);
  } catch (e) {
    notify(
      `Erro: falha ao salvar produto (${String(e?.message || 'erro desconhecido')}). Impacto: cadastro nao foi concluido. Acao: valide os campos e tente novamente.`,
      SEVERITY.ERROR
    );
    return;
  }

  if (State.editIds.prod) {
    D.produtos[State.FIL] = P().map((x) => (x.id === State.editIds.prod ? p : x));
  } else {
    if (!D.produtos[State.FIL]) D.produtos[State.FIL] = [];
    D.produtos[State.FIL].push(p);
  }

  fecharModal('modal-produto');
  renderProdMet();
  renderProdutos();
  refreshProdSel();

  refreshMovSelSafe();

  const pv = p.custo > 0 && p.mkv > 0 ? prV(p.custo, p.mkv) : 0;
  const pa = p.pfa > 0 ? p.pfa : p.custo > 0 && p.mka > 0 ? prV(p.custo, p.mka) : 0;
  notify(
    State.editIds.prod
      ? `Produto atualizado: ${p.nome} - Varejo ${pv > 0 ? fmt(pv) : '-'} - Atacado ${pa > 0 ? fmt(pa) : '-'}`
      : `Produto salvo: ${p.nome} - Varejo ${pv > 0 ? fmt(pv) : '-'} - Atacado ${pa > 0 ? fmt(pa) : '-'}`,
    SEVERITY.SUCCESS
  );
}

export async function removerProd(id) {
  if (!confirm('Remover produto?')) return;

  try {
    await SB.deleteProduto(id);
  } catch (e) {
    toast('Erro: ' + e.message);
    return;
  }

  D.produtos[State.FIL] = P().filter((p) => p.id !== id);
  if (D.movs?.[State.FIL]) {
    D.movs[State.FIL] = D.movs[State.FIL].filter((m) => (m.prod_id || m.prodId) !== id);
  }

  renderProdMet();
  renderProdutos();
  refreshProdSel();

  refreshMovSelSafe();

  toast('Removido.');
}

export function refreshProdSel() {
  const s = prodDom.get('pi-prod');
  if (!s) return;

  const cur = s.value;
  prodDom.select(
    'selectors',
    'pi-prod',
    '<option value="">- selecione -</option>' +
      P()
        .map((p) => `<option value="${p.id}">${p.nome} (${p.un})</option>`)
        .join(''),
    cur,
    'produtos:pedido-selector'
  );
}

/**
 * Chamado quando o seletor de produto pai muda.
 * Auto-sugere o SKU como {skuPai}- quando o campo SKU está vazio.
 */
export function onPaiChange() {
  const paiId = prodDom.get('p-pai')?.value || '';
  const skuEl = prodDom.get('p-sku');
  if (!skuEl) return;

  if (!paiId) return;

  const pai = P().find((p) => p.id === paiId);
  if (!pai?.sku) return;

  if (!skuEl.value.trim()) {
    skuEl.value = `${pai.sku}-`;
    skuEl.focus();
    // Posiciona cursor no fim
    const len = skuEl.value.length;
    skuEl.setSelectionRange(len, len);
  }
}
