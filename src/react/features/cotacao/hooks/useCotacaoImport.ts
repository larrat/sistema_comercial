import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { emitToast } from '../../../app/legacy/events';
import {
  upsertCotacaoPrecos,
  upsertCotacaoHistorico,
  upsertCotacaoConfig,
  getCotacaoLayout,
  upsertCotacaoLayout
} from '../services/cotacaoApi';
import { listProdutos } from '../../produtos/services/produtosApi';
import { useCotacaoStore } from '../store/useCotacaoStore';
import type { Fornecedor, CotacaoSheet, CotacaoMapaDraft, ImportResumo } from '../types';
import type { Produto } from '../../../../types/domain';

function norm(s: unknown) {
  return String(s ?? '').toLowerCase().trim();
}

function normalizarNumeroBR(v: unknown): number {
  let s = String(v ?? '').trim();
  if (!s) return 0;
  s = s.replace(/ /g, ' ').replace(/[R$\s%]/g, '');
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function detectarCabecalho(rows: CotacaoSheet['rows']): number {
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

function scoreSheet(rows: CotacaoSheet['rows'], name: string): number {
  if (!rows?.length) return -999;
  const header = (rows[detectarCabecalho(rows)] || [])
    .map((c) => String(c || '').toUpperCase())
    .join(' | ');
  const n = name.toUpperCase();
  let score = 0;
  if (n.includes('PEDIDO')) score += 20;
  if (n.includes('COTA')) score += 10;
  if (n.includes('COMBO') || n.includes('KIT') || n.includes('APRESENT')) score -= 10;
  if (header.includes('DESCRIÇÃO') || header.includes('DESCRICAO')) score += 15;
  if (header.includes('VALOR UN LIQ')) score += 20;
  if (header.includes('CATEGORIA')) score += 8;
  if (header.includes('KIT 1') || header.includes('COMBO')) score -= 12;
  return score;
}

export function autoDetectColumns(rows: CotacaoSheet['rows'], startIdx: number) {
  const headers = (rows[startIdx] || []).map((h, i) => ({
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

function parseXlsx(buffer: ArrayBuffer): CotacaoSheet[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  return wb.SheetNames.map((name) => {
    const rows = XLSX.utils
      .sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
      .filter((r) => r.some((c: unknown) => String(c).trim() !== ''));
    return { name, rows, score: scoreSheet(rows, name) };
  })
    .filter((s) => s.rows.length)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function parseCsv(buffer: ArrayBuffer): CotacaoSheet[] {
  const text = new TextDecoder().decode(buffer);
  const rows = text
    .split('\n')
    .map((r) => r.split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, '')))
    .filter((r) => r.some((c) => String(c).trim() !== ''));
  return rows.length >= 2 ? [{ name: 'CSV', rows, score: scoreSheet(rows, 'CSV') }] : [];
}

export function useCotacaoImport() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const fornecedores = useCotacaoStore((s) => s.fornecedores);
  const config = useCotacaoStore((s) => s.config);
  const setImportContext = useCotacaoStore((s) => s.setImportContext);
  const openImportMap = useCotacaoStore((s) => s.openImportMap);
  const closeImportMap = useCotacaoStore((s) => s.closeImportMap);
  const setImportProgress = useCotacaoStore((s) => s.setImportProgress);
  const clearImportProgress = useCotacaoStore((s) => s.clearImportProgress);
  const setImportResumo = useCotacaoStore((s) => s.setImportResumo);
  const setConfig = useCotacaoStore((s) => s.setConfig);
  const requestReload = useCotacaoStore((s) => s.requestReload);
  function getCtx() {
    const cfg = getSupabaseConfig();
    return { url: cfg.url, key: cfg.key, token: session?.access_token ?? '', filialId };
  }

  async function handleFile(file: File, fornecedorId: string) {
    const forn = fornecedores.find((f) => f.id === fornecedorId);
    if (!forn) {
      emitToast('Selecione um fornecedor primeiro.', 'warning');
      return;
    }

    const buffer = await file.arrayBuffer();
    let sheets: CotacaoSheet[];

    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        sheets = parseCsv(buffer);
      } else {
        sheets = parseXlsx(buffer);
      }
    } catch {
      emitToast('Erro ao ler o arquivo.', 'error');
      return;
    }

    if (!sheets.length) {
      emitToast('Planilha vazia.', 'warning');
      return;
    }

    // Try to load saved layout
    let savedLayout: Record<string, unknown> | null = null;
    try {
      savedLayout = await getCotacaoLayout(getCtx(), fornecedorId);
    } catch {
      // non-blocking
    }

    setImportContext({ forn, filename: file.name, sheets, savedLayout });
    openImportMap();
  }

  async function confirmarImportacao(forn: Fornecedor, draft: CotacaoMapaDraft, sheets: CotacaoSheet[]) {
    const ctx = getCtx();
    const sheet = sheets[draft.sheet] ?? sheets[0];
    if (!sheet) return;

    if (!draft.mes) {
      emitToast('Informe o mês da cotação.', 'warning');
      return;
    }

    const { nomeCol: nIdx, precoCol: pIdx, catCol: cIdx, tabelaCol: tIdx, descontoCol: dIdx } = draft;
    const startRow = Math.max(0, draft.startLine - 1);
    const linhas = sheet.rows.slice(startRow);

    setImportProgress(5, 'Preparando importação...');

    // Fetch fresh produtos list
    let produtos: Produto[] = [];
    try {
      setImportProgress(10, 'Carregando produtos...');
      produtos = await listProdutos(ctx);
    } catch {
      emitToast('Erro ao carregar produtos para importação.', 'error');
      clearImportProgress();
      return;
    }

    const porNome = new Map<string, Produto>();
    for (const p of produtos) {
      porNome.set(norm(p.nome), p);
      if (p.descricao_padrao) porNome.set(norm(p.descricao_padrao), p);
    }

    let novos = 0;
    let atualizados = 0;
    let falhas = 0;
    let ignorados = 0;
    const ignoradosExemplos: ImportResumo['ignoradosExemplos'] = [];

    const cotPrecosParaSalvar: Parameters<typeof upsertCotacaoPrecos>[1] = [];
    const cotHistoricoParaSalvar: Parameters<typeof upsertCotacaoHistorico>[1] = [];
    const historicoMarcado = new Set<string>();

    for (let i = 0; i < linhas.length; i++) {
      if (i % 25 === 0) {
        setImportProgress(
          15 + Math.round((i / Math.max(linhas.length, 1)) * 40),
          `Analisando linhas... (${i}/${linhas.length})`
        );
      }

      try {
        const row = linhas[i];
        const nomeOriginal = String(row[nIdx] ?? '').trim();

        if (
          !nomeOriginal ||
          nomeOriginal.toUpperCase() === 'DESCRIÇÃO' ||
          nomeOriginal.toUpperCase() === 'DESCRICAO' ||
          nomeOriginal.toUpperCase().includes('PROMOÇÕES') ||
          nomeOriginal.toUpperCase().includes('COMBO')
        ) {
          ignorados++;
          if (ignoradosExemplos.length < 8)
            ignoradosExemplos.push({ linha: startRow + i + 1, nome: nomeOriginal, motivo: 'Linha inválida ou ignorada' });
          continue;
        }

        const precoLiq = normalizarNumeroBR(row[pIdx]);
        if (precoLiq <= 0) {
          ignorados++;
          if (ignoradosExemplos.length < 8)
            ignoradosExemplos.push({ linha: startRow + i + 1, nome: nomeOriginal, motivo: 'Preço inválido ou zerado' });
          continue;
        }

        const precoTabela = tIdx >= 0 ? normalizarNumeroBR(row[tIdx]) || null : null;
        const percDesconto = dIdx >= 0 ? normalizarNumeroBR(row[dIdx]) || null : null;

        const prod = porNome.get(norm(nomeOriginal)) ?? null;

        if (!prod) {
          novos++;
          // new product: just register in cotacao_precos — creation via produtos module
          const fakeId = `nao-mapeado-${norm(nomeOriginal).slice(0, 20)}-${i}`;
          cotPrecosParaSalvar.push({
            filial_id: filialId,
            produto_id: fakeId,
            fornecedor_id: forn.id,
            preco: precoLiq
          });
          const histKey = `${filialId}|${fakeId}|${forn.id}|${draft.mes}`;
          if (!historicoMarcado.has(histKey)) {
            cotHistoricoParaSalvar.push({
              filial_id: filialId,
              produto_id: fakeId,
              fornecedor_id: forn.id,
              mes_ref: `${draft.mes}-01`,
              preco: precoLiq,
              tabela: precoTabela,
              desconto: percDesconto
            });
            historicoMarcado.add(histKey);
          }
        } else {
          atualizados++;
          cotPrecosParaSalvar.push({
            filial_id: filialId,
            produto_id: prod.id,
            fornecedor_id: forn.id,
            preco: precoLiq
          });
          const histKey = `${filialId}|${prod.id}|${forn.id}|${draft.mes}`;
          if (!historicoMarcado.has(histKey)) {
            cotHistoricoParaSalvar.push({
              filial_id: filialId,
              produto_id: prod.id,
              fornecedor_id: forn.id,
              mes_ref: `${draft.mes}-01`,
              preco: precoLiq,
              tabela: precoTabela,
              desconto: percDesconto
            });
            historicoMarcado.add(histKey);
          }
        }
      } catch {
        falhas++;
        if (ignoradosExemplos.length < 8)
          ignoradosExemplos.push({ linha: startRow + i + 1, nome: '', motivo: 'Erro ao processar linha' });
      }
    }

    if (!cotPrecosParaSalvar.length) {
      setImportResumo({ novos, atualizados, ignorados, falhas, ignoradosExemplos });
      emitToast('Nenhum item válido encontrado para importar.', 'warning');
      clearImportProgress();
      return;
    }

    try {
      setImportProgress(60, 'Salvando preços...');
      await upsertCotacaoPrecos(ctx, cotPrecosParaSalvar);

      setImportProgress(80, 'Salvando histórico...');
      await upsertCotacaoHistorico(ctx, cotHistoricoParaSalvar);

      setImportProgress(90, 'Salvando layout...');
      await upsertCotacaoLayout(ctx, {
        filial_id: filialId,
        fornecedor_id: forn.id,
        nome_layout: `${forn.nome} - layout padrão`,
        sheet_name: sheet.name,
        start_line: draft.startLine,
        col_descricao: draft.nomeCol,
        col_preco_liq: draft.precoCol,
        col_categoria: draft.catCol,
        col_tabela: draft.tabelaCol,
        col_desconto: draft.descontoCol,
        ativo: true
      });

      setImportProgress(95, 'Salvando log...');
      const novoConfig = {
        filial_id: filialId,
        locked: config?.locked ?? false,
        logs: [
          {
            arquivo: forn.nome,
            forn: forn.nome,
            mes: draft.mes,
            data: new Date().toLocaleDateString('pt-BR'),
            novos,
            atu: atualizados,
            falhas
          },
          ...(config?.logs ?? []).slice(0, 19)
        ]
      };
      await upsertCotacaoConfig(ctx, novoConfig);
      setConfig(novoConfig);

      setImportProgress(100, 'Concluído!');
      setImportResumo({ novos, atualizados, ignorados, falhas, ignoradosExemplos });

      requestReload();
      closeImportMap();
      emitToast(`Importação concluída: ${atualizados} atualizados, ${novos} novos na cotação.`, 'success');
    } catch (err) {
      emitToast(err instanceof Error ? err.message : 'Erro na importação.', 'error');
      clearImportProgress();
    }
  }

  return { handleFile, confirmarImportacao };
}
