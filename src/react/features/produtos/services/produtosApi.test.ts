import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildListProdutoCategoriasUrl,
  buildListProdutoPaisUrl,
  buildListProdutosPageUrl,
  deleteProduto,
  listProdutoCategorias,
  listProdutoPais,
  listProdutos,
  listProdutosPage,
  saveProduto
} from './produtosApi';
import type { Produto } from '../../../../types/domain';

const context = {
  url: 'https://example.supabase.co',
  key: 'public-key',
  token: 'user-token',
  filialId: 'filial-1'
};

const PRODUTO: Produto = {
  id: 'p1',
  filial_id: 'filial-1',
  nome: 'Arroz 5kg',
  un: 'un',
  custo: 20,
  mkv: 30,
  cat: 'Alimentos'
};

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body))
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());

  if (typeof AbortSignal.timeout !== 'function') {
    Object.defineProperty(AbortSignal, 'timeout', {
      configurable: true,
      value: () => new AbortController().signal
    });
  }
});

describe('listProdutos', () => {
  it('monta a URL com filial e order', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([]));
    await listProdutos(context);
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('filial_id=eq.filial-1');
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('order=nome');
  });

  it('retorna array de produtos', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([PRODUTO]));
    const result = await listProdutos(context);
    expect(result).toHaveLength(1);
    expect(result[0].nome).toBe('Arroz 5kg');
  });

  it('retorna array vazio quando resposta não é array', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(null));
    const result = await listProdutos(context);
    expect(result).toEqual([]);
  });

  it('lança erro com mensagem da API quando status não ok', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({ message: 'Acesso negado' }, 403)
    );
    await expect(listProdutos(context)).rejects.toThrow('Acesso negado');
  });

  it('lança erro genérico quando status não ok e sem mensagem', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({}, 500));
    await expect(listProdutos(context)).rejects.toThrow('Erro 500');
  });

  it('monta a URL paginada com busca e categoria server-side', () => {
    const url = buildListProdutosPageUrl(context.url, 'filial-1', {
      page: 2,
      pageSize: 20,
      q: 'arroz',
      cat: 'Alimentos'
    });
    expect(url).toContain('/rest/v1/produtos?filial_id=eq.filial-1&order=nome');
    expect(url).toContain('&and=');
    expect(url).toContain('&limit=20&offset=20');
  });

  it('monta a URL de categorias por filial', () => {
    expect(buildListProdutoCategoriasUrl(context.url, 'filial-1')).toBe(
      'https://example.supabase.co/rest/v1/produtos?filial_id=eq.filial-1&select=cat&order=cat'
    );
  });

  it('monta a URL de produtos-pai por filial', () => {
    expect(buildListProdutoPaisUrl(context.url, 'filial-1')).toBe(
      'https://example.supabase.co/rest/v1/produtos?filial_id=eq.filial-1&produto_pai_id=is.null&order=nome'
    );
  });

  it('lista produtos paginados com total', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-range': '20-39/42' }),
      text: () => Promise.resolve(JSON.stringify([PRODUTO]))
    } as Response);

    const result = await listProdutosPage(context, { page: 2, pageSize: 20, q: 'arroz' });

    expect(result).toEqual({
      rows: [PRODUTO],
      page: 2,
      pageSize: 20,
      total: 42,
      pageCount: 3
    });
  });

  it('lista categorias únicas do backend', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse([{ cat: 'Alimentos' }, { cat: 'Limpeza' }, { cat: 'Alimentos' }])
    );

    const result = await listProdutoCategorias(context);

    expect(result).toEqual(['Alimentos', 'Limpeza']);
  });

  it('lista produtos-pai do backend atual', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([PRODUTO]));
    const result = await listProdutoPais(context);
    expect(result).toEqual([PRODUTO]);
  });
});

describe('saveProduto', () => {
  it('faz POST com on_conflict=id e Prefer header', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([PRODUTO]));
    await saveProduto(context, PRODUTO);
    const [url, opts] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('on_conflict=id');
    expect((opts as RequestInit).method).toBe('POST');
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers['Prefer']).toContain('merge-duplicates');
  });

  it('retorna produto salvo da resposta da API', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([{ ...PRODUTO, custo: 25 }]));
    const result = await saveProduto(context, PRODUTO);
    expect(result?.custo).toBe(25);
  });

  it('retorna produto com id original quando API não retorna corpo', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(null));
    const result = await saveProduto(context, { ...PRODUTO, id: 'p1' });
    expect(result?.id).toBe('p1');
  });

  it('retorna null quando input não tem id e API não retorna corpo', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(null));
    const { id: _omit, ...semId } = PRODUTO;
    const result = await saveProduto(context, semId);
    expect(result).toBeNull();
  });

  it('lança erro quando API retorna status de erro', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ message: 'Conflito' }, 409));
    await expect(saveProduto(context, PRODUTO)).rejects.toThrow('Conflito');
  });
});

describe('deleteProduto', () => {
  it('faz DELETE com id codificado na URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(null, 204));
    await deleteProduto(context, 'p/1');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('id=eq.p%2F1');
    expect((vi.mocked(fetch).mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });

  it('resolve sem erro quando remoção é bem sucedida', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(null, 204));
    await expect(deleteProduto(context, 'p1')).resolves.toBeUndefined();
  });

  it('lança erro quando API retorna status de erro', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ message: 'Não encontrado' }, 404));
    await expect(deleteProduto(context, 'p1')).rejects.toThrow('Não encontrado');
  });
});
