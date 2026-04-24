import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { emitToast } from '../../../app/legacy/events';
import type { Produto } from '../../../../types/domain';
import {
  getCotacaoLayout,
} from '../services/cotacaoApi';
import { listProdutos } from '../../produtos/services/produtosApi';
import { persistCotacaoImport } from '../services/cotacaoImportService';
import { useCotacaoStore } from '../store/useCotacaoStore';
import type { Fornecedor, CotacaoSheet, CotacaoMapaDraft } from '../types';
import {
  autoDetectColumnsImportacao,
  detectarCabecalhoImportacao
} from '../utils/importMapping';

function scoreSheet(rows: CotacaoSheet['rows'], name: string): number {
  if (!rows?.length) return -999;
  const header = (rows[detectarCabecalhoImportacao(rows)] || [])
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
  const setImportProgress = useCotacaoStore((s) => s.setImportProgress);
  const clearImportProgress = useCotacaoStore((s) => s.clearImportProgress);
  const setImportResumo = useCotacaoStore((s) => s.setImportResumo);
  const clearImportResumo = useCotacaoStore((s) => s.clearImportResumo);
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

    clearImportProgress();
    clearImportResumo();
    setImportContext({ forn, filename: file.name, sheets, savedLayout });
    openImportMap();
  }

  async function confirmarImportacao(forn: Fornecedor, draft: CotacaoMapaDraft, sheets: CotacaoSheet[]) {
    const ctx = getCtx();
    const sheet = sheets[draft.sheet] ?? sheets[0];
    if (!sheet) return;

    if (config?.locked) {
      emitToast('A cotação está travada. Destrave antes de importar.', 'warning');
      return;
    }

    if (!draft.mes) {
      emitToast('Informe o mês da cotação.', 'warning');
      return;
    }
    let produtos: Produto[] = [];
    try {
      setImportProgress(10, 'Carregando produtos...');
      produtos = await listProdutos(ctx);
    } catch (err) {
      emitToast(err instanceof Error ? err.message : 'Erro ao carregar produtos para importação.', 'error');
      clearImportProgress();
      return;
    }

    try {
      const result = await persistCotacaoImport(ctx, {
        forn,
        draft,
        sheet,
        produtos,
        config,
        onProgress: setImportProgress
      });
      setConfig(result.config);
      setImportResumo(result.resumo);
      clearImportProgress();
      requestReload();
      if (result.resumo.status === 'partial') {
        emitToast(
          `Importação concluída com falhas parciais: ${result.resumo.atualizados} atualizados, ${result.resumo.novos} novos e ${result.resumo.falhas} falhas.`,
          'warning'
        );
      } else if (result.resumo.status === 'failed') {
        emitToast('Importação processada, mas nenhuma etapa foi concluída com sucesso.', 'error');
      } else {
        emitToast(
          `Importação concluída: ${result.resumo.atualizados} atualizados, ${result.resumo.novos} novos na cotação.`,
          'success'
        );
      }
    } catch (err) {
      emitToast(err instanceof Error ? err.message : 'Erro na importação.', 'error');
      clearImportProgress();
    }
  }

  return { handleFile, confirmarImportacao };
}
