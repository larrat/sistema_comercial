import type { CotacaoHeaderOption, CotacaoMapaDraft, CotacaoSheet } from '../types';

export function detectarCabecalhoImportacao(rows: CotacaoSheet['rows']): number {
  for (let i = 0; i < Math.min(80, rows.length); i++) {
    const joined = rows[i].map((c) => String(c || '').toUpperCase()).join(' | ');
    if (
      joined.includes('DESCRIÇÃO') ||
      joined.includes('DESCRICAO') ||
      joined.includes('VALOR UN LIQ') ||
      joined.includes('PREÇO') ||
      joined.includes('PRECO')
    ) {
      return i;
    }
  }
  return 0;
}

export function autoDetectColumnsImportacao(rows: CotacaoSheet['rows'], startIdx: number) {
  const headers: CotacaoHeaderOption[] = (rows[startIdx] || []).map((h, i) => ({
    label: String(h || 'Col ' + (i + 1)),
    idx: i
  }));
  const find = (kws: string[]) =>
    Math.max(
      -1,
      headers.findIndex((h) => kws.some((k) => h.label.toLowerCase().includes(k)))
    );

  return {
    headers,
    nomeCol: find(['descrição', 'descricao', 'nome', 'produto', 'item']),
    precoCol: find([
      'valor un liq',
      'valor unitário',
      'valor unitario',
      'líquido',
      'liquido',
      'preço',
      'preco',
      'unit'
    ]),
    catCol: find(['categoria', 'família', 'familia', 'grupo', 'linha']),
    tabelaCol: find(['tabela', 'bruto', 'valor tabela']),
    descontoCol: find(['desconto', '%'])
  };
}

function getMesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

function readLayoutNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildDraftFromSheet(
  rows: CotacaoSheet['rows'],
  savedLayout?: Record<string, unknown> | null,
  sheet = 0
): CotacaoMapaDraft {
  const startDetected = detectarCabecalhoImportacao(rows);
  const detected = autoDetectColumnsImportacao(rows, startDetected);

  return {
    sheet,
    nomeCol: readLayoutNumber(savedLayout?.col_descricao, detected.nomeCol),
    precoCol: readLayoutNumber(savedLayout?.col_preco_liq, detected.precoCol),
    catCol: readLayoutNumber(savedLayout?.col_categoria, detected.catCol),
    tabelaCol: readLayoutNumber(savedLayout?.col_tabela, detected.tabelaCol),
    descontoCol: readLayoutNumber(savedLayout?.col_desconto, detected.descontoCol),
    startLine: readLayoutNumber(savedLayout?.start_line, startDetected + 2),
    mes: getMesAtual()
  };
}

export function buildPreviewRows(rows: CotacaoSheet['rows'], startLine: number, count = 5) {
  return rows.slice(Math.max(0, startLine - 1), Math.max(0, startLine - 1) + count);
}
