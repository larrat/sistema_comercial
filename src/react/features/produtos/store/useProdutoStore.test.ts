import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProdutoStore, selectFilteredProdutos, selectCategorias } from './useProdutoStore';
import type { Produto } from '../../../../types/domain';

const PRODUTOS: Produto[] = [
  { id: '1', nome: 'Arroz 5kg', un: 'un', custo: 20, mkv: 30, cat: 'Alimentos' },
  { id: '2', nome: 'Feijão 1kg', un: 'un', custo: 8, mkv: 25, cat: 'Alimentos' },
  { id: '3', nome: 'Detergente', un: 'un', custo: 3, mkv: 40, cat: 'Limpeza' }
];

beforeEach(() => {
  useProdutoStore.setState({
    produtos: [],
    status: 'idle',
    error: null,
    filtro: { q: '', cat: '' },
    saldos: {}
  });
});

describe('useProdutoStore', () => {
  it('começa com estado idle e sem produtos', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    expect(result.current.status).toBe('idle');
    expect(result.current.produtos).toHaveLength(0);
  });

  it('setProdutos atualiza lista e status para ready', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setProdutos(PRODUTOS));
    expect(result.current.produtos).toHaveLength(3);
    expect(result.current.status).toBe('ready');
    expect(result.current.error).toBeNull();
  });

  it('setStatus atualiza status e erro', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setStatus('error', 'Falhou'));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Falhou');
  });

  it('setStatus sem erro limpa erro anterior', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setStatus('error', 'Falhou'));
    act(() => result.current.setStatus('loading'));
    expect(result.current.error).toBeNull();
  });

  it('setFiltro faz patch parcial do filtro', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setFiltro({ q: 'arroz' }));
    expect(result.current.filtro.q).toBe('arroz');
    expect(result.current.filtro.cat).toBe('');
  });

  it('clearFiltro reseta todos os campos', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setFiltro({ q: 'arroz', cat: 'Alimentos' }));
    act(() => result.current.clearFiltro());
    expect(result.current.filtro).toEqual({ q: '', cat: '' });
  });

  it('upsertProduto adiciona novo produto mantendo ordenação por nome', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setProdutos([PRODUTOS[1], PRODUTOS[2]]));
    act(() =>
      result.current.upsertProduto({ id: '4', nome: 'Açúcar 1kg', un: 'un', custo: 5, mkv: 20 })
    );
    expect(result.current.produtos[0].nome).toBe('Açúcar 1kg');
    expect(result.current.produtos).toHaveLength(3);
  });

  it('upsertProduto atualiza produto existente sem duplicar', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setProdutos(PRODUTOS));
    act(() =>
      result.current.upsertProduto({ ...PRODUTOS[0], custo: 25 })
    );
    expect(result.current.produtos).toHaveLength(3);
    expect(result.current.produtos.find((p) => p.id === '1')?.custo).toBe(25);
  });

  it('removeProduto remove o registro e preserva os demais', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setProdutos(PRODUTOS));
    act(() => result.current.removeProduto('2'));
    expect(result.current.produtos.map((p) => p.id)).toEqual(['1', '3']);
    expect(result.current.status).toBe('ready');
  });

  it('setSaldos atualiza mapa de saldos', () => {
    const { result } = renderHook(() => useProdutoStore((s) => s));
    act(() => result.current.setSaldos({ '1': { saldo: 50, cm: 21 } }));
    expect(result.current.saldos['1']).toEqual({ saldo: 50, cm: 21 });
  });
});

describe('selectFilteredProdutos', () => {
  it('retorna todos quando filtro vazio', () => {
    useProdutoStore.setState({ produtos: PRODUTOS, filtro: { q: '', cat: '' } });
    expect(selectFilteredProdutos(useProdutoStore.getState())).toHaveLength(3);
  });

  it('filtra por texto no nome', () => {
    useProdutoStore.setState({ produtos: PRODUTOS, filtro: { q: 'arroz', cat: '' } });
    expect(selectFilteredProdutos(useProdutoStore.getState())).toHaveLength(1);
  });

  it('filtra por texto no SKU', () => {
    useProdutoStore.setState({
      produtos: [{ ...PRODUTOS[0], sku: 'ARZ001' }, PRODUTOS[1]],
      filtro: { q: 'arz001', cat: '' }
    });
    expect(selectFilteredProdutos(useProdutoStore.getState())).toHaveLength(1);
  });

  it('filtra por categoria', () => {
    useProdutoStore.setState({ produtos: PRODUTOS, filtro: { q: '', cat: 'Alimentos' } });
    expect(selectFilteredProdutos(useProdutoStore.getState())).toHaveLength(2);
  });

  it('combina filtros de texto e categoria', () => {
    useProdutoStore.setState({ produtos: PRODUTOS, filtro: { q: 'arroz', cat: 'Alimentos' } });
    expect(selectFilteredProdutos(useProdutoStore.getState())).toHaveLength(1);
  });

  it('retorna vazio quando nenhum produto corresponde', () => {
    useProdutoStore.setState({ produtos: PRODUTOS, filtro: { q: 'xpto', cat: '' } });
    expect(selectFilteredProdutos(useProdutoStore.getState())).toHaveLength(0);
  });
});

describe('selectCategorias', () => {
  it('retorna categorias únicas ordenadas', () => {
    useProdutoStore.setState({ produtos: PRODUTOS });
    const cats = selectCategorias(useProdutoStore.getState());
    expect(cats).toEqual(['Alimentos', 'Limpeza']);
  });

  it('ignora produtos sem categoria', () => {
    useProdutoStore.setState({ produtos: [{ id: '1', nome: 'Sem cat', un: 'un', custo: 1, mkv: 0 }] });
    expect(selectCategorias(useProdutoStore.getState())).toHaveLength(0);
  });
});
