import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePedidosQuery, usePedidoQuery } from './usePedidosQuery';
import * as pedidosApi from '../services/pedidosApi';

// Mock dependencies
vi.mock('../services/pedidosApi', () => ({
  listPedidosPage: vi.fn(),
  getPedidoById: vi.fn(),
}));

vi.mock('../../../shared/hooks/useApiContext', () => ({
  useApiContext: () => ({
    resolve: () => ({
      url: 'http://localhost',
      key: 'test-key',
      token: 'test-token',
      filialId: 'test-filial'
    })
  })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePedidosQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar lista de pedidos', async () => {
    const mockData = { rows: [], total: 0, page: 1, pageSize: 20, pageCount: 0 };
    vi.mocked(pedidosApi.listPedidosPage).mockResolvedValue(mockData);

    const { result } = renderHook(() => usePedidosQuery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(pedidosApi.listPedidosPage).toHaveBeenCalled();
  });

  it('deve buscar um pedido por ID', async () => {
    const mockPedido = { id: '123', num: 1, cli: 'Cliente Teste' };
    vi.mocked(pedidosApi.getPedidoById).mockResolvedValue(mockPedido as any);

    const { result } = renderHook(() => usePedidoQuery('123'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPedido);
    expect(pedidosApi.getPedidoById).toHaveBeenCalledWith(expect.anything(), '123');
  });

  it('nao deve buscar se o ID for nulo', () => {
    const { result } = renderHook(() => usePedidoQuery(null), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(pedidosApi.getPedidoById).not.toHaveBeenCalled();
  });
});
