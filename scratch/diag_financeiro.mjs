const url = 'https://eiycrokqwhmfmjackjni.supabase.co';
const key = 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';

async function diag() {
  const pedidoNum = 12;
  const resPed = await fetch(`${url}/rest/v1/pedidos?num=eq.${pedidoNum}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const pedidos = await resPed.json();
  const pedido = pedidos[0];
  if (!pedido) {
    console.log('Pedido nao encontrado');
    return;
  }
  console.log('Pedido:', pedido.id, pedido.status, pedido.total);

  const resConta = await fetch(`${url}/rest/v1/contas_receber?pedido_id=eq.${pedido.id}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const contas = await resConta.json();
  console.log('Contas:', contas.map(c => ({ 
    id: c.id, 
    status: c.status, 
    valor: c.valor, 
    aberto: c.valor_em_aberto, 
    recebido: c.valor_recebido,
    vencimento: c.vencimento
  })));
}

diag();
