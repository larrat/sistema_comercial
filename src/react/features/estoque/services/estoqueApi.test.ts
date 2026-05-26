import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listMovimentacoes, insertMovimentacao, listAvarias, insertAvaria } from './estoqueApi';

const fetchMock = vi.fn<typeof fetch>();

describe('estoqueApi reforms and avarias extensions', () => {
  const ctx = {
    url: 'https://example.supabase.co',
    key: 'public-key',
    token: 'token-123',
    filialId: 'filial-1'
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('should list inventory movements correctly', async () => {
    const mockMovs = [
      { id: 'mov1', prod_id: 'p1', tipo: 'entrada', qty: 10, ts: Date.now() }
    ];
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(mockMovs), { status: 200 })
    );

    const result = await listMovimentacoes(ctx);
    expect(result).toEqual(mockMovs);
  });

  it('should insert a movement correctly', async () => {
    const mockMov = { id: 'mov1', prod_id: 'p1', tipo: 'entrada', qty: 5 };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([mockMov]), { status: 201 })
    );

    const result = await insertMovimentacao(ctx, {
      id: 'mov1',
      prod_id: 'p1',
      tipo: 'entrada',
      qty: 5
    });

    expect(result).toEqual(mockMov);
  });

  it('should list avarias correctly', async () => {
    const mockAvarias = [
      { id: 'av1', produto_id: 'p1', quantidade: 2, motivo: 'quebra', destino: 'descarte' }
    ];
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(mockAvarias), { status: 200 })
    );

    const result = await listAvarias(ctx);
    expect(result).toEqual(mockAvarias);
  });

  it('should insert an avaria and automatically trigger a stock markdown', async () => {
    const mockAvariaSaved = {
      id: 'av1',
      filial_id: 'filial-1',
      produto_id: 'p1',
      quantidade: 3,
      custo_unitario: 50,
      valor_custo_perda: 150,
      motivo: 'vencido',
      destino: 'descarte',
      observacoes: 'Produto fora da validade'
    };

    fetchMock.mockImplementation(async (url) => {
      if (url.toString().endsWith('/avarias')) {
        return new Response(JSON.stringify([mockAvariaSaved]), { status: 201 });
      }
      if (url.toString().endsWith('/movimentacoes')) {
        return new Response(JSON.stringify([{ id: 'mov-av1' }]), { status: 201 });
      }
      return new Response(null, { status: 404 });
    });

    const result = await insertAvaria(ctx, {
      filial_id: 'filial-1',
      produto_id: 'p1',
      quantidade: 3,
      custo_unitario: 50,
      motivo: 'vencido',
      destino: 'descarte',
      observacoes: 'Produto fora da validade'
    });

    expect(result).toEqual(mockAvariaSaved);

    // Expecting POST to /avarias with calculated valor_custo_perda
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/avarias',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"valor_custo_perda":150')
      })
    );

    // Expecting POST to /movimentacoes as a stock write-off ('saida')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/movimentacoes',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"tipo":"saida"')
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/movimentacoes',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"obs":"Avaria: vencido - Destino: descarte. Obs: Produto fora da validade"')
      })
    );
  });
});
