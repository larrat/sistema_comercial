import { getSupabaseConfig } from '../../app/supabaseConfig';
import { logAudit } from '../../../shared/services/auditService';

export type PedidoCompraItem = {
  produto_id: string;
  nome: string;
  qty: number;
  custo_unitario: number;
  total_item: number;
};

export type PedidoCompra = {
  id: string;
  filial_id: string;
  fornecedor_nome: string;
  total: number;
  status: 'aberto' | 'finalizado' | 'cancelado';
  forma_pagamento?: string;
  obs?: string;
  criado_em: string;
  itens?: PedidoCompraItem[];
};

export async function listPedidosCompra(token: string, filialId: string) {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(
    `${url}/rest/v1/pedidos_compra?filial_id=eq.${filialId}&select=*,pedido_compra_itens(*)&order=criado_em.desc`,
    {
      headers: { apikey: key, Authorization: `Bearer ${token}` }
    }
  );
  if (!res.ok) throw new Error('Falha ao carregar pedidos de compra');
  return (await res.json()) as PedidoCompra[];
}

export async function savePedidoCompra(
  token: string,
  pedido: Partial<PedidoCompra>,
  itens: PedidoCompraItem[]
) {
  const { url, key } = getSupabaseConfig();

  // 1. Salvar Pedido
  const resPedido = await fetch(`${url}/rest/v1/pedidos_compra?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(pedido)
  });
  if (!resPedido.ok) throw new Error('Erro ao salvar cabeçalho do pedido de compra');
  const savedPedido = (await resPedido.json())[0] as PedidoCompra;

  // 2. Salvar Itens (Limpar antigos e inserir novos para simplificar)
  await fetch(`${url}/rest/v1/pedido_compra_itens?pedido_compra_id=eq.${savedPedido.id}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  });

  const resItens = await fetch(`${url}/rest/v1/pedido_compra_itens`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(itens.map((i) => ({ ...i, pedido_compra_id: savedPedido.id })))
  });
  if (!resItens.ok) throw new Error('Erro ao salvar itens do pedido de compra');

  return savedPedido;
}

export async function finalizarPedidoCompra(token: string, pedido: PedidoCompra) {
  const { url, key } = getSupabaseConfig();

  // 1. Atualizar Status do Pedido
  const resStatus = await fetch(`${url}/rest/v1/pedidos_compra?id=eq.${pedido.id}`, {
    method: 'PATCH',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'finalizado', finalizado_em: new Date().toISOString() })
  });
  if (!resStatus.ok) throw new Error('Erro ao finalizar pedido');

  // 2. Atualizar Estoque (Dar Entrada)
  const itens = pedido.itens || [];
  for (const item of itens) {
    // Incrementa esal (estoque atual) e atualiza custo (opcionalmente)
    // Aqui usamos um RPC ou PATCH incremental. Como não temos RPC pronto, usamos PATCH simples (Risco de corrida, mas aceitável para MVP industrial)
    // Busca saldo atual
    const resProd = await fetch(`${url}/rest/v1/produtos?id=eq.${item.produto_id}&select=esal`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` }
    });
    const prod = (await resProd.json())[0];
    const novoSaldo = (prod?.esal || 0) + item.qty;

    await fetch(`${url}/rest/v1/produtos?id=eq.${item.produto_id}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ esal: novoSaldo, custo: item.custo_unitario })
    });
  }

  // 3. Gerar Contas a Pagar
  await fetch(`${url}/rest/v1/contas_pagar`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: `CP-${pedido.id}`,
      filial_id: pedido.filial_id,
      pedido_compra_id: pedido.id,
      fornecedor_nome: pedido.fornecedor_nome,
      valor: pedido.total,
      vencimento: new Date().toISOString().split('T')[0], // Vence hoje por padrão
      status: 'pendente',
      categoria: 'Mercadoria'
    })
  });

  logAudit(token, 'pedido_compra', pedido.id, 'UPDATE', { status: 'finalizado' });
}
