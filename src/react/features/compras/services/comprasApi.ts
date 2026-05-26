import { getSupabaseConfig } from '../../../app/supabaseConfig';
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

  // 1. Atualizar Status do Pedido de forma Atômica
  const resStatus = await fetch(`${url}/rest/v1/pedidos_compra?id=eq.${pedido.id}&status=eq.aberto`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ status: 'finalizado', finalizado_em: new Date().toISOString() })
  });
  if (!resStatus.ok) throw new Error('Erro ao finalizar pedido');

  const updatedData = await resStatus.json();
  if (!updatedData || updatedData.length === 0) {
    throw new Error('Este pedido já foi finalizado ou não está aberto.');
  }

  // 2. Registrar entrada no Kardex por item.
  // IMPORTANTE: NÃO fazer PATCH direto em produtos.esal.
  // O trigger trg_movimentacoes_stock_sync recalcula o esal automaticamente após cada INSERT
  // em movimentacoes, eliminando o risco de race condition entre requisições concorrentes.
  const itens = (pedido as any).pedido_compra_itens || pedido.itens || [];
  for (const item of itens) {
    // 2a. Registra a movimentação de entrada — o trigger cuida do estoque
    await fetch(`${url}/rest/v1/movimentacoes`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `MOV-PC-${pedido.id}-${item.produto_id}-${Date.now()}`,
        filial_id: pedido.filial_id,
        prod_id: item.produto_id,
        prodId: item.produto_id,
        tipo: 'entrada',
        data: new Date().toISOString().split('T')[0],
        qty: item.qty,
        custo: item.custo_unitario,
        obs: `Entrada automática via Pedido de Compra ${pedido.id} — ${pedido.fornecedor_nome}`,
        ts: Date.now()
      })
    });

    // 2b. Atualiza apenas o custo do produto (sem sobrescrever esal)
    await fetch(`${url}/rest/v1/produtos?id=eq.${item.produto_id}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ custo: item.custo_unitario })
    });
  }

  // 3. Gerar Contas a Pagar com status correto conforme a forma de pagamento.
  // À vista (dinheiro, pix, débito): conta já nasce como 'pago', caixa debitado imediatamente.
  // A prazo (boleto, prazo, crédito): conta nasce como 'pendente', caixa debitado quando pagar.
  const isAVista = ['dinheiro', 'pix', 'cartao_debito', 'debito', 'avista', 'a_vista'].includes(
    (pedido.forma_pagamento ?? '').toLowerCase()
  );
  const hoje = new Date().toISOString().split('T')[0];
  const vencimento30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  await fetch(`${url}/rest/v1/contas_pagar`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates'
    },
    body: JSON.stringify({
      id: `CP-${pedido.id}`,
      filial_id: pedido.filial_id,
      pedido_compra_id: pedido.id,
      fornecedor_nome: pedido.fornecedor_nome,
      valor: pedido.total,
      vencimento: isAVista ? hoje : vencimento30d,
      status: isAVista ? 'pago' : 'pendente',
      categoria: 'compra'
    })
  });

  // 4. Debitar do Caixa apenas se for compra à vista.
  // Compras a prazo: o trigger trg_caixa_auto_pagar lança a saída quando contas_pagar for marcada 'pago'.
  if (isAVista) {
    await fetch(`${url}/rest/v1/caixa_transacoes`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filial_id: pedido.filial_id,
        tipo: 'saida',
        valor: pedido.total,
        categoria_id: 'compra',
        descricao: `Compra à vista: ${pedido.fornecedor_nome} — Pedido ${pedido.id.substring(0, 8)}`,
        entidade_id: pedido.id,
        entidade_tipo: 'fornecedor'
      })
    });
  }

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

