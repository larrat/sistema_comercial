import { normalizarNumeroBR, detectarCabecalho } from './parsing.js';

export function setImportProgress(percent = 0, text = ''){
  const wrap = document.getElementById('map-progress-wrap');
  const bar = document.getElementById('map-progress-bar');
  const lbl = document.getElementById('map-progress-text');

  if(!wrap || !bar || !lbl) return;

  wrap.style.display = 'block';
  bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  lbl.textContent = text || `${percent}%`;
}

export function resetImportProgress(){
  const wrap = document.getElementById('map-progress-wrap');
  const bar = document.getElementById('map-progress-bar');
  const lbl = document.getElementById('map-progress-text');
  const resumo = document.getElementById('map-resumo');

  if(wrap) wrap.style.display = 'none';
  if(bar) bar.style.width = '0%';
  if(lbl) lbl.textContent = '';
  if(resumo) resumo.innerHTML = '';
}

export function renderImportResumo(resumo){
  const el = document.getElementById('map-resumo');
  if(!el) return;

  const ignoradosHtml = (resumo.ignoradosExemplos || []).length
    ? `
      <div style="margin-top:10px">
        <div class="fl">Exemplos de linhas ignoradas</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
          ${resumo.ignoradosExemplos.map(x => `
            <div style="font-size:12px;color:var(--tx2);padding:8px 10px;border:1px solid var(--bd);border-radius:10px;background:var(--surf2)">
              <b>Linha ${x.linha}</b> — ${x.motivo}${x.nome ? ` <span style="color:var(--tx3)">(${x.nome})</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  el.innerHTML = `
    <div class="panel" style="margin-top:12px">
      <div class="pt">Resumo da Importação</div>
      <div class="fg c2" style="margin-top:8px">
        <div class="met"><div class="ml">Novos</div><div class="mv">${resumo.novos || 0}</div></div>
        <div class="met"><div class="ml">Atualizados</div><div class="mv">${resumo.atualizados || 0}</div></div>
        <div class="met"><div class="ml">Ignorados</div><div class="mv">${resumo.ignorados || 0}</div></div>
        <div class="met"><div class="ml">Falhas</div><div class="mv">${resumo.falhas || 0}</div></div>
      </div>
      ${ignoradosHtml}
    </div>
  `;
}

export function validarPreImportacao(rows, start, nomeIdx, precoIdx){
  const erros = [];

  if(nomeIdx < 0 || isNaN(nomeIdx)) erros.push('Selecione a coluna de Descrição.');
  if(precoIdx < 0 || isNaN(precoIdx)) erros.push('Selecione a coluna de Valor Un Líq.');

  if(erros.length) return { ok: false, erros };

  const amostra = rows.slice(start, start + 20);

  let nomesValidos = 0;
  let precosValidos = 0;

  for(const row of amostra){
    const nome = String(row[nomeIdx] || '').trim();
    const preco = normalizarNumeroBR(row[precoIdx]);

    if(nome && nome.length >= 3) nomesValidos++;
    if(preco > 0) precosValidos++;
  }

  if(nomesValidos === 0){
    erros.push('A coluna de descrição escolhida não possui textos válidos na amostra.');
  }

  if(precosValidos === 0){
    erros.push('A coluna de preço escolhida não possui números válidos na amostra.');
  }

  return {
    ok: erros.length === 0,
    erros,
    nomesValidos,
    precosValidos
  };
}

export function pareceAbaDeCombo(sheet){
  const nome = String(sheet?.name || '').toUpperCase();
  const rows = sheet?.rows || [];
  const startIdx = detectarCabecalho(rows);
  const header = (rows[startIdx] || []).map(c => String(c || '').toUpperCase()).join(' | ');

  return (
    nome.includes('COMBO') ||
    nome.includes('KIT') ||
    header.includes('KIT 1') ||
    header.includes('KIT 2') ||
    header.includes('COMBO')
  );
}
