export function normalizarNumeroBR(v){
  let s = String(v ?? '').trim();
  if(!s) return 0;

  s = s.replace(/\u00A0/g, ' ');
  s = s.replace(/[R$\s%]/g, '');

  if(s.includes('.') && s.includes(',')){
    s = s.replace(/\./g, '').replace(',', '.');
  } else if(s.includes(',')) {
    s = s.replace(',', '.');
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function detectarCabecalho(rows){
  let startIdx = 0;

  for(let i = 0; i < Math.min(80, rows.length); i++){
    const row = rows[i].map(c => String(c || '').toUpperCase());
    const joined = row.join(' | ');

    if(
      joined.includes('DESCRIÇÃO') ||
      joined.includes('DESCRICAO') ||
      joined.includes('VALOR UN LIQ') ||
      joined.includes('VALOR UN') ||
      joined.includes('PREÇO') ||
      joined.includes('PRECO')
    ){
      startIdx = i;
      break;
    }
  }

  return startIdx;
}

export function scoreSheetByName(name){
  const n = String(name || '').toUpperCase();
  let score = 0;

  if(n.includes('PEDIDO')) score += 20;
  if(n.includes('COTA') || n.includes('COTACAO')) score += 10;

  if(n.includes('COMBO')) score -= 8;
  if(n.includes('KIT')) score -= 8;
  if(n.includes('APRESENTAÇÃO') || n.includes('APRESENTACAO')) score -= 10;

  return score;
}

export function scoreSheet(rows, name){
  if(!rows?.length) return -999;

  const startIdx = detectarCabecalho(rows);
  const header = (rows[startIdx] || []).map(c => String(c || '').toUpperCase());
  const joined = header.join(' | ');

  let score = scoreSheetByName(name);

  if(joined.includes('DESCRIÇÃO') || joined.includes('DESCRICAO')) score += 15;
  if(joined.includes('VALOR UN LIQ')) score += 20;
  if(joined.includes('CATEGORIA')) score += 8;
  if(joined.includes('TABELA')) score += 8;
  if(joined.includes('% DESCONTO')) score += 8;
  if(joined.includes('CÓDIGO AUXILIAR') || joined.includes('CODIGO AUXILIAR')) score += 6;
  if(joined.includes('VALOR TOTAL LÍQUIDO') || joined.includes('VALOR TOTAL LIQUIDO')) score += 4;

  if(joined.includes('KIT 1')) score -= 15;
  if(joined.includes('KIT 2')) score -= 15;
  if(joined.includes('COMBO')) score -= 12;

  return score;
}

export function colunaTemValoresNumericos(rows, colIdx, startIdx = 0, sampleSize = 12){
  if(colIdx < 0) return false;

  const amostra = rows.slice(startIdx, startIdx + sampleSize);
  let validos = 0;

  for(const row of amostra){
    const n = normalizarNumeroBR(row[colIdx]);
    if(n > 0) validos++;
  }

  return validos > 0;
}