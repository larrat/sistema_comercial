import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProdutoStore } from './useProdutoStore';

beforeEach(() => {
  useProdutoStore.setState({
    filtro: { q: '', cat: '' },
    page: 1,
    pageSize: 20
  });
});

describe('useProdutoStore', () => {
  it('começa com estado inicial correto', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    expect(result.current.filtro).toEqual({ q: '', cat: '' });
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
  });

  it('setFiltro faz patch parcial do filtro e reseta página', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => {
      result.current.setPage(5);
      result.current.setFiltro({ q: 'arroz' });
    });
    expect(result.current.filtro.q).toBe('arroz');
    expect(result.current.filtro.cat).toBe('');
    expect(result.current.page).toBe(1);
  });

  it('clearFiltro reseta todos os campos e página', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => {
      result.current.setPage(3);
      result.current.setFiltro({ q: 'arroz', cat: 'Alimentos' });
    });
    act(() => result.current.clearFiltro());
    expect(result.current.filtro).toEqual({ q: '', cat: '' });
    expect(result.current.page).toBe(1);
  });

  it('setPage atualiza página', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);
  });

  it('setPageSize atualiza tamanho e reseta página', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => {
      result.current.setPage(2);
      result.current.setPageSize(50);
    });
    expect(result.current.pageSize).toBe(50);
    expect(result.current.page).toBe(1);
  });
});
