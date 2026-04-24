import type { Produto } from '../../../../types/domain';
import { listProdutos } from '../../produtos/services/produtosApi';
import type {
  CotacaoApiContext,
  CotacaoConfig,
  CotacaoHistoricoRecord,
  CotacaoInitialData,
  CotacaoLayout,
  CotacaoPrecoRecord,
  Fornecedor,
  PrecosMap
} from '../types';

function createHeaders(key: string, token: string, prefer?: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ensureOk(res: Response, body: unknown, fallback: string): void {
  if (res.ok) return;
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    throw new Error(body.message);
  }
  throw new Error(fallback);
}

function buildPrecosMap(records: CotacaoPrecoRecord[]): PrecosMap {
  return records.reduce<PrecosMap>((acc, record) => {
    if (!acc[record.produto_id]) acc[record.produto_id] = {};
    acc[record.produto_id][record.fornecedor_id] = Number(record.preco || 0);
    return acc;
  }, {});
}

export function buildCotacaoMetrics(
  produtos: Produto[],
  fornecedores: Fornecedor[],
  precos: PrecosMap
) {
  const total = produtos.length * fornecedores.length;
  const filled = produtos.reduce(
    (acc, produto) =>
      acc +
      fornecedores.filter((fornecedor) => {
        const value = precos[produto.id]?.[fornecedor.id];
        return value !== undefined && value > 0;
      }).length,
    0
  );
  const preenchimento = total > 0 ? Math.round((filled / total) * 100) : 0;

  const fornecedorTotals = fornecedores.map((fornecedor) => {
    const totalFornecedor = produtos.reduce(
      (acc, produto) => acc + (precos[produto.id]?.[fornecedor.id] || 0),
      0
    );
    return { fornecedor, total: totalFornecedor };
  });

  const melhorFornecedor =
    fornecedorTotals
      .filter((item) => item.total > 0)
      .sort((a, b) => a.total - b.total)[0]
      ?.fornecedor.nome || null;

  return {
    produtos: produtos.length,
    fornecedores: fornecedores.length,
    preenchimento,
    melhorFornecedor
  };
}

export function buildTabelaRows(
  produtos: Produto[],
  fornecedores: Fornecedor[],
  precos: PrecosMap
) {
  return produtos.map((produto) => {
    const prices = fornecedores
      .map((fornecedor) => {
        const value = precos[produto.id]?.[fornecedor.id];
        return value !== undefined && value > 0
          ? { fornecedorId: fornecedor.id, fornecedorNome: fornecedor.nome, value }
          : null;
      })
      .filter((item): item is { fornecedorId: string; fornecedorNome: string; value: number } => !!item);

    const sorted = [...prices].sort((a, b) => a.value - b.value);

    return {
      id: produto.id,
      produto: produto.nome,
      unidade: produto.unidade || produto.un || '',
      melhorPreco: sorted[0]?.value ?? null,
      piorPreco: sorted.length ? sorted[sorted.length - 1]?.value ?? null : null,
      melhorFornecedor: sorted[0]?.fornecedorNome ?? null
    };
  });
}

export function buildFornecedorRows(
  produtos: Produto[],
  fornecedores: Fornecedor[],
  precos: PrecosMap
) {
  return fornecedores.map((fornecedor) => {
    const produtosCotados = produtos.filter((produto) => {
      const value = precos[produto.id]?.[fornecedor.id];
      return value !== undefined && value > 0;
    }).length;
    const totalCotado = produtos.reduce(
      (acc, produto) => acc + (precos[produto.id]?.[fornecedor.id] || 0),
      0
    );

    return {
      id: fornecedor.id,
      nome: fornecedor.nome,
      contato: fornecedor.contato,
      prazo: fornecedor.prazo,
      produtosCotados,
      totalCotado
    };
  });
}

export function deriveCotacaoState(
  produtos: Produto[],
  fornecedores: Fornecedor[],
  precos: PrecosMap
) {
  return {
    metrics: buildCotacaoMetrics(produtos, fornecedores, precos),
    fornecedoresRows: buildFornecedorRows(produtos, fornecedores, precos),
    tabela: buildTabelaRows(produtos, fornecedores, precos)
  };
}

export async function listFornecedores(context: CotacaoApiContext): Promise<Fornecedor[]> {
  const url = `${context.url}/rest/v1/fornecedores?filial_id=eq.${encodeURIComponent(context.filialId)}&order=nome`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar fornecedores`);
  return Array.isArray(body) ? (body as Fornecedor[]) : [];
}

export async function getCotacaoPrecos(
  context: CotacaoApiContext
): Promise<CotacaoPrecoRecord[]> {
  const url = `${context.url}/rest/v1/cotacao_precos?filial_id=eq.${encodeURIComponent(context.filialId)}`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar preços de cotação`);
  return Array.isArray(body) ? (body as CotacaoPrecoRecord[]) : [];
}

export async function getCotacaoConfig(context: CotacaoApiContext): Promise<CotacaoConfig> {
  const url = `${context.url}/rest/v1/cotacao_config?filial_id=eq.${encodeURIComponent(context.filialId)}&limit=1`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar configuração da cotação`);
  const record = Array.isArray(body) ? body[0] : null;
  return (
    (record as CotacaoConfig | null) || {
      filial_id: context.filialId,
      locked: false,
      logs: []
    }
  );
}

export async function loadCotacaoInitialData(
  context: CotacaoApiContext
): Promise<CotacaoInitialData> {
  const [produtos, fornecedores, cotacaoPrecos, config] = await Promise.all([
    listProdutos(context),
    listFornecedores(context),
    getCotacaoPrecos(context),
    getCotacaoConfig(context)
  ]);

  const precos = buildPrecosMap(cotacaoPrecos);
  const derived = deriveCotacaoState(produtos, fornecedores, precos);

  return {
    produtos,
    fornecedores,
    precos,
    config,
    metrics: derived.metrics,
    fornecedoresRows: derived.fornecedoresRows,
    tabela: derived.tabela
  };
}

export async function upsertFornecedor(
  context: CotacaoApiContext,
  input: Fornecedor
): Promise<Fornecedor | null> {
  const res = await fetch(`${context.url}/rest/v1/fornecedores?on_conflict=id`, {
    method: 'POST',
    headers: createHeaders(context.key, context.token, 'resolution=merge-duplicates,return=representation'),
    body: JSON.stringify({ ...input, filial_id: context.filialId }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar fornecedor`);
  return Array.isArray(body) && body[0] ? (body[0] as Fornecedor) : null;
}

export async function deleteFornecedor(context: CotacaoApiContext, id: string): Promise<void> {
  const url = `${context.url}/rest/v1/fornecedores?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao remover fornecedor`);
}

export async function upsertCotacaoPrecos(
  context: CotacaoApiContext,
  items: CotacaoPrecoRecord[]
): Promise<void> {
  const res = await fetch(
    `${context.url}/rest/v1/cotacao_precos?on_conflict=filial_id,produto_id,fornecedor_id`,
    {
      method: 'POST',
      headers: createHeaders(context.key, context.token),
      body: JSON.stringify(items.map((item) => ({ ...item, filial_id: context.filialId }))),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar preços da cotação`);
}

export async function deleteCotacaoPreco(
  context: CotacaoApiContext,
  produtoId: string,
  fornecedorId: string
): Promise<void> {
  const url = `${context.url}/rest/v1/cotacao_precos?filial_id=eq.${encodeURIComponent(
    context.filialId
  )}&produto_id=eq.${encodeURIComponent(produtoId)}&fornecedor_id=eq.${encodeURIComponent(fornecedorId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao remover preço da cotação`);
}

export async function upsertCotacaoConfig(
  context: CotacaoApiContext,
  config: CotacaoConfig
): Promise<void> {
  const res = await fetch(
    `${context.url}/rest/v1/cotacao_config?on_conflict=filial_id`,
    {
      method: 'POST',
      headers: createHeaders(context.key, context.token),
      body: JSON.stringify({ ...config, filial_id: context.filialId }),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar configuração da cotação`);
}

export async function getCotacaoLayout(
  context: CotacaoApiContext,
  fornecedorId: string
): Promise<CotacaoLayout | null> {
  const url = `${context.url}/rest/v1/cotacao_layouts?filial_id=eq.${encodeURIComponent(
    context.filialId
  )}&fornecedor_id=eq.${encodeURIComponent(fornecedorId)}&limit=1`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar layout salvo`);
  return Array.isArray(body) && body[0] ? (body[0] as CotacaoLayout) : null;
}

export async function upsertCotacaoLayout(
  context: CotacaoApiContext,
  layout: Record<string, unknown>
): Promise<void> {
  const res = await fetch(
    `${context.url}/rest/v1/cotacao_layouts?on_conflict=filial_id,fornecedor_id`,
    {
      method: 'POST',
      headers: createHeaders(context.key, context.token),
      body: JSON.stringify({ ...layout, filial_id: context.filialId }),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar layout da cotação`);
}

export async function upsertCotacaoHistorico(
  context: CotacaoApiContext,
  items: CotacaoHistoricoRecord[]
): Promise<void> {
  const res = await fetch(
    `${context.url}/rest/v1/cotacao_historico?on_conflict=filial_id,produto_id,fornecedor_id,mes_ref`,
    {
      method: 'POST',
      headers: createHeaders(context.key, context.token),
      body: JSON.stringify(items.map((item) => ({ ...item, filial_id: context.filialId }))),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar histórico da cotação`);
}
