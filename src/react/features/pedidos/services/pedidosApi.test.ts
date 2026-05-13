import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Pedido } from '../../../../types/domain';
import {
  adicionarPedidoItem,
  atualizarPedidoItem,
  buildListPedidosPageUrl,
  buildListPedidosSummaryUrl,
  getNextPedidoNumber,
  hydratePedidosWithNormalizedItens,
  listPedidosPage,
  listPedidosSummary,
  marcarPedidoEntregue,
  removerPedidoItem,
  savePedido
} from './pedidosApi';

const context = {
  url: 'https://example.supabase.co',
  key: 'public-key',
  token: 'user-token',
  filialId: 'filial-1'
};

const PEDIDO: Pedido = {
  id: 'p1',
  filial_id: 'filial-1',
  num: 42,
  cli: 'Mercado Central',
  cliente_id: 'c1',
  data: '2026-04-29',
  status: 'confirmado',
  pgto: 'pix',
  prazo: 'a_vista',
  tipo: 'varejo',
  itens: [],
  total: 125.5
};

function makeSaveInput(overrides: Partial<Parameters<typeof savePedido>[1]> = {}) {
  return {
    id: PEDIDO.id,
    filial_id: context.filialId,
    num: PEDIDO.num,
    cli: PEDIDO.cli,
    cliente_id: PEDIDO.cliente_id ?? null,
    rca_id: null,
    rca_nome: null,
    data: PEDIDO.data ?? '2026-04-29',
    status: PEDIDO.status,
    pgto: PEDIDO.pgto ?? 'pix',
    prazo: PEDIDO.prazo ?? 'a_vista',
    tipo: PEDIDO.tipo ?? 'varejo',
    obs: '',
    itens: [],
    total: PEDIDO.total,
    ...overrides
  };
}

function makeResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body))
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
  delete (window as any).__SC_PEDIDO_ITENS_DUAL_WRITE__;

  if (typeof AbortSignal.timeout !== 'function') {
    Object.defineProperty(AbortSignal, 'timeout', {
      configurable: true,
      value: () => new AbortController().signal
    });
  }
});

describe('pedidosApi server-side listagem', () => {
  it('monta URL paginada com filtros e ordenação', () => {
    const url = buildListPedidosPageUrl(context.url, context.filialId, {
      page: 3,
      pageSize: 20,
      q: '42',
      tab: 'emaberto',
      status: 'confirmado',
      pgto: 'pix',
      periodo: 'semana',
      sort: 'data_asc'
    });

    expect(url).toContain('/rest/v1/pedidos?');
    expect(url).toContain('filial_id=eq.filial-1');
    expect(url).toContain('order=data.asc%2Cnum.asc');
    expect(url).toContain('status=eq.confirmado');
    expect(url).toContain('pgto=eq.pix');
    expect(url).toContain('limit=20&offset=40');
  });

  it('inclui status legados na aba em aberto para pedidos anteriores a entrega/pagamento v2', () => {
    const url = decodeURIComponent(
      buildListPedidosPageUrl(context.url, context.filialId, {
        page: 1,
        pageSize: 20,
        tab: 'emaberto'
      })
    );

    expect(url).toContain('status=in.');
    expect(url).toContain('entregue_aguardando_pagamento');
    expect(url).toContain('pago_aguardando_entrega');
    expect(url).toContain('entregue');
    expect(url).toContain('pago');
  });

  it('monta URL de resumo enxuto da carteira', () => {
    expect(buildListPedidosSummaryUrl(context.url, context.filialId)).toBe(
      'https://example.supabase.co/rest/v1/pedidos?filial_id=eq.filial-1&select=status,total'
    );
  });

  it('calcula proximo numero de pedido via RPC atomica', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(43));

    await expect(getNextPedidoNumber(context)).resolves.toBe(43);

    expect(fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/next_pedido_num',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_filial_id: 'filial-1' })
      })
    );
  });

  it('mantem fallback legado de numero quando RPC atomica nao existe', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse({ message: 'function not found' }, 404))
      .mockResolvedValueOnce(makeResponse([{ num: 42 }]));

    await expect(getNextPedidoNumber(context)).resolves.toBe(43);

    expect(String(vi.mocked(fetch).mock.calls[1]?.[0])).toContain('/rest/v1/pedidos?');
    warn.mockRestore();
  });

  it('lista página atual com total', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse([PEDIDO], 200, { 'content-range': '20-39/64' })
    );

    const result = await listPedidosPage(context, { page: 2, pageSize: 20, tab: 'emaberto' });

    expect(result).toEqual({
      rows: [PEDIDO],
      page: 2,
      pageSize: 20,
      total: 64,
      pageCount: 4
    });
  });

  it('prefere pedido_itens normalizado quando existe', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse([
        {
          pedido_id: 'p1',
          produto_id: 'prod-1',
          nome: 'Camisa',
          un: 'un',
          qty: '2',
          preco: '50',
          custo: '30',
          orig: 'manual',
          item: {}
        }
      ])
    );

    const result = await hydratePedidosWithNormalizedItens(context, [
      { ...PEDIDO, itens: JSON.stringify([{ prodId: 'legacy', nome: 'Legado' }]) }
    ]);

    expect(result[0]?.itens).toEqual([
      {
        prodId: 'prod-1',
        nome: 'Camisa',
        un: 'un',
        qty: 2,
        preco: 50,
        custo: 30,
        custo_base: undefined,
        preco_base: undefined,
        orig: 'manual'
      }
    ]);
  });

  it('mantem agregado legado quando pedido_itens nao esta disponivel', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('relation does not exist'));

    const result = await hydratePedidosWithNormalizedItens(context, [
      {
        ...PEDIDO,
        itens: JSON.stringify([{ prodId: 'legacy', nome: 'Legado', qty: 1, preco: 10, custo: 5 }])
      }
    ]);

    expect(result[0]?.itens).toEqual([
      { prodId: 'legacy', nome: 'Legado', qty: 1, preco: 10, custo: 5 }
    ]);
  });

  it('agrega resumo financeiro sem carregar pedido completo', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse([
        { status: 'orcamento', total: 100 },
        { status: 'confirmado', total: 50 },
        { status: 'entregue', total: 80 },
        { status: 'cancelado', total: 20 }
      ])
    );

    await expect(listPedidosSummary(context)).resolves.toEqual({
      total: 4,
      emAbertoCount: 3,
      valorEmAberto: 230,
      entreguesCount: 0,
      canceladosCount: 1
    });
  });

  it('salva PDV apenas no agregado quando dual-write esta desligado', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(null));

    await expect(
      savePedido(
        context,
        makeSaveInput({
          itens: [
            {
              prodId: 'prod-1',
              nome: 'Camisa',
              un: 'un',
              qty: 1,
              preco: 50,
              custo: 30,
              orig: 'pdv'
            }
          ],
          origem_venda: 'pdv'
        })
      )
    ).resolves.toBeNull();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain('/rest/v1/pedidos');
  });

  it('faz dual-write do PDV em pedido_itens quando flag esta ligada', async () => {
    (window as any).__SC_PEDIDO_ITENS_DUAL_WRITE__ = true;
    vi.mocked(fetch).mockResolvedValue(makeResponse(null));

    await expect(
      savePedido(
        context,
        makeSaveInput({
          itens: [
            {
              prodId: 'prod-1',
              nome: 'Camisa',
              un: 'un',
              qty: 2,
              preco: 50,
              custo: 30,
              orig: 'pdv'
            }
          ],
          origem_venda: 'pdv'
        })
      )
    ).resolves.toBeNull();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain('/rest/v1/pedidos');
    expect(String(vi.mocked(fetch).mock.calls[1]?.[0])).toBe(
      'https://example.supabase.co/rest/v1/pedido_itens'
    );

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[1]?.[1]?.body));
    expect(body).toEqual([
      {
        id: 'p1:1',
        filial_id: 'filial-1',
        pedido_id: 'p1',
        produto_id: 'prod-1',
        linha: 1,
        nome: 'Camisa',
        un: 'un',
        qty: 2,
        preco: 50,
        custo: 30,
        custo_base: null,
        preco_base: null,
        orig: 'pdv',
        item: {
          prodId: 'prod-1',
          nome: 'Camisa',
          un: 'un',
          qty: 2,
          preco: 50,
          custo: 30,
          orig: 'pdv'
        }
      }
    ]);
  });

  it('nao bloqueia venda PDV se dual-write normalizado falhar', async () => {
    (window as any).__SC_PEDIDO_ITENS_DUAL_WRITE__ = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(null))
      .mockResolvedValueOnce(makeResponse({ message: 'pedido_itens indisponivel' }, 500));

    await expect(
      savePedido(
        context,
        makeSaveInput({
          itens: [
            {
              prodId: 'prod-1',
              nome: 'Camisa',
              un: 'un',
              qty: 1,
              preco: 50,
              custo: 30,
              orig: 'pdv'
            }
          ],
          origem_venda: 'pdv'
        })
      )
    ).resolves.toBeNull();

    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('confirma entrega via RPC e retorna pedido normalizado', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({
        ...PEDIDO,
        status: 'concluido',
        entregue_em: '2026-05-10T10:00:00Z',
        itens: JSON.stringify([{ prodId: 'prod-1', nome: 'Camisa', qty: 1, preco: 50, custo: 30 }])
      })
    );

    const result = await marcarPedidoEntregue(context, 'p1');

    expect(fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/pedido_marcar_entregue',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_pedido_id: 'p1' })
      })
    );
    expect(result.status).toBe('concluido');
    expect(result.itens).toEqual([
      { prodId: 'prod-1', nome: 'Camisa', qty: 1, preco: 50, custo: 30 }
    ]);
  });

  it('atualiza item de pedido via RPC e normaliza retorno', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({
        ...PEDIDO,
        total: 100,
        itens: JSON.stringify([
          { item_id: 'p1:1', prodId: 'prod-1', nome: 'Camisa', qty: 2, preco: 50, custo: 30 }
        ])
      })
    );

    const result = await atualizarPedidoItem(context, 'p1', 'p1:1', {
      quantidade: 2,
      precoUnitario: 50
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/pedido_item_atualizar',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          p_pedido_id: 'p1',
          p_item_id: 'p1:1',
          p_quantidade: 2,
          p_preco_unitario: 50
        })
      })
    );
    expect(result.total).toBe(100);
    expect(result.itens).toEqual([
      { item_id: 'p1:1', prodId: 'prod-1', nome: 'Camisa', qty: 2, preco: 50, custo: 30 }
    ]);
  });

  it('remove item de pedido via RPC', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ ...PEDIDO, itens: [] }));

    await removerPedidoItem(context, 'p1', 'p1:1');

    expect(fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/pedido_item_remover',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_pedido_id: 'p1', p_item_id: 'p1:1' })
      })
    );
  });

  it('adiciona item de pedido via RPC usando produto, quantidade e preço', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ ...PEDIDO, itens: [] }));

    await adicionarPedidoItem(context, 'p1', { prodId: 'prod-2', qty: 1, preco: 25 });

    expect(fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/pedido_item_adicionar',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          p_pedido_id: 'p1',
          p_produto_id: 'prod-2',
          p_quantidade: 1,
          p_preco_unitario: 25
        })
      })
    );
  });
});
