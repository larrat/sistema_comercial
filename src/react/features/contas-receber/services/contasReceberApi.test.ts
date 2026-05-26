import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registrarBaixaRpc, listContas, listBaixas } from './contasReceberApi';

const fetchMock = vi.fn<typeof fetch>();

describe('contasReceberApi integration tests', () => {
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

  it('should list contas correctly', async () => {
    const mockContas = [{ id: 'c1', cliente: 'Roberto', valor: 1000 }];
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(mockContas), { status: 200 })
    );

    const result = await listContas(ctx);
    expect(result).toEqual(mockContas);
  });

  it('should list baixas correctly', async () => {
    const mockBaixas = [{ id: 'b1', conta_receber_id: 'c1', valor: 1000 }];
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(mockBaixas), { status: 200 })
    );

    const result = await listBaixas(ctx);
    expect(result).toEqual(mockBaixas);
  });

  it('should register a baixa and automatically post a cash transacao', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url.toString().includes('rpc/rpc_registrar_baixa')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (url.toString().includes('contas_receber?id=eq.c1')) {
        return new Response(JSON.stringify([{ id: 'c1', cliente: 'Roberto Sales' }]), { status: 200 });
      }
      if (url.toString().includes('caixa_categorias')) {
        return new Response(JSON.stringify([{ id: 'cat-servico' }]), { status: 200 });
      }
      if (url.toString().includes('caixa_transacoes')) {
        return new Response(JSON.stringify([{ id: 1 }]), { status: 201 });
      }
      return new Response(null, { status: 404 });
    });

    await registrarBaixaRpc(ctx, {
      baixaId: 'b1',
      contaId: 'c1',
      valor: 1500,
      recebidoEm: '2026-05-26T12:00:00Z',
      observacao: 'Pagamento total'
    });

    // Expecting cash transaction post
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/caixa_transacoes',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"valor":1500')
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/caixa_transacoes',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"descricao":"Baixa de Conta a Receber #c1 - Cliente: Roberto Sales"')
      })
    );
  });
});
