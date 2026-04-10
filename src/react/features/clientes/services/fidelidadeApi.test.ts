import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addClienteFidelidadeLancamento,
  buildClienteFidelidadeLancamentosUrl,
  buildClienteFidelidadeSaldoUrl,
  getClienteFidelidadeSaldo,
  listClienteFidelidadeLancamentos
} from './fidelidadeApi';

const fetchMock = vi.fn<typeof fetch>();

describe('fidelidadeApi', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('monta urls de saldo e histórico', () => {
    expect(buildClienteFidelidadeSaldoUrl('https://example.supabase.co', 'cli 1/2')).toBe(
      'https://example.supabase.co/rest/v1/cliente_fidelidade_saldos?cliente_id=eq.cli%201%2F2&limit=1'
    );
    expect(buildClienteFidelidadeLancamentosUrl('https://example.supabase.co', 'cli 1/2')).toBe(
      'https://example.supabase.co/rest/v1/cliente_fidelidade_lancamentos?cliente_id=eq.cli%201%2F2&order=criado_em.desc'
    );
  });

  it('carrega saldo de fidelidade', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ cliente_id: '1', saldo_pontos: 120 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await getClienteFidelidadeSaldo(
      { url: 'https://example.supabase.co', key: 'public-key', token: 'token-1' },
      '1'
    );

    expect(result).toEqual({ cliente_id: '1', saldo_pontos: 120 });
  });

  it('carrega histórico de fidelidade', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ id: 'l1', cliente_id: '1', pontos: 80 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await listClienteFidelidadeLancamentos(
      { url: 'https://example.supabase.co', key: 'public-key', token: 'token-1' },
      '1'
    );

    expect(result).toEqual([{ id: 'l1', cliente_id: '1', pontos: 80 }]);
  });

  it('salva lançamento manual com filial ativa', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ id: 'l1', cliente_id: '1', pontos: 100 }]), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await addClienteFidelidadeLancamento(
      {
        url: 'https://example.supabase.co',
        key: 'public-key',
        token: 'token-1',
        filialId: 'filial-1'
      },
      {
        clienteId: '1',
        tipo: 'credito',
        pontos: 100,
        observacao: 'Bônus'
      }
    );

    expect(result).toEqual({ id: 'l1', cliente_id: '1', pontos: 100 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/cliente_fidelidade_lancamentos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          cliente_id: '1',
          filial_id: 'filial-1',
          tipo: 'credito',
          status: 'confirmado',
          pontos: 100,
          origem: 'manual',
          observacao: 'Bônus'
        })
      })
    );
  });

  it('falha ao salvar se não houver filial ativa', async () => {
    await expect(
      addClienteFidelidadeLancamento(
        { url: 'https://example.supabase.co', key: 'public-key', token: 'token-1', filialId: null },
        {
          clienteId: '1',
          tipo: 'credito',
          pontos: 100
        }
      )
    ).rejects.toThrow('Filial ativa não encontrada.');
  });
});
