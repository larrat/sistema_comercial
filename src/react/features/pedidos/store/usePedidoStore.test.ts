import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Pedido } from '../../../../types/domain';
import { usePedidoStore } from './usePedidoStore';

const PEDIDOS: Pedido[] = [
  {
    id: '1',
    filial_id: 'filial-1',
    num: 101,
    cli: 'Cliente A',
    data: '2026-04-20',
    status: 'orcamento',
    pgto: 'pix',
    prazo: 'a_vista',
    tipo: 'varejo',
    itens: [],
    total: 120
  },
  {
    id: '2',
    filial_id: 'filial-1',
    num: 102,
    cli: 'Cliente B',
    data: '2026-04-21',
    status: 'entregue',
    pgto: 'boleto',
    prazo: '7',
    tipo: 'varejo',
    itens: [],
    total: 80
  }
];

beforeEach(() => {
  usePedidoStore.setState({
    pedidos: [],
    summary: {
      total: 0,
      emAbertoCount: 0,
      valorEmAberto: 0,
      entreguesCount: 0,
      canceladosCount: 0
    },
    status: 'idle',
    error: null,
    activeTab: 'emaberto',
    filtro: { q: '', status: '', pgto: '', periodo: '', sort: 'data_desc' },
    page: 1,
    pageSize: 20,
    total: 0,
    pageCount: 1,
    inFlight: new Set()
  });
});

describe('usePedidoStore', () => {
  it('setPedidosPage atualiza paginação e status', () => {
    const { result } = renderHook(() => usePedidoStore((s) => s));

    act(() =>
      result.current.setPedidosPage({
        pedidos: PEDIDOS,
        page: 2,
        pageSize: 20,
        total: 45,
        pageCount: 3
      })
    );

    expect(result.current.pedidos).toHaveLength(2);
    expect(result.current.page).toBe(2);
    expect(result.current.total).toBe(45);
    expect(result.current.status).toBe('ready');
  });

  it('setFiltro reseta para a primeira página', () => {
    const { result } = renderHook(() => usePedidoStore((s) => s));
    act(() => result.current.setPage(4));
    act(() => result.current.setFiltro({ q: 'cliente' }));
    expect(result.current.page).toBe(1);
    expect(result.current.filtro.q).toBe('cliente');
  });

  it('upsertPedido ajusta resumo local ao mudar status', () => {
    usePedidoStore.setState({
      pedidos: [PEDIDOS[0]],
      summary: {
        total: 1,
        emAbertoCount: 1,
        valorEmAberto: 120,
        entreguesCount: 0,
        canceladosCount: 0
      },
      total: 1,
      pageCount: 1
    });

    const { result } = renderHook(() => usePedidoStore((s) => s));
    act(() => result.current.upsertPedido({ ...PEDIDOS[0], status: 'concluido' }));

    expect(result.current.summary).toEqual({
      total: 1,
      emAbertoCount: 0,
      valorEmAberto: 0,
      entreguesCount: 1,
      canceladosCount: 0
    });
  });
});
