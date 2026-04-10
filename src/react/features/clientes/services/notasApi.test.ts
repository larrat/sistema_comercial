import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addNota, buildListNotasUrl, listNotas } from './notasApi';

const fetchMock = vi.fn<typeof fetch>();

describe('notasApi', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('monta a url de listagem com cliente codificado', () => {
    expect(buildListNotasUrl('https://example.supabase.co', 'cli 1/2')).toBe(
      'https://example.supabase.co/rest/v1/notas?cliente_id=eq.cli%201%2F2&order=criado_em.desc'
    );
  });

  it('lista notas com os headers esperados', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([{ cliente_id: '1', texto: 'Primeira nota', data: '2026-04-10T10:00:00Z' }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const result = await listNotas(
      { url: 'https://example.supabase.co', key: 'public-key', token: 'token-1' },
      '1'
    );

    expect(result).toEqual([
      { cliente_id: '1', texto: 'Primeira nota', data: '2026-04-10T10:00:00Z' }
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/notas?cliente_id=eq.1&order=criado_em.desc',
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'public-key',
          Authorization: 'Bearer token-1'
        })
      })
    );
  });

  it('retorna lista vazia quando a resposta nao e array', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await listNotas(
      { url: 'https://example.supabase.co', key: 'public-key', token: 'token-1' },
      '1'
    );

    expect(result).toEqual([]);
  });

  it('propaga mensagem de erro do backend ao listar', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Falha ao listar notas' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await expect(
      listNotas({ url: 'https://example.supabase.co', key: 'public-key', token: 'token-1' }, '1')
    ).rejects.toThrow('Falha ao listar notas');
  });

  it('salva nota e retorna o registro persistido', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([{ cliente_id: '1', texto: 'Nova nota', data: '2026-04-10T10:00:00Z' }]),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const result = await addNota(
      { url: 'https://example.supabase.co', key: 'public-key', token: 'token-1' },
      { cliente_id: '1', texto: 'Nova nota', data: '2026-04-10T10:00:00Z' }
    );

    expect(result).toEqual({
      cliente_id: '1',
      texto: 'Nova nota',
      data: '2026-04-10T10:00:00Z'
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/notas',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          cliente_id: '1',
          texto: 'Nova nota',
          data: '2026-04-10T10:00:00Z'
        })
      })
    );
  });

  it('retorna a nota enviada quando o backend nao devolve linha', async () => {
    const nota = { cliente_id: '1', texto: 'Sem retorno', data: '2026-04-10T10:00:00Z' };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await addNota(
      { url: 'https://example.supabase.co', key: 'public-key', token: 'token-1' },
      nota
    );

    expect(result).toEqual(nota);
  });
});
