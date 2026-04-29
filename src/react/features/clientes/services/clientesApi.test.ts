import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDeleteClienteUrl,
  buildListClientesFilteredUrl,
  buildListClientesPageUrl,
  buildListClienteSegmentosUrl,
  buildListClientesUrl,
  deleteCliente,
  listClienteSegmentos,
  listClientesFiltered,
  listClientesPage,
  listClientes,
  saveCliente,
  toClienteWritePayload
} from './clientesApi';
import type { Cliente } from '../../../../types/domain';

const context = {
  url: 'https://example.supabase.co',
  key: 'public-key',
  token: 'user-token',
  filialId: 'filial-1'
};

const CLIENTE: Cliente = {
  id: '1',
  filial_id: 'filial-1',
  nome: 'Maria Souza',
  status: 'ativo',
  seg: 'Varejo'
};

describe('clientesApi', () => {
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

  it('monta a URL de listagem com filial e ordenacao', () => {
    expect(buildListClientesUrl(context.url, 'Filial Especial')).toBe(
      'https://example.supabase.co/rest/v1/clientes?filial_id=eq.Filial%20Especial&order=nome'
    );
  });

  it('monta a URL de listagem paginada com filtros server-side', () => {
    const url = buildListClientesPageUrl(context.url, 'filial-1', {
      page: 2,
      pageSize: 20,
      q: 'maria',
      seg: 'Varejo',
      status: 'ativo'
    });
    expect(url).toContain('/rest/v1/clientes?filial_id=eq.filial-1&order=nome&status=eq.ativo');
    expect(url).toContain('&and=');
    expect(url).toContain('&limit=20&offset=20');
  });

  it('monta a URL de listagem filtrada sem paginação para exportação/superfícies auxiliares', () => {
    const url = buildListClientesFilteredUrl(context.url, 'filial-1', { q: 'maria' });
    expect(url).toContain('/rest/v1/clientes?filial_id=eq.filial-1&order=nome');
    expect(url).toContain('&and=');
  });

  it('monta a URL de segmentos por filial', () => {
    expect(buildListClienteSegmentosUrl(context.url, 'filial-1')).toBe(
      'https://example.supabase.co/rest/v1/clientes?filial_id=eq.filial-1&select=seg&order=seg'
    );
  });

  it('monta a URL de exclusao com id codificado', () => {
    expect(buildDeleteClienteUrl(context.url, 'cli/1')).toBe(
      'https://example.supabase.co/rest/v1/clientes?id=eq.cli%2F1'
    );
  });

  it('normaliza o payload de escrita no padrao esperado pelo banco', () => {
    expect(
      toClienteWritePayload(
        {
          nome: '  Maria Souza  ',
          email: 'maria@a.com',
          optin_marketing: true
        },
        'filial-1'
      )
    ).toEqual({
      id: undefined,
      filial_id: 'filial-1',
      nome: 'Maria Souza',
      rca_id: null,
      rca_nome: null,
      apelido: '',
      doc: '',
      tipo: 'PJ',
      status: 'ativo',
      tel: '',
      whatsapp: '',
      email: 'maria@a.com',
      data_aniversario: '',
      time: '',
      resp: '',
      seg: '',
      tab: 'padrao',
      prazo: 'a_vista',
      cidade: '',
      estado: '',
      obs: '',
      optin_marketing: true,
      optin_email: false,
      optin_sms: false
    });
  });

  it('lista clientes usando o contrato do Supabase atual', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([CLIENTE])
    } as Response);

    const result = await listClientes(context);

    expect(result).toEqual([CLIENTE]);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/clientes?filial_id=eq.filial-1&order=nome',
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'public-key',
          Authorization: 'Bearer user-token'
        })
      })
    );
  });

  it('lista clientes com paginação server-side e devolve total', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-range': '20-39/42' }),
      text: async () => JSON.stringify([CLIENTE])
    } as Response);

    const result = await listClientesPage(context, { page: 2, pageSize: 20, q: 'maria' });

    expect(result).toEqual({
      rows: [CLIENTE],
      page: 2,
      pageSize: 20,
      total: 42,
      pageCount: 3
    });
  });

  it('lista clientes filtrados sem paginação quando a superfície precisa do conjunto completo', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([CLIENTE])
    } as Response);

    const result = await listClientesFiltered(context, { status: 'ativo' });

    expect(result).toEqual([CLIENTE]);
  });

  it('lista segmentos únicos a partir do backend atual', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([{ seg: 'Varejo' }, { seg: 'Atacado' }, { seg: 'Varejo' }])
    } as Response);

    const result = await listClienteSegmentos(context);

    expect(result).toEqual(['Atacado', 'Varejo']);
  });

  it('propaga a mensagem de erro do backend na leitura', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({ message: 'Cliente duplicado' })
    } as Response);

    await expect(listClientes(context)).rejects.toThrow('Cliente duplicado');
  });

  it('salva cliente com upsert e Prefer compatível com o legado', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([CLIENTE])
    } as Response);

    const result = await saveCliente(context, { nome: 'Maria Souza', email: 'maria@a.com' });

    expect(result).toEqual(CLIENTE);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/clientes?on_conflict=id',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Prefer: 'resolution=merge-duplicates,return=representation'
        })
      })
    );
    const [, request] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(request).toBeTruthy();
    expect(JSON.parse(String(request?.body))).toEqual(
      expect.objectContaining({
        filial_id: 'filial-1',
        nome: 'Maria Souza',
        email: 'maria@a.com'
      })
    );
  });

  it('remove cliente usando delete por id', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => ''
    } as Response);

    await deleteCliente(context, 'cliente-1');

    expect(fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/clientes?id=eq.cliente-1',
      expect.objectContaining({
        method: 'DELETE'
      })
    );
  });
});
