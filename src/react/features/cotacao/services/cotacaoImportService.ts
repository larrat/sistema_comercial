import { saveProduto } from '../../produtos/services/produtosApi';
import type { ProdutoWriteInput } from '../../produtos/types';
import type { Produto } from '../../../../types/domain';
import type {
  CotacaoApiContext,
  CotacaoConfig,
  CotacaoHistoricoRecord,
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

function buildProdutoCreateInput(
  ctx: CotacaoApiContext,
  nomeOriginal: string,
  categoria: string | null,
  precoLiq: number
): ProdutoWriteInput {
  return {
    id: crypto.randomUUID(),
    filial_id: ctx.filialId,
    nome: nomeOriginal,
    descricao_padrao: nomeOriginal,
    sku: '',
    un: 'un',
    unidade: 'un',
    cat: categoria || '',
    categoria: categoria || '',
    custo: precoLiq,
    mkv: 0,
    mka: 0,
    pfa: 0,
    pvv: 0,
    qtmin: 0,
    dv: 0,
    da: 0,
    emin: 0,
    esal: 0,
    ecm: precoLiq
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

  if (!plan.rows.length) {
    return {
      resumo: plan.resumo,
      config: config ?? { filial_id: ctx.filialId, locked: false, logs: [] },
      created: 0,
      updated: 0
    };
  }

  const produtosByName = new Map<string, Produto>();
  for (const produto of produtos) {
    produtosByName.set(norm(produto.nome), produto);
    if (produto.descricao_padrao) {
      produtosByName.set(norm(produto.descricao_padrao), produto);
    }
  }

  const createdByName = new Map<string, Produto>();
  const uniqueRowsByName = new Map<string, ImportPlanRow>();
  for (const row of plan.rows) {
    uniqueRowsByName.set(norm(row.nomeOriginal), row);
  }
  const uniqueRows = Array.from(uniqueRowsByName.values());
  let created = 0;
  let updated = 0;

  onProgress(50, 'Criando e atualizando produtos...');

  for (let i = 0; i < uniqueRows.length; i++) {
    const row = uniqueRows[i];
    const key = norm(row.nomeOriginal);
    const existente = produtosByName.get(key) ?? createdByName.get(key) ?? null;
    const progress = 50 + Math.round(((i + 1) / uniqueRows.length) * 20);
    onProgress(progress, `Sincronizando produtos... (${i + 1}/${uniqueRows.length})`);

    if (!existente) {
      const createdProduto = await saveProduto(
        ctx,
        buildProdutoCreateInput(ctx, row.nomeOriginal, row.categoria, row.precoLiq)
      );
      const produtoFinal =
        createdProduto ??
        ({
          ...buildProdutoCreateInput(ctx, row.nomeOriginal, row.categoria, row.precoLiq),
          id: crypto.randomUUID()
        } as Produto);
      createdByName.set(key, produtoFinal);
      produtosByName.set(key, produtoFinal);
      created++;
      continue;
    }

    await saveProduto(ctx, buildProdutoUpdateInput(existente, row.categoria, row.precoLiq));
    updated++;
  }

  const cotPrecosByKey = new Map<string, CotacaoPrecoRecord>();
  const cotHistoricoByKey = new Map<string, CotacaoHistoricoRecord>();
  const historicoMarcado = new Set<string>();

  for (const row of uniqueRows) {
    const produto = produtosByName.get(norm(row.nomeOriginal)) ?? createdByName.get(norm(row.nomeOriginal));
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

  onProgress(75, 'Salvando cotação atual...');
  await upsertCotacaoPrecos(ctx, cotPrecosParaSalvar);

  onProgress(85, 'Salvando histórico...');
  await upsertCotacaoHistorico(ctx, cotHistoricoParaSalvar);

  onProgress(92, 'Salvando layout...');
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
  await upsertCotacaoConfig(ctx, nextConfig);

  onProgress(100, 'Concluído!');
  return {
    resumo: {
      ...plan.resumo,
      novos: created,
      atualizados: updated
    },
    config: nextConfig,
    created,
    updated
  };
}
