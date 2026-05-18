import type { MovimentoEstoque, Produto } from '../../../../types/domain';
import type { ProdutoWriteInput } from '../types';
import { logAudit } from '../../../shared/services/auditService';

export type ProdutoApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};
export type ProdutoListFilters = {
  q?: string;
  cat?: string;
  includeVariants?: boolean;
};
export type ProdutoListPageQuery = ProdutoListFilters & {
  page?: number;
  pageSize?: number;
};
export type ProdutoListPageResult = {
  rows: Produto[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

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

export async function listProdutos(context: ProdutoApiContext): Promise<Produto[]> {
  console.log('[produtosApi] listProdutos calling...', context.filialId);
  const url = `${context.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(context.filialId)}&is_active=eq.true&order=nome`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  console.log(
    '[produtosApi] listProdutos body length:',
    Array.isArray(body) ? body.length : 'not array'
  );
  ensureOk(res, body, `Erro ${res.status} ao carregar produtos`);
  return Array.isArray(body) ? (body as Produto[]) : [];
}

function createProdutoQueryParams(
  filialId: string,
  filters: ProdutoListFilters,
  options?: { page?: number; pageSize?: number }
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${filialId}`);
  params.set('is_active', 'eq.true');
  params.set('order', 'nome');
  params.set('select', '*,variantes:produtos!produto_pai_id(id,nome,sku,esal,emin,custo,mkv,mka,pfa,tamanho,cor,genero,is_active)');
  const conditions: string[] = [];
  if (!filters.includeVariants && !filters.q) {
    conditions.push('produto_pai_id.is.null');
  }

  const cat = String(filters.cat || '').trim();
  if (cat) {
    conditions.push(`cat.eq.${cat}`);
  }

  const q = String(filters.q || '').trim();
  if (q) {
    const pattern = `%${q.replace(/%/g, '').replace(/,/g, ' ')}%`;
    conditions.push(`or(nome.ilike.${pattern},sku.ilike.${pattern},cat.ilike.${pattern})`);
  }

  if (conditions.length) {
    params.set('and', `(${conditions.join(',')})`);
  }

  if (options?.page && options?.pageSize) {
    params.set('limit', String(options.pageSize));
    params.set('offset', String((options.page - 1) * options.pageSize));
  }

  return params;
}

function parseTotalFromContentRange(contentRange: string | null): number {
  if (!contentRange) return 0;
  const [, totalPart] = contentRange.split('/');
  const total = Number(totalPart);
  return Number.isFinite(total) ? total : 0;
}

export function buildListProdutosPageUrl(
  url: string,
  filialId: string,
  query: ProdutoListPageQuery
): string {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const params = createProdutoQueryParams(filialId, query, { page, pageSize });
  return `${url}/rest/v1/produtos?${params.toString()}`;
}

export function buildListProdutoCategoriasUrl(url: string, filialId: string): string {
  return `${url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(filialId)}&select=cat&order=cat`;
}

export function buildListProdutoPaisUrl(url: string, filialId: string): string {
  return `${url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(filialId)}&produto_pai_id=is.null&is_active=eq.true&order=nome`;
}

export function buildProdutoByIdUrl(url: string, filialId: string, produtoId: string): string {
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${filialId}`);
  params.set('id', `eq.${produtoId}`);
  params.set('limit', '1');
  return `${url}/rest/v1/produtos?${params.toString()}`;
}

export async function listProdutosPage(
  context: ProdutoApiContext,
  query: ProdutoListPageQuery = {}
): Promise<ProdutoListPageResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const res = await fetch(buildListProdutosPageUrl(context.url, context.filialId, query), {
    headers: createHeaders(context.key, context.token, 'count=exact'),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar produtos`);
  const rows = Array.isArray(body) ? (body as Produto[]) : [];
  const total = parseTotalFromContentRange(res.headers.get('content-range'));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { rows, page, pageSize, total, pageCount };
}

export async function listProdutoCategorias(context: ProdutoApiContext): Promise<string[]> {
  const res = await fetch(buildListProdutoCategoriasUrl(context.url, context.filialId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar categorias`);
  if (!Array.isArray(body)) return [];
  return [
    ...new Set(
      body.map((item) => String((item as { cat?: string }).cat || '').trim()).filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));
}

export async function listProdutoPais(context: ProdutoApiContext): Promise<Produto[]> {
  const res = await fetch(buildListProdutoPaisUrl(context.url, context.filialId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar produtos-pai`);
  return Array.isArray(body) ? (body as Produto[]) : [];
}

export async function listProdutoById(
  context: ProdutoApiContext,
  produtoId: string
): Promise<Produto | null> {
  const res = await fetch(buildProdutoByIdUrl(context.url, context.filialId, produtoId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar produto`);
  return Array.isArray(body) && body[0] ? (body[0] as Produto) : null;
}

export async function saveProduto(
  context: ProdutoApiContext,
  input: ProdutoWriteInput | ProdutoWriteInput[]
): Promise<Produto | Produto[] | null> {
  const isArray = Array.isArray(input);
  const inputs = isArray ? input : [input];

  // Inteligência de Auto-Vínculo: Tenta encontrar o pai pelo nome se não houver um ID definido
  const processedInputs = await Promise.all(
    inputs.map(async (item) => {
      const newItem = { ...item, filial_id: context.filialId };

      if (!newItem.produto_pai_id) {
        try {
          // Busca um potencial pai: nome curto que é prefixo do nome atual
          // Ex: "CAMISA" é pai de "CAMISA BRASIL"
          const q = encodeURIComponent(String(newItem.nome || '').trim());
          if (q.length > 3) {
            const url = `${context.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(context.filialId)}&produto_pai_id=is.null&order=nome.desc`;
            const res = await fetch(url, {
              headers: createHeaders(context.key, context.token),
              signal: AbortSignal.timeout(5000)
            });
            const potentialParents = (await readJson(res)) as Produto[];

            if (Array.isArray(potentialParents)) {
              // Encontrar o pai com o nome mais longo que ainda seja um prefixo (o mais específico)
              const bestParent = potentialParents
                .filter((p) => p.id !== newItem.id && newItem.nome?.startsWith(p.nome))
                .sort((a, b) => b.nome.length - a.nome.length)[0];

              if (bestParent) {
                newItem.produto_pai_id = bestParent.id;
              }
            }
          }
        } catch (e) {
          console.warn('[produtos] Falha no auto-vínculo inteligente:', e);
        }
      }
      return newItem;
    })
  );

  const payload = isArray ? processedInputs : processedInputs[0];

  const res = await fetch(`${context.url}/rest/v1/produtos?on_conflict=id`, {
    method: 'POST',
    headers: createHeaders(
      context.key,
      context.token,
      'return=representation,resolution=merge-duplicates'
    ),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar produto(s)`);

  if (Array.isArray(body)) {
    // Registrar Auditoria
    processedInputs.forEach((input) => {
      const isNew = !input.id || !inputs.find((i) => i.id === input.id);
      logAudit(context.token, 'produto', input.id || 'new', isNew ? 'INSERT' : 'UPDATE', input);
    });
    return isArray ? (body as Produto[]) : (body[0] as Produto);
  }

  return isArray ? [] : null;
}

export async function cascadeRenameProduto(
  context: ProdutoApiContext,
  produtoId: string,
  novoNome: string,
  antigoNome: string
): Promise<void> {
  // 1. Atualizar na tabela normalizada de itens para o próprio produto
  const resItens = await fetch(
    `${context.url}/rest/v1/pedido_itens?produto_id=eq.${encodeURIComponent(produtoId)}&filial_id=eq.${encodeURIComponent(context.filialId)}`,
    {
      method: 'PATCH',
      headers: createHeaders(context.key, context.token),
      body: JSON.stringify({ nome: novoNome }),
      signal: AbortSignal.timeout(20000)
    }
  );

  if (!resItens.ok) {
    const body = await readJson(resItens);
    console.warn('[produtos] Falha ao atualizar nomes em pedido_itens:', body);
  }

  // 2. Propagar para Variantes (Filhos)
  // Buscamos as variantes para atualizar seus nomes também
  try {
    const variantes = await listVariantesByPaiId(context, produtoId);
    if (variantes.length > 0) {
      const updates: Produto[] = [];
      
      for (const v of variantes) {
        let varianteAlterada = false;
        let novoNomeVariante = v.nome;

        // Tratamento case-insensitive para o prefixo
        const nomeVarianteUpper = v.nome.toUpperCase();
        const antigoNomeUpper = antigoNome.trim().toUpperCase();

        if (nomeVarianteUpper.startsWith(antigoNomeUpper)) {
          novoNomeVariante = novoNome + v.nome.substring(antigoNome.trim().length);
          varianteAlterada = true;
        } else if (v.nome.includes(' - ')) {
          // Fallback: as variantes são geradas com ' - ' separando o nome do pai das opções
          const parts = v.nome.split(' - ');
          parts[0] = novoNome;
          novoNomeVariante = parts.join(' - ');
          varianteAlterada = true;
        }

        if (varianteAlterada) {
          updates.push({ ...v, nome: novoNomeVariante });
          
          // Atualizar histórico de vendas da variante individualmente (PostgREST PATCH)
          fetch(
            `${context.url}/rest/v1/pedido_itens?produto_id=eq.${encodeURIComponent(v.id)}&filial_id=eq.${encodeURIComponent(context.filialId)}`,
            {
              method: 'PATCH',
              headers: createHeaders(context.key, context.token),
              body: JSON.stringify({ nome: novoNomeVariante }),
              signal: AbortSignal.timeout(10000)
            }
          ).catch(e => console.warn(`[produtos] Falha ao atualizar histórico da variante ${v.id}:`, e));
        }
      }

      // Atualizar nomes das variantes na tabela de produtos em lote
      if (updates.length > 0) {
        await saveProduto(context, updates as any);
      }
    }
  } catch (e) {
    console.error('[produtos] Erro ao processar cascata de nomes para variantes:', e);
  }

  // Nota: A atualização do campo legado 'pedidos.itens' (JSON) exigiria um processamento pesado no cliente
  // ou uma RPC no banco. Como o sistema já prioriza a leitura de pedido_itens e faz o vínculo vivo
  // via produto_id no Dashboard, o histórico já refletirá o novo nome na maioria das telas.
}

export async function cascadeUpdateFilhos(
  context: ProdutoApiContext,
  paiId: string,
  data: Partial<Produto>
): Promise<void> {
  const res = await fetch(
    `${context.url}/rest/v1/produtos?produto_pai_id=eq.${encodeURIComponent(paiId)}&filial_id=eq.${encodeURIComponent(context.filialId)}`,
    {
      method: 'PATCH',
      headers: createHeaders(context.key, context.token),
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(20000)
    }
  );

  if (!res.ok) {
    const body = await readJson(res);
    console.warn('[produtos] Falha ao propagar atualização para filhos:', body);
  }
}

export async function deleteProduto(context: ProdutoApiContext, produtoId: string): Promise<void> {
  const url = `${context.url}/rest/v1/produtos?id=eq.${encodeURIComponent(produtoId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: createHeaders(context.key, context.token),
    body: JSON.stringify({
      is_active: false,
      deleted_at: new Date().toISOString()
    }),
    signal: AbortSignal.timeout(20000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao remover produto`);
  logAudit(context.token, 'produto', produtoId, 'SOFT_DELETE');
}

export async function listVariantesByPaiId(
  context: ProdutoApiContext,
  paiId: string
): Promise<Produto[]> {
  const url = `${context.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(context.filialId)}&produto_pai_id=eq.${encodeURIComponent(paiId)}&is_active=eq.true&order=nome`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar variantes`);
  return Array.isArray(body) ? (body as Produto[]) : [];
}

export async function listMovimentacoesByProdutoIds(
  context: ProdutoApiContext,
  produtoIds: string[]
): Promise<MovimentoEstoque[]> {
  if (!produtoIds.length) return [];
  const ids = produtoIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',');
  const url = `${context.url}/rest/v1/movimentacoes?filial_id=eq.${encodeURIComponent(context.filialId)}&prod_id=in.(${ids})&order=ts.asc`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar movimentações das variantes`);
  return Array.isArray(body) ? (body as MovimentoEstoque[]) : [];
}

export type VendaVarianteRow = {
  produto_id: string;
  qty: number;
  preco: number;
  criado_em: string;
  pedido_data?: string | null;
  pedido_status?: string | null;
};

export async function listPedidoItensByProdutoIds(
  context: ProdutoApiContext,
  produtoIds: string[],
  fromDate?: string,
  toDate?: string
): Promise<VendaVarianteRow[]> {
  if (!produtoIds.length) return [];
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${context.filialId}`);
  params.set(
    'produto_id',
    `in.(${produtoIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',')})`
  );
  params.set('select', 'produto_id,qty,preco,criado_em,pedidos!inner(data,status)');
  if (fromDate) params.append('criado_em', `gte.${fromDate}`);
  if (toDate) params.append('criado_em', `lte.${toDate}`);
  params.set('pedidos.status', 'not.eq.cancelado');
  const url = `${context.url}/rest/v1/pedido_itens?${params.toString()}`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(15000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar vendas das variantes`);
  if (!Array.isArray(body)) return [];
  return body.map((row) => {
    const item = row as VendaVarianteRow & { pedidos?: { data?: string; status?: string } | null };
    return {
      produto_id: item.produto_id,
      qty: item.qty,
      preco: item.preco,
      criado_em: item.criado_em,
      pedido_data: item.pedidos?.data ?? null,
      pedido_status: item.pedidos?.status ?? null
    };
  });
}
