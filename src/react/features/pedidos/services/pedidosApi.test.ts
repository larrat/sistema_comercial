import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Pedido } from '../../../../types/domain';
import {
  buildListPedidosPageUrl,
  buildListPedidosSummaryUrl,
  listPedidosPage,
  listPedidosSummary
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

  it('monta URL de resumo enxuto da carteira', () => {
    expect(buildListPedidosSummaryUrl(context.url, context.filialId)).toBe(
      'https://example.supabase.co/rest/v1/pedidos?filial_id=eq.filial-1&select=status,total'
    );
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
      emAbertoCount: 2,
      valorEmAberto: 150,
      entreguesCount: 1,
      canceladosCount: 1
    });
  });
});
