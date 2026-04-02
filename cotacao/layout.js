import { detectarCabecalho } from './parsing.js';

export function findHeaderIndexByExactName(headers, target){
  const t = String(target || '').trim().toLowerCase();
  if(!t) return -1;

  return headers.findIndex(h =>
    String(h.label || '').trim().toLowerCase() === t
  );
}

export function findHeaderIndexBySavedName(headers, saved){
  if(!saved) return -1;

  let idx = findHeaderIndexByExactName(headers, saved);
  if(idx >= 0) return idx;

  const s = String(saved).trim().toLowerCase();

  idx = headers.findIndex(h =>
    String(h.label || '').trim().toLowerCase().includes(s)
  );
  if(idx >= 0) return idx;

  idx = headers.findIndex(h =>
    s.includes(String(h.label || '').trim().toLowerCase())
  );

  return idx;
}

export function getSheetHeaders(sheet){
  const rows = sheet?.rows || [];
  const startIdx = detectarCabecalho(rows);

  return (rows[startIdx] || []).map((h, i) => ({
    label: String(h || ('Col ' + (i + 1))),
    idx: i
  }));
}

export function applySavedLayoutToSheet(sheet, layout){
  if(!sheet || !layout) return null;

  const headers = getSheetHeaders(sheet);

  const idxDescricao = findHeaderIndexBySavedName(headers, layout.col_descricao);
  const idxCategoria = findHeaderIndexBySavedName(headers, layout.col_categoria);
  const idxTabela = findHeaderIndexBySavedName(headers, layout.col_tabela);
  const idxDesconto = findHeaderIndexBySavedName(headers, layout.col_desconto);
  const idxPrecoLiq = findHeaderIndexBySavedName(headers, layout.col_preco_liq);

  return {
    startLine: layout.start_line || null,
    idxDescricao,
    idxCategoria,
    idxTabela,
    idxDesconto,
    idxPrecoLiq
  };
}

export function getSelectedHeaderName(selectId){
  const el = document.getElementById(selectId);
  if(!el) return null;

  const txt = el.options?.[el.selectedIndex]?.text || '';
  return txt && !txt.includes('não importar') ? txt : null;
}