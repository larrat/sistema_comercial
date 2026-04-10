import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClienteData } from './useClienteData';
import { useClienteStore } from '../store/useClienteStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import type { Cliente } from '../../../../types/domain';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

vi.mock('../../../app/supabaseConfig', () => ({
  getSupabaseConfig: vi.fn()
}));

const getSupabaseConfigMock = vi.mocked(getSupabaseConfig);

const CLIENTES: Cliente[] = [
  { id: '1', nome: 'Joao Silva', status: 'ativo', seg: 'Varejo' },
  { id: '2', nome: 'Maria Souza', status: 'prospecto', seg: 'Atacado' }
];

function resetStores() {
  useClienteStore.setState({
    clientes: [],
    status: 'idle',
    error: null,
    filtro: { q: '', seg: '', status: '' }
  });

  useAuthStore.setState({
    session: null,
    status: 'unknown'
  });

  useFilialStore.setState({
    filialId: null
  });
}

describe('useClienteData', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();

    if (typeof AbortSignal.timeout !== 'function') {
      Object.defineProperty(AbortSignal, 'timeout', {
        configurable: true,
        value: () => new AbortController().signal
      });
    }

    getSupabaseConfigMock.mockReturnValue({
      url: 'https://example.supabase.co',
      key: 'public-key',
      ready: true
    });

    vi.stubGlobal('fetch', vi.fn());
  });

  it('nao dispara fetch quando skip=true', () => {
    renderHook(() => useClienteData({ skip: true }));
    expect(fetch).not.toHaveBeenCalled();
    expect(useClienteStore.getState().status).toBe('idle');
  });

  it('marca erro quando sessao estiver ausente', async () => {
    useAuthStore.setState({ session: null, status: 'unauthenticated' });

    renderHook(() => useClienteData());

    await waitFor(() => {
      expect(useClienteStore.getState().status).toBe('error');
    });

    expect(useClienteStore.getState().error).toContain('Sessão expirada');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('marca erro quando filial estiver ausente', async () => {
    useAuthStore.setState({
      session: {
        access_token: 'token',
        refresh_token: '',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1,
        user: null
      },
      status: 'authenticated'
    });

    renderHook(() => useClienteData());

    await waitFor(() => {
      expect(useClienteStore.getState().status).toBe('error');
    });

    expect(useClienteStore.getState().error).toContain('Nenhuma filial selecionada');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('marca erro quando configuracao do Supabase estiver ausente', async () => {
    useAuthStore.setState({
      session: {
        access_token: 'token',
        refresh_token: '',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1,
        user: null
      },
      status: 'authenticated'
    });
    useFilialStore.setState({ filialId: 'filial-1' });
    getSupabaseConfigMock.mockReturnValue({ url: '', key: '', ready: false });

    renderHook(() => useClienteData());

    await waitFor(() => {
      expect(useClienteStore.getState().status).toBe('error');
    });

    expect(useClienteStore.getState().error).toContain('Configuração do Supabase ausente');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('carrega clientes e popula o store em caso de sucesso', async () => {
    useAuthStore.setState({
      session: {
        access_token: 'token',
        refresh_token: '',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1,
        user: null
      },
      status: 'authenticated'
    });
    useFilialStore.setState({ filialId: 'filial-1' });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(CLIENTES)
    } as Response);

    renderHook(() => useClienteData());

    await waitFor(() => {
      expect(useClienteStore.getState().status).toBe('ready');
    });

    expect(useClienteStore.getState().clientes).toEqual(CLIENTES);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('evita fetch duplo em StrictMode', async () => {
    useAuthStore.setState({
      session: {
        access_token: 'token',
        refresh_token: '',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1,
        user: null
      },
      status: 'authenticated'
    });
    useFilialStore.setState({ filialId: 'filial-1' });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(CLIENTES)
    } as Response);

    renderHook(() => useClienteData(), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    await waitFor(() => {
      expect(useClienteStore.getState().status).toBe('ready');
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('permite reload apos falha inicial', async () => {
    useAuthStore.setState({
      session: {
        access_token: 'token',
        refresh_token: '',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1,
        user: null
      },
      status: 'authenticated'
    });
    useFilialStore.setState({ filialId: 'filial-1' });

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Falhou no backend' })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(CLIENTES)
      } as Response);

    const { result } = renderHook(() => useClienteData());

    await waitFor(() => {
      expect(useClienteStore.getState().status).toBe('error');
    });

    expect(useClienteStore.getState().error).toBe('Falhou no backend');

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(useClienteStore.getState().status).toBe('ready');
    });

    expect(useClienteStore.getState().clientes).toEqual(CLIENTES);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
