import { saveProduto } from '../../produtos/services/produtosApi';
import type { ProdutoWriteInput } from '../../produtos/types';
import type { Produto } from '../../../../types/domain';
import type {
  CotacaoApiContext,
  CotacaoConfig,
  CotacaoHistoricoRecord,
  ImportMatchReview,
  ImportMatchReviewRow,
  CotacaoLog,
  CotacaoMapaDraft,
  CotacaoPrecoRecord,
  CotacaoSheet,
  Fornecedor,
  ImportResumo
} from '../types';
import {
  upsertCotacaoConfig,
  upsertCotacaoHistorico,
  upsertCotacaoLayout,
  upsertCotacaoPrecos
} from './cotacaoApi';

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
  return Number.isFinite(n) ? n : 0;
}

function buildProdutosCandidateMap(produtos: Produto[]): Map<string, Produto[]> {
  const map = new Map<string, Produto[]>();

  function pushCandidate(key: string, produto: Produto) {
    if (!key) return;
    const current = map.get(key) ?? [];
    if (!current.some((item) => item.id === produto.id)) {
      current.push(produto);
      map.set(key, current);
    }
  }

  for (const produto of produtos) {
    pushCandidate(norm(produto.nome), produto);
    pushCandidate(norm(produto.descricao_padrao), produto);
  }

  return map;
}

type ImportPlanRow = {
  nomeOriginal: string;
  categoria: string | null;
  precoLiq: number;
  precoTabela: number | null;
  percDesconto: number | null;
};

type ImportPlan = {
  resumo: ImportResumo;
  rows: ImportPlanRow[];
};

type ProgressFn = (pct: number, msg: string) => void;

type ImportStageId = 'produtos' | 'cotacao_atual' | 'historico' | 'layout' | 'log';

type ImportStageResult = {
  id: ImportStageId;
  label: string;
  status: 'success' | 'partial' | 'failed';
  processados: number;
  sucesso: number;
  falhas: number;
};

type ImportIssue = {
  etapa: ImportStageId;
  nome: string;
  motivo: string;
};

const CHUNK_SIZE_PRECOS = 200;
const CHUNK_SIZE_HISTORICO = 200;

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function persistChunked<T>(
  items: T[],
  size: number,
  persistChunk: (chunk: T[], index: number, total: number) => Promise<void>,
  onProgress: ProgressFn,
  basePct: number,
  pctSpan: number,
  messagePrefix: string,
  stageId: ImportStageId,
  issues: ImportIssue[]
): Promise<ImportStageResult> {
  const chunks = chunkArray(items, size);
  if (!chunks.length) {
    return {
      id: stageId,
      label: messagePrefix,
      status: 'success',
      processados: 0,
      sucesso: 0,
      falhas: 0
    };
  }

  let success = 0;
  let failed = 0;

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const pct = basePct + Math.round(((index + 1) / chunks.length) * pctSpan);
    onProgress(pct, `${messagePrefix} (${index + 1}/${chunks.length})`);

    try {
      await persistChunk(chunk, index, chunks.length);
      success += chunk.length;
    } catch (error) {
      failed += chunk.length;
      const message =
        error instanceof Error ? error.message : `Falha ao persistir lote de ${messagePrefix.toLowerCase()}`;
      for (const item of chunk.slice(0, 8)) {
        const nome =
          item && typeof item === 'object' && 'descricao_importada' in item
            ? String(item.descricao_importada || '')
            : item && typeof item === 'object' && 'produto_id' in item
              ? String(item.produto_id || '')
              : '';
        issues.push({
          etapa: stageId,
          nome,
          motivo: message
        });
      }
    }
  }

  return {
    id: stageId,
    label: messagePrefix,
    status: failed === 0 ? 'success' : success > 0 ? 'partial' : 'failed',
    processados: items.length,
    sucesso: success,
    falhas: failed
  };
}

export function buildCotacaoImportPlan(
  draft: CotacaoMapaDraft,
  sheet: CotacaoSheet
): ImportPlan {
  const { nomeCol: nIdx, precoCol: pIdx, catCol: cIdx, tabelaCol: tIdx, descontoCol: dIdx } = draft;
  const startRow = Math.max(0, draft.startLine - 1);
  const linhas = sheet.rows.slice(startRow);

  let novos = 0;
  let atualizados = 0;
  let falhas = 0;
  let ignorados = 0;
  const ignoradosExemplos: ImportResumo['ignoradosExemplos'] = [];
  const rows: ImportPlanRow[] = [];

  for (let i = 0; i < linhas.length; i++) {
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
        if (ignoradosExemplos.length < 8) {
          ignoradosExemplos.push({
            linha: startRow + i + 1,
            nome: nomeOriginal,
            motivo: 'Linha inválida ou ignorada'
          });
        }
        continue;
      }

      const precoLiq = normalizarNumeroBR(row[pIdx]);
      if (precoLiq <= 0) {
        ignorados++;
        if (ignoradosExemplos.length < 8) {
          ignoradosExemplos.push({
            linha: startRow + i + 1,
            nome: nomeOriginal,
            motivo: 'Preço inválido ou zerado'
          });
        }
        continue;
      }

      const categoria = cIdx >= 0 ? String(row[cIdx] ?? '').trim() || null : null;
      const precoTabela = tIdx >= 0 ? normalizarNumeroBR(row[tIdx]) || null : null;
      const percDesconto = dIdx >= 0 ? normalizarNumeroBR(row[dIdx]) || null : null;

      rows.push({
        nomeOriginal,
        categoria,
        precoLiq,
        precoTabela,
        percDesconto
      });
      atualizados++;
    } catch {
      falhas++;
      if (ignoradosExemplos.length < 8) {
        ignoradosExemplos.push({
          linha: startRow + i + 1,
          nome: '',
          motivo: 'Erro ao processar linha'
        });
      }
    }
  }

  return {
    resumo: { novos, atualizados, ignorados, falhas, ignoradosExemplos },
    rows
  };
}

export function buildCotacaoImportMatchReview(
  rows: ImportPlanRow[],
  produtos: Produto[]
): ImportMatchReview {
  const candidateMap = buildProdutosCandidateMap(produtos);
  const reviewRows: ImportMatchReviewRow[] = rows.map((row) => {
    const candidates = candidateMap.get(norm(row.nomeOriginal)) ?? [];

    if (!candidates.length) {
      return {
        nomeOriginal: row.nomeOriginal,
        status: 'unmatched'
      };
    }

    if (candidates.length > 1) {
      return {
        nomeOriginal: row.nomeOriginal,
        status: 'ambiguous',
        candidatos: candidates.map((item) => item.nome)
      };
    }

    return {
      nomeOriginal: row.nomeOriginal,
      status: 'matched',
      produtoId: String(candidates[0].id),
      produtoNome: candidates[0].nome
    };
  });

  const matched = reviewRows.filter((item) => item.status === 'matched').length;
  const ambiguous = reviewRows.filter((item) => item.status === 'ambiguous').length;
  const unmatched = reviewRows.filter((item) => item.status === 'unmatched').length;

  return {
    total: reviewRows.length,
    matched,
    ambiguous,
    unmatched,
    blocking: ambiguous + unmatched,
    rows: reviewRows
  };
}

function buildProdutoUpdateInput(produto: Produto, categoria: string | null, precoLiq: number): ProdutoWriteInput {
  return {
    ...produto,
    cat: categoria || produto.cat || '',
    categoria: categoria || produto.categoria || produto.cat || '',
    custo: precoLiq,
    ecm: precoLiq
  };
}

export async function persistCotacaoImport(
  ctx: CotacaoApiContext,
  params: {
    forn: Fornecedor;
    draft: CotacaoMapaDraft;
    sheet: CotacaoSheet;
    produtos: Produto[];
    config: CotacaoConfig | null;
    onProgress: ProgressFn;
  }
) {
  const { forn, draft, sheet, produtos, config, onProgress } = params;
  const plan = buildCotacaoImportPlan(draft, sheet);
  const review = buildCotacaoImportMatchReview(plan.rows, produtos);
  const issues: ImportIssue[] = [];
  const stages: ImportStageResult[] = [];

  if (!plan.rows.length) {
    return {
      resumo: {
        ...plan.resumo,
        status: 'failed' as const,
        itensProblematicos: [],
        etapas: []
      },
      config: config ?? { filial_id: ctx.filialId, locked: false, logs: [] },
      created: 0,
      updated: 0
    };
  }

  if (review.blocking > 0) {
    return {
      resumo: {
        ...plan.resumo,
        status: 'failed' as const,
        falhas: plan.resumo.falhas + review.blocking,
        itensProblematicos: review.rows
          .filter((item) => item.status !== 'matched')
          .slice(0, 12)
          .map((item) => ({
            etapa: 'produtos' as const,
            nome: item.nomeOriginal,
            motivo:
              item.status === 'ambiguous'
                ? `Match ambíguo${item.candidatos?.length ? `: ${item.candidatos.join(', ')}` : ''}`
                : 'Produto não mapeado com segurança'
          })),
        etapas: [
          {
            id: 'produtos' as const,
            label: 'Produtos',
            status: 'failed' as const,
            processados: review.total,
            sucesso: review.matched,
            falhas: review.blocking
          }
        ]
      },
      config: config ?? { filial_id: ctx.filialId, locked: false, logs: [] },
      created: 0,
      updated: 0
    };
  }

  const produtosById = new Map(produtos.map((produto) => [String(produto.id), produto]));
  const uniqueRowsByName = new Map<string, ImportPlanRow>();
  for (const row of plan.rows) {
    uniqueRowsByName.set(norm(row.nomeOriginal), row);
  }
  const uniqueRows = Array.from(uniqueRowsByName.values());
  const matchedByName = new Map(
    review.rows
      .filter((item) => item.status === 'matched' && item.produtoId)
      .map((item) => [norm(item.nomeOriginal), String(item.produtoId)])
  );
  let created = 0;
  let updated = 0;
  let produtosFalhados = 0;

  onProgress(50, 'Atualizando produtos mapeados...');

  for (let i = 0; i < uniqueRows.length; i++) {
    const row = uniqueRows[i];
    const key = norm(row.nomeOriginal);
    const produtoId = matchedByName.get(key) ?? null;
    const existente = produtoId ? produtosById.get(produtoId) ?? null : null;
    const progress = 50 + Math.round(((i + 1) / uniqueRows.length) * 20);
    onProgress(progress, `Sincronizando produtos mapeados... (${i + 1}/${uniqueRows.length})`);

    if (!existente) continue;

    try {
      await saveProduto(ctx, buildProdutoUpdateInput(existente, row.categoria, row.precoLiq));
      updated++;
    } catch (error) {
      produtosFalhados++;
      issues.push({
        etapa: 'produtos',
        nome: row.nomeOriginal,
        motivo: error instanceof Error ? error.message : 'Falha ao atualizar produto'
      });
    }
  }

  stages.push({
    id: 'produtos',
    label: 'Produtos',
    status: produtosFalhados === 0 ? 'success' : created + updated > 0 ? 'partial' : 'failed',
    processados: uniqueRows.length,
    sucesso: created + updated,
    falhas: produtosFalhados
  });

  const cotPrecosByKey = new Map<string, CotacaoPrecoRecord>();
  const cotHistoricoByKey = new Map<string, CotacaoHistoricoRecord>();
  const historicoMarcado = new Set<string>();

  for (const row of uniqueRows) {
    const produtoId = matchedByName.get(norm(row.nomeOriginal));
    const produto = produtoId ? produtosById.get(produtoId) : null;
    if (!produto?.id) continue;

    const precoKey = `${ctx.filialId}|${produto.id}|${forn.id}`;
    cotPrecosByKey.set(precoKey, {
      filial_id: ctx.filialId,
      produto_id: produto.id,
      fornecedor_id: forn.id,
      preco: row.precoLiq
    });

    const histKey = `${ctx.filialId}|${produto.id}|${forn.id}|${draft.mes}`;
    if (!historicoMarcado.has(histKey)) {
      cotHistoricoByKey.set(histKey, {
        filial_id: ctx.filialId,
        produto_id: produto.id,
        fornecedor_id: forn.id,
        mes_ref: `${draft.mes}-01`,
        preco: row.precoLiq,
        tabela: row.precoTabela,
        desconto: row.percDesconto,
        descricao_importada: row.nomeOriginal,
        categoria_importada: row.categoria
      });
      historicoMarcado.add(histKey);
    }
  }

  const cotPrecosParaSalvar = Array.from(cotPrecosByKey.values());
  const cotHistoricoParaSalvar = Array.from(cotHistoricoByKey.values());

  stages.push(
    await persistChunked(
      cotPrecosParaSalvar,
      CHUNK_SIZE_PRECOS,
      (chunk) => upsertCotacaoPrecos(ctx, chunk),
      onProgress,
      75,
      10,
      'Salvando cotação atual',
      'cotacao_atual',
      issues
    )
  );

  stages.push(
    await persistChunked(
      cotHistoricoParaSalvar,
      CHUNK_SIZE_HISTORICO,
      (chunk) => upsertCotacaoHistorico(ctx, chunk),
      onProgress,
      85,
      7,
      'Salvando histórico',
      'historico',
      issues
    )
  );

  onProgress(93, 'Salvando layout...');
  let layoutStage: ImportStageResult = {
    id: 'layout',
    label: 'Layout',
    status: 'success',
    processados: 1,
    sucesso: 1,
    falhas: 0
  };
  try {
    await upsertCotacaoLayout(ctx, {
      filial_id: ctx.filialId,
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
  } catch (error) {
    layoutStage = {
      id: 'layout',
      label: 'Layout',
      status: 'failed',
      processados: 1,
      sucesso: 0,
      falhas: 1
    };
    issues.push({
      etapa: 'layout',
      nome: forn.nome,
      motivo: error instanceof Error ? error.message : 'Falha ao salvar layout'
    });
  }
  stages.push(layoutStage);

  onProgress(97, 'Atualizando log...');
  const novoLog: CotacaoLog = {
    arquivo: sheet.name,
    forn: forn.nome,
    mes: draft.mes,
    data: new Date().toLocaleDateString('pt-BR'),
    novos: created,
    atu: updated,
    falhas: plan.resumo.falhas
  };

  const nextConfig: CotacaoConfig = {
    filial_id: ctx.filialId,
    locked: config?.locked ?? false,
    logs: [novoLog, ...(config?.logs ?? []).slice(0, 19)]
  };
  let logStage: ImportStageResult = {
    id: 'log',
    label: 'Log',
    status: 'success',
    processados: 1,
    sucesso: 1,
    falhas: 0
  };
  try {
    await upsertCotacaoConfig(ctx, nextConfig);
  } catch (error) {
    logStage = {
      id: 'log',
      label: 'Log',
      status: 'failed',
      processados: 1,
      sucesso: 0,
      falhas: 1
    };
    issues.push({
      etapa: 'log',
      nome: forn.nome,
      motivo: error instanceof Error ? error.message : 'Falha ao atualizar log/config'
    });
  }
  stages.push(logStage);

  onProgress(100, 'Concluído!');
  const totalFailures =
    plan.resumo.falhas +
    produtosFalhados +
    stages.reduce((acc, stage) => acc + stage.falhas, 0);
  const totalSuccess = created + updated + stages.reduce((acc, stage) => acc + stage.sucesso, 0);
  const status: NonNullable<ImportResumo['status']> =
    totalFailures === 0 ? 'success' : totalSuccess > 0 ? 'partial' : 'failed';

  return {
    resumo: {
      ...plan.resumo,
      status,
      novos: created,
      atualizados: updated,
      falhas: totalFailures,
      itensProblematicos: issues.slice(0, 12),
      etapas: stages
    },
    config: nextConfig,
    created,
    updated
  };
}
