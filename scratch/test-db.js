const DEFAULT_URL = 'https://eiycrokqwhmfmjackjni.supabase.co';
const DEFAULT_KEY = 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';

async function run() {
  console.log("Checking DB status...");

  // Fetch last 5 purchase orders
  const res = await fetch(`${DEFAULT_URL}/rest/v1/pedidos_compra?select=id,status,total,fornecedor_nome,criado_em,filial_id&order=criado_em.desc&limit=5`, {
    headers: {
      'apikey': DEFAULT_KEY,
      'Content-Type': 'application/json'
    }
  });

  const orders = await res.json();
  console.log("\nLast 5 Purchase Orders:", JSON.stringify(orders, null, 2));

  if (orders.length > 0) {
    const lastOrderId = orders[0].id;
    // Fetch items of the last order
    const resItems = await fetch(`${DEFAULT_URL}/rest/v1/pedido_compra_itens?pedido_compra_id=eq.${lastOrderId}&select=*`, {
      headers: { 'apikey': DEFAULT_KEY }
    });
    const items = await resItems.json();
    console.log(`\nItems for purchase order ${lastOrderId}:`, JSON.stringify(items, null, 2));

    // Fetch movements for the last order
    const resMovs = await fetch(`${DEFAULT_URL}/rest/v1/movimentacoes?obs=ilike.*${lastOrderId}*&select=*`, {
      headers: { 'apikey': DEFAULT_KEY }
    });
    const movs = await resMovs.json();
    console.log(`\nMovements matching purchase order ${lastOrderId}:`, JSON.stringify(movs, null, 2));

    if (items.length > 0) {
      const prodId = items[0].produto_id;
      // Fetch product detail including esal, emin, custo
      const resProd = await fetch(`${DEFAULT_URL}/rest/v1/produtos?id=eq.${prodId}&select=id,nome,sku,esal,emin,custo`, {
        headers: { 'apikey': DEFAULT_KEY }
      });
      const prod = await resProd.json();
      console.log(`\nProduct state for ${prodId} (${prod[0]?.nome}):`, JSON.stringify(prod, null, 2));
    }
  }
}

run().catch(console.error);
