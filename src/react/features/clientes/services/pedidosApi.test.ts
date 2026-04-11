import { describe, expect, it } from 'vitest';

import type { Cliente, Pedido } from '../../../../types/domain';
import { belongsPedidoToCliente, buildListPedidosUrl, splitClientePedidos } from './pedidosApi';

const CLIENTE: Cliente = {
  id: 'c1',
  nome: 'Maria Souza'
};

describe('pedidosApi', () => {
  it('monta a url de listagem por filial', () => {
    expect(buildListPedidosUrl('https://example.supabase.co', 'filial 1')).toBe(
      'https://example.supabase.co/rest/v1/pedidos?filial_id=eq.filial%201&order=num.desc'
    );
  });

  it('reconhece pedido vinculado por cliente_id ou nome', () => {
    const byId: Pedido = {
      id: 'p1',
      cliente_id: 'c1',
      num: 10,
      cli: 'Outro nome',
      status: 'confirmado',
      itens: [],
      total: 100
    };
    const byNome: Pedido = {
      id: 'p2',
      num: 11,
      cli: 'Maria Souza',
      status: 'confirmado',
      itens: [],
      total: 100
    };

    expect(belongsPedidoToCliente(byId, CLIENTE)).toBe(true);
    expect(belongsPedidoToCliente(byNome, CLIENTE)).toBe(true);
  });

  it('separa pedidos abertos e fechados', () => {
    const split = splitClientePedidos([
      {
        id: 'p1',
        num: 10,
        cli: 'Maria Souza',
        status: 'confirmado',
        itens: [],
        total: 100,
        venda_fechada: false
      },
      {
        id: 'p2',
        num: 11,
        cli: 'Maria Souza',
        status: 'entregue',
        itens: [],
        total: 200,
        venda_fechada: true
      },
      {
        id: 'p3',
        num: 12,
        cli: 'Maria Souza',
        status: 'cancelado',
        itens: [],
        total: 300,
        venda_fechada: false
      }
    ] satisfies Pedido[]);

    expect(split.abertas).toHaveLength(1);
    expect(split.fechadas).toHaveLength(1);
    expect(split.abertas[0]?.id).toBe('p1');
    expect(split.fechadas[0]?.id).toBe('p2');
  });
});
