import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePedidoStore } from './usePedidoStore';

beforeEach(() => {
  usePedidoStore.setState({
    activeTab: 'emaberto',
    filtro: { q: '', status: '', pgto: '', periodo: '', sort: 'data_desc' },
    page: 1,
    pageSize: 20
  });
});

describe('usePedidoStore', () => {
  it('inicializa com valores padrão', () => {
    const { result } = renderHook(() => usePedidoStore((s) => s));
    expect(result.current.activeTab).toBe('emaberto');
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.filtro.q).toBe('');
  });

  it('setActiveTab atualiza aba, limpa filtros e reseta página', () => {
    const { result } = renderHook(() => usePedidoStore((s) => s));
    
    act(() => {
      result.current.setFiltro({ q: 'teste' });
      result.current.setPage(3);
    });
    expect(result.current.filtro.q).toBe('teste');
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setActiveTab('entregues');
    });

    expect(result.current.activeTab).toBe('entregues');
    expect(result.current.filtro.q).toBe('');
    expect(result.current.page).toBe(1);
  });

  it('setFiltro mescla os valores e reseta página para 1', () => {
    const { result } = renderHook(() => usePedidoStore((s) => s));
    act(() => result.current.setPage(4));
    expect(result.current.page).toBe(4);

    act(() => result.current.setFiltro({ q: 'cliente' }));
    expect(result.current.page).toBe(1);
    expect(result.current.filtro.q).toBe('cliente');
    expect(result.current.filtro.sort).toBe('data_desc'); // mantido
  });

  it('clearFiltro limpa todos os filtros e reseta página', () => {
    const { result } = renderHook(() => usePedidoStore((s) => s));
    act(() => {
      result.current.setFiltro({ q: 'teste', status: 'concluido' });
      result.current.setPage(5);
    });

    act(() => {
      result.current.clearFiltro();
    });

    expect(result.current.filtro.q).toBe('');
    expect(result.current.filtro.status).toBe('');
    expect(result.current.page).toBe(1);
  });

  it('setPage atualiza página garantindo valor mínimo 1', () => {
    const { result } = renderHook(() => usePedidoStore((s) => s));
    act(() => result.current.setPage(5));
    expect(result.current.page).toBe(5);

    act(() => result.current.setPage(0));
    expect(result.current.page).toBe(1);
  });

  it('setPageSize atualiza tamanho de página e reseta página para 1', () => {
    const { result } = renderHook(() => usePedidoStore((s) => s));
    act(() => result.current.setPage(3));

    act(() => result.current.setPageSize(50));
    expect(result.current.pageSize).toBe(50);
    expect(result.current.page).toBe(1);
  });
});
