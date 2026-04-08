import { SB } from '../../app/api.js';
import { D, State, P, FORNS, CPRECOS, CCFG } from '../../app/store.js';
import { uid, norm, toast, abrirModal, fecharModal, chunkArray } from '../../shared/utils.js';
import { detectarCabecalho, scoreSheet, normalizarNumeroBR, colunaTemValoresNumericos } from './parsing.js';
import { applySavedLayoutToSheet, getSelectedHeaderName } from './layout.js';
import { setImportProgress, resetImportProgress, renderImportResumo, validarPreImportacao, pareceAbaDeCombo } from './progress.js';

export function getMapaSheetAtual(){
  const ctx = State._mapaCtx || {};
  const sel = document.getElementById('map-sheet');
  const idx = sel ? parseInt(sel.value || '0', 10) : (ctx.sheetIdx || 0);
  return (ctx.sheets || [])[idx] || null;
}

async function upsertProdutosEmLote(items, chunkSize = 150){
  const lotes = chunkArray(items, chunkSize);
  for(const lote of lotes){
    const result = await SB.toResult(() => SB.upsertProdutosLote(lote));
    if(!result.ok) throw result.error;
  }
}

async function upsertCotPrecosEmLote(items, chunkSize = 250){
  const lotes = chunkArray(items, chunkSize);
  for(const lote of lotes){
    const result = await SB.toResult(() => SB.upsertCotPrecosLote(lote));
    if(!result.ok) throw result.error;
  }
}

async function upsertCotHistoricoEmLote(items, chunkSize = 250){
  const lotes = chunkArray(items, chunkSize);
  for(const lote of lotes){
    const result = await SB.toResult(() => SB.upsertCotHistoricoLote(lote));
    if(!result.ok) throw result.error;
  }
}

export function renderMapaBody(){
  const ctx = State._mapaCtx;

  if(!ctx || !ctx.sheets || !ctx.sheets.length){
    document.getElementById('mapa-body').innerHTML = '<p>Nenhuma aba encontrada.</p>';
    return;
  }

  const selExistente = document.getElementById('map-sheet');
  if(selExistente){
    ctx.sheetIdx = parseInt(selExistente.value || String(ctx.sheetIdx || 0), 10);
  }

  const sheet = getMapaSheetAtual();
  const rows = sheet?.rows || [];

  if(!rows.length){
    document.getElementById('mapa-body').innerHTML = '<p>Nenhum dado na aba selecionada.</p>';
    return;
  }

  const startIdx = detectarCabecalho(rows);
  const headers = (rows[startIdx] || []).map((h, i) => ({
    label: String(h || ('Col ' + (i + 1))),
    idx: i
  }));

  const prev = rows.slice(startIdx + 1, startIdx + 6);
  const opts = headers.map(h => `<option value="${h.idx}">${h.label}</option>`).join('');
  const optsN = '<option value="">— não importar —</option>' + opts;

  const findHeader = kws => Math.max(
    -1,
    headers.findIndex(h => kws.some(k => String(h.label).toLowerCase().includes(k)))
  );

  const autoN = findHeader(['descrição','descricao','nome','produto','item']);
  const autoC = findHeader(['categoria','família','familia','grupo','linha']);
  const autoT = findHeader(['tabela','bruto','valor tabela','preço tabela','preco tabela']);
  const autoD = findHeader(['desconto','%']);
  const autoP = findHeader(['valor un liq','valor unitário','valor unitario','líquido','liquido','preço','preco','unit']);

  const layoutAplicado = ctx.layoutSalvo
    ? applySavedLayoutToSheet(sheet, ctx.layoutSalvo)
    : null;

  const gN = layoutAplicado && layoutAplicado.idxDescricao >= 0 ? layoutAplicado.idxDescricao : autoN;
  const gC = layoutAplicado && layoutAplicado.idxCategoria >= 0 ? layoutAplicado.idxCategoria : autoC;
  const gT = layoutAplicado && layoutAplicado.idxTabela >= 0 ? layoutAplicado.idxTabela : autoT;
  const gD = layoutAplicado && layoutAplicado.idxDesconto >= 0 ? layoutAplicado.idxDesconto : autoD;
  const gP = layoutAplicado && layoutAplicado.idxPrecoLiq >= 0 ? layoutAplicado.idxPrecoLiq : autoP;

  const hoje = new Date();
  const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');

  document.getElementById('mapa-body').innerHTML = `
    <p style="font-size:13px;color:var(--tx2);margin-bottom:10px">
      Arquivo: <b>${ctx.filename}</b>
      &nbsp;&nbsp;•&nbsp;&nbsp;Aba: <b>${sheet.name}</b>
    </p>

    ${ctx.layoutSalvo ? `
      <div style="margin-bottom:12px;padding:10px 12px;border:1px solid var(--bd);border-radius:12px;background:var(--surf2);font-size:13px;color:var(--tx2)">
        ✓ Layout salvo encontrado para <b>${ctx.forn.nome}</b>${ctx.layoutSalvo.sheet_name ? ` — aba preferida: <b>${ctx.layoutSalvo.sheet_name}</b>` : ''}
      </div>
    ` : ''}

    <div style="margin-bottom:12px">
      <div class="fl">Aba da planilha</div>
      <select class="inp sel" id="map-sheet" onchange="renderMapaBody()">
        ${ctx.sheets.map((s, i) => `
          <option value="${i}" ${i === (ctx.sheetIdx || 0) ? 'selected' : ''}>
            ${s.name}
          </option>
        `).join('')}
      </select>
    </div>

    <div class="map-prev" style="overflow-x:auto; margin-bottom:12px">
      <table class="tbl" style="white-space:nowrap">
        <thead>
          <tr>${headers.map(h => `<th>${h.label}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${prev.map(r => `
            <tr>
              ${headers.map((_, i) => `<td>${String(r[i] ?? '').substring(0, 40)}</td>`).join('')}
            </tr>
          `).join('')}
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
        <input class="inp" type="number" id="map-start" value="${(layoutAplicado?.startLine || ctx.startLine || (startIdx + 2))}" min="1" max="${rows.length}">
      </div>
    </div>

    <div class="fg c2" style="margin-bottom:10px">
      <div>
        <div class="fl">Descrição (Produto) *</div>
        <select class="inp sel" id="map-nome">${opts.replace(`value="${gN}"`, `value="${gN}" selected`)}</select>
      </div>
      <div>
        <div class="fl">Valor Un Líq (Preço) *</div>
        <select class="inp sel" id="map-preco">${opts.replace(`value="${gP}"`, `value="${gP}" selected`)}</select>
      </div>
      <div>
        <div class="fl">Categoria</div>
        <select class="inp sel" id="map-cat">${optsN.replace(`value="${gC}"`, `value="${gC}" selected`)}</select>
      </div>
      <div>
        <div class="fl">Preço de Tabela</div>
        <select class="inp sel" id="map-tabela">${optsN.replace(`value="${gT}"`, `value="${gT}" selected`)}</select>
      </div>
      <div>
        <div class="fl">% Desconto</div>
        <select class="inp sel" id="map-desc">${optsN.replace(`value="${gD}"`, `value="${gD}" selected`)}</select>
      </div>
    </div>

    <div id="map-progress-wrap" style="display:none;margin-top:12px">
      <div class="fl" id="map-progress-text">Processando...</div>
      <div style="width:100%;height:10px;background:var(--bd);border-radius:999px;overflow:hidden;margin-top:6px">
        <div id="map-progress-bar" style="width:0%;height:100%;background:var(--acc);transition:width .2s ease"></div>
      </div>
    </div>

    <div id="map-resumo"></div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn" onclick="fecharModal('modal-mapa')">Cancelar</button>
      <button class="btn btn-p" onclick="confirmarMapa()">Confirmar importação</button>
    </div>
  `;

  const sel = document.getElementById('map-sheet');
  if(sel){
    State._mapaCtx.sheetIdx = parseInt(sel.value || '0', 10);
  }

  resetImportProgress();

  if(pareceAbaDeCombo(sheet)){
    const resumo = document.getElementById('map-resumo');
    if(resumo){
      resumo.innerHTML = `
        <div class="alert al-a" style="margin-top:12px">
          ⚠ Esta aba parece ser de <b>combo/kit</b>, não de cotação unitária.
          Prefira uma aba com <b>DESCRIÇÃO</b> e <b>VALOR UN LIQ</b>.
        </div>
      `;
    }
  }
}

export async function abrirMapaModal(ctx){
  let layoutSalvo = null;

  const layoutResult = await SB.toResult(() => SB.getCotLayout(State.FIL, ctx.forn.id));
  if(layoutResult.ok){
    layoutSalvo = layoutResult.data;
  }else{
    console.error('Erro ao buscar layout salvo', layoutResult.error);
  }

  let sheetIdx = typeof ctx.sheetIdx === 'number' ? ctx.sheetIdx : 0;

  if(layoutSalvo && ctx.sheets?.length){
    const idxByName = ctx.sheets.findIndex(
      s => String(s.name || '').trim().toLowerCase() === String(layoutSalvo.sheet_name || '').trim().toLowerCase()
    );
    if(idxByName >= 0){
      sheetIdx = idxByName;
    }
  }

  State._mapaCtx = {
    ...ctx,
    sheetIdx,
    layoutSalvo
  };

  document.getElementById('mapa-titulo').textContent = 'Importar Cotação — ' + ctx.forn.nome;
  abrirModal('modal-mapa');
  renderMapaBody();
}

export function cotFile(e){
  const file = e.target.files[0];
  e.target.value = '';
  if(!file) return;

  const fid = document.getElementById('cot-forn-sel').value;
  if(!fid){
    toast('Selecione um fornecedor primeiro.');
    return;
  }

  const forn = (FORNS() || []).find(f => f.id === fid);
  const reader = new FileReader();

  reader.onload = ev => {
    try{
      if(file.name.toLowerCase().endsWith('.csv')){
        const text = new TextDecoder().decode(ev.target.result);
        const rows = text
          .split('\n')
          .map(r => r.split(/[;,\t]/).map(c => c.trim().replace(/^"|"$/g,'')))
          .filter(r => r.some(c => String(c).trim() !== ''));

        if(rows.length < 2){
          toast('Planilha vazia.');
          return;
        }

        abrirMapaModal({
          forn,
          filename: file.name,
          sheets: [{
            name: 'CSV',
            rows,
            score: scoreSheet(rows, 'CSV')
          }],
          sheetIdx: 0
        });
        return;
      }

      const wb = XLSX.read(ev.target.result, { type: 'array' });

      const sheets = wb.SheetNames.map(name => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {
          header: 1,
          defval: ''
        }).filter(r => r.some(c => String(c).trim() !== ''));

        return {
          name,
          rows,
          score: scoreSheet(rows, name)
        };
      }).filter(s => s.rows.length);

      if(!sheets.length){
        toast('Planilha vazia.');
        return;
      }

      sheets.sort((a, b) => b.score - a.score);

      abrirMapaModal({
        forn,
        filename: file.name,
        sheets,
        sheetIdx: 0
      });
    }catch(err){
      console.error(err);
      toast('Erro ao ler o arquivo.');
    }
  };

  reader.readAsArrayBuffer(file);
}

let renderCotLogsSafe = () => {};
let renderProdMetSafe = () => {};
let renderProdutosSafe = () => {};

export function setImportacaoCallbacks(callbacks = {}){
  renderCotLogsSafe = callbacks.renderCotLogs || (() => {});
  renderProdMetSafe = callbacks.renderProdMet || (() => {});
  renderProdutosSafe = callbacks.renderProdutos || (() => {});
}

export async function confirmarMapa(){
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

  const preCheck = validarPreImportacao(rows, start, nIdx, pIdx);
  if(!preCheck.ok){
    renderImportResumo({
      novos: 0,
      atualizados: 0,
      ignorados: 0,
      falhas: 0,
      ignoradosExemplos: preCheck.erros.map(msg => ({ linha: '-', motivo: msg, nome: '' }))
    });
    toast('Revise o mapeamento antes de importar.');
    return;
  }

  if(!colunaTemValoresNumericos(rows, pIdx, start, 12)){
    toast('A coluna escolhida para Valor Un Líq não possui valores numéricos válidos.');
    return;
  }

  const forn = ctx.forn;
  const linhas = rows.slice(start);

  if(!D.produtos[State.FIL]) D.produtos[State.FIL] = [];
  if(!D.cotPrecos[State.FIL]) D.cotPrecos[State.FIL] = {};

  const produtosAtuais = P();
  const produtosPorNome = new Map();

  produtosAtuais.forEach(p => {
    produtosPorNome.set(norm(p.nome), p);
    if(p.descricao_padrao) produtosPorNome.set(norm(p.descricao_padrao), p);
  });

  let novos = 0;
  let atualizados = 0;
  let falhas = 0;
  let ignorados = 0;
  const ignoradosExemplos = [];

  const produtosParaSalvar = [];
  const cotPrecosParaSalvar = [];
  const cotHistoricoParaSalvar = [];

  const produtosMarcados = new Set();
  const historicoMarcado = new Set();

  setImportProgress(5, 'Preparando importação...');

  for(let i = 0; i < linhas.length; i++){
    try{
      if(i % 25 === 0){
        const progresso = 5 + Math.round((i / Math.max(linhas.length, 1)) * 35);
        setImportProgress(progresso, `Analisando linhas... (${i}/${linhas.length})`);
      }

      const row = linhas[i];
      const nomeOriginal = String(row[nIdx] || '').trim();

      if(!nomeOriginal || nomeOriginal.toUpperCase() === 'DESCRIÇÃO' || nomeOriginal.toUpperCase() === 'DESCRICAO'){
        ignorados++;
        if(ignoradosExemplos.length < 8){
          ignoradosExemplos.push({ linha: start + i + 1, motivo: 'Linha sem descrição válida', nome: nomeOriginal });
        }
        continue;
      }

      if(
        nomeOriginal.toUpperCase().includes('PROMOÇÕES') ||
        nomeOriginal.toUpperCase().includes('PROMOCOES') ||
        nomeOriginal.toUpperCase().includes('COMBO')
      ){
        ignorados++;
        if(ignoradosExemplos.length < 8){
          ignoradosExemplos.push({ linha: start + i + 1, motivo: 'Linha de combo/promoção ignorada', nome: nomeOriginal });
        }
        continue;
      }

      const precoLiq = normalizarNumeroBR(row[pIdx]);
      if(precoLiq <= 0){
        ignorados++;
        if(ignoradosExemplos.length < 8){
          ignoradosExemplos.push({ linha: start + i + 1, motivo: 'Preço líquido inválido ou zerado', nome: nomeOriginal });
        }
        continue;
      }

      const categoria = cIdx >= 0 ? String(row[cIdx] || '').trim() : '';
      const precoTabela = tIdx >= 0 ? normalizarNumeroBR(row[tIdx]) : null;
      const percDesconto = dIdx >= 0 ? normalizarNumeroBR(row[dIdx]) : null;

      const nomeKey = norm(nomeOriginal);
      let prod = produtosPorNome.get(nomeKey) || null;

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
        produtosPorNome.set(nomeKey, prod);
        produtosPorNome.set(norm(prod.descricao_padrao || ''), prod);
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

        atualizados++;
      }

      if(!produtosMarcados.has(prod.id)){
        produtosParaSalvar.push(prod);
        produtosMarcados.add(prod.id);
      }

      const k = prod.id + '_' + forn.id;
      CPRECOS()[k] = precoLiq;

      cotPrecosParaSalvar.push({
        filial_id: State.FIL,
        produto_id: prod.id,
        fornecedor_id: forn.id,
        preco: precoLiq,
        preco_tabela: precoTabela,
        perc_desconto: percDesconto,
        mes_ref: `${mesCotacao}-01`,
        arquivo_origem: ctx.filename
      });

      const histKey = `${State.FIL}|${prod.id}|${forn.id}|${mesCotacao}`;
      if(!historicoMarcado.has(histKey)){
        cotHistoricoParaSalvar.push({
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
        historicoMarcado.add(histKey);
      }
    }catch(e){
      falhas++;
      if(ignoradosExemplos.length < 8){
        ignoradosExemplos.push({ linha: start + i + 1, motivo: 'Erro ao processar linha', nome: '' });
      }
      console.error('Erro ao preparar linha para importação', { linha: start + i + 1, e });
    }
  }

  if(!produtosParaSalvar.length && !cotPrecosParaSalvar.length && !cotHistoricoParaSalvar.length){
    renderImportResumo({
      novos: 0,
      atualizados: 0,
      ignorados,
      falhas,
      ignoradosExemplos
    });
    toast('Nenhum item válido encontrado para importar.');
    resetImportProgress();
    return;
  }

  try{
    setImportProgress(45, 'Salvando produtos...');
    await upsertProdutosEmLote(produtosParaSalvar, 150);

    setImportProgress(70, 'Salvando cotação atual...');
    await upsertCotPrecosEmLote(cotPrecosParaSalvar, 250);

    setImportProgress(90, 'Salvando histórico...');
    await upsertCotHistoricoEmLote(cotHistoricoParaSalvar, 250);

    setImportProgress(96, 'Salvando layout...');
    const layoutResult = await SB.toResult(() => SB.upsertCotLayout({
      filial_id: State.FIL,
      fornecedor_id: forn.id,
      nome_layout: forn.nome + ' - layout padrão',
      sheet_name: sheet?.name || null,
      start_line: start + 1,
      col_descricao: getSelectedHeaderName('map-nome'),
      col_categoria: getSelectedHeaderName('map-cat'),
      col_tabela: getSelectedHeaderName('map-tabela'),
      col_desconto: getSelectedHeaderName('map-desc'),
      col_preco_liq: getSelectedHeaderName('map-preco'),
      ativo: true
    }));
    if(!layoutResult.ok) throw layoutResult.error;

    setImportProgress(100, 'Finalizando...');
  }catch(e){
    const err = SB.normalizeError(e);
    console.error('Erro no upsert em lote', err);
    falhas++;
    renderImportResumo({
      novos,
      atualizados,
      ignorados,
      falhas,
      ignoradosExemplos
    });
    toast('Erro ao salvar importação em lote: ' + err.message);
    return;
  }

  const logs = CCFG().logs || [];
  logs.unshift({
    arquivo: ctx.filename,
    aba: sheet?.name || '',
    forn: forn.nome,
    mes: mesCotacao,
    data: new Date().toLocaleString('pt-BR'),
    novos,
    atu: atualizados,
    falhas
  });
  CCFG().logs = logs;

  const configResult = await SB.toResult(() => SB.upsertCotConfig({
      filial_id: State.FIL,
      locked: CCFG().locked,
      logs
    }));
  if(!configResult.ok){
    console.error('Erro ao salvar log de cotação', configResult.error);
  }

  renderImportResumo({
    novos,
    atualizados,
    ignorados,
    falhas,
    ignoradosExemplos
  });

  renderCotLogsSafe();
  renderProdMetSafe();
  renderProdutosSafe();

  setTimeout(() => {
    fecharModal('modal-mapa');
    resetImportProgress();
  }, 700);

  if(falhas > 0){
    toast(`Importação concluída com falhas: ${novos} novos, ${atualizados} atualizados, ${falhas} erros`);
  } else {
    toast(`✓ ${novos} novos produtos, ${atualizados} atualizados, ${ignorados} ignorados`);
  }
}

