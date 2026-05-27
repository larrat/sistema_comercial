import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { logAudit } from '../../../shared/services/auditService';

export type PedidoCompraItem = {
  produto_id: string;
  nome: string;
  qty: number;
  custo_unitario: number;
  total_item: number;
  contrato_id?: string | null;
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
  pedido_compra_itens?: PedidoCompraItem[];
  contrato_id?: string | null;
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

  const res = await fetch(`${url}/rest/v1/rpc/pedido_compra_finalizar_seguro`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_pedido_compra_id: pedido.id
    })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Falha ao finalizar o pedido de compra de forma segura');
  }

  const isAVista = ['dinheiro', 'pix', 'cartao_debito', 'debito', 'avista', 'a_vista'].includes(
    (pedido.forma_pagamento ?? '').toLowerCase()
  );

  logAudit(token, 'pedido_compra', pedido.id, 'UPDATE', {
    status: 'finalizado',
    forma_pagamento: pedido.forma_pagamento ?? 'não informado',
    caixa_debitado: isAVista
  });
}

export async function listNotasDestinadas(token: string, filialId: string): Promise<any[]> {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(
    `${url}/rest/v1/nfe_destinadas?filial_id=eq.${encodeURIComponent(filialId)}&select=*&order=data_emissao.desc`,
    {
      headers: { apikey: key, Authorization: `Bearer ${token}` }
    }
  );
  if (!res.ok) throw new Error('Falha ao consultar notas destinadas SEFAZ');
  return res.json();
}

export async function manifestarNotaDestinada(
  token: string,
  notaId: string,
  status: 'ciencia' | 'confirmado' | 'desconhecido'
): Promise<void> {
  const { url, key } = getSupabaseConfig();
  // Apenas registra o manifesto — NÃO sobrescreve xml_armazenado.
  // O XML real deve vir da API SEFAZ ou de upload do usuário.
  const updateBody = { manifesto_status: status };

  const res = await fetch(`${url}/rest/v1/nfe_destinadas?id=eq.${encodeURIComponent(notaId)}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateBody)
  });
  if (!res.ok) throw new Error('Falha ao enviar manifesto à SEFAZ');
}

export async function vincularNotaImportada(
  token: string,
  notaId: string,
  pedidoId: string
): Promise<void> {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/nfe_destinadas?id=eq.${encodeURIComponent(notaId)}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ importado_compra_id: pedidoId, manifesto_status: 'confirmado' })
  });
  if (!res.ok) throw new Error('Falha ao associar a nota destinada ao pedido de compra');
}

export async function cancelarPedidoCompra(
  token: string,
  pedidoId: string,
  motivo = 'Cancelado pelo operador'
): Promise<void> {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/rpc/pedido_compra_cancelar_seguro`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_pedido_compra_id: pedidoId,
      p_motivo: motivo
    })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Falha ao cancelar o pedido de compra de forma segura');
  }
}

