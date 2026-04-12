import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Cliente, Pedido } from '../../../../types/domain';
import {
  belongsPedidoToCliente,
  buildListPedidosUrl,
  listPedidosByCliente,
  splitClientePedidos
} from './pedidosApi';

const CLIENTE: Cliente = {
  id: 'c1',
  nome: 'Maria Souza'
};
const CONTEXT = {
  url: 'https://example.supabase.co',
  key: 'key',
  token: 'token',
  filialId: 'filial-1'
};

describe('pedidosApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('lista e filtra pedidos do cliente pelo nome normalizado', async () => {
    const pedidos: Pedido[] = [
      {
        id: 'p1',
        num: 10,
        cli: 'Maria Souza',
        status: 'confirmado',
        itens: [],
        total: 100
      },
      {
        id: 'p2',
        num: 11,
        cli: 'Joao Silva',
        status: 'confirmado',
        itens: [],
        total: 120
      },
      {
        id: 'p3',
        num: 12,
        cli: 'María Souza',
        status: 'confirmado',
        itens: [],
        total: 130
      }
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(pedidos)
        } as Response;
      })
    );

    const result = await listPedidosByCliente(CONTEXT, { ...CLIENTE, nome: 'Maria Souza' });

    expect(result).toHaveLength(2);
    expect(result.map((pedido) => pedido.id)).toEqual(['p1', 'p3']);
  });

  it('falha quando filial nao esta ativa', async () => {
    await expect(listPedidosByCliente({ ...CONTEXT, filialId: null }, CLIENTE)).rejects.toThrow(
      'Filial ativa nao encontrada.'
    );
  });

  it('propaga mensagem de erro da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ message: 'Falha da API' })
        } as Response;
      })
    );

    await expect(listPedidosByCliente(CONTEXT, CLIENTE)).rejects.toThrow('Falha da API');
  });
});
