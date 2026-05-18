export type DashboardWorkerPayload = {
  pedidos: any[];
  produtos: any[];
  clientes: any[];
  contasReceber: any[];
  periodo: string;
  statusKeys: string[];
};

self.onmessage = (e: MessageEvent<DashboardWorkerPayload>) => {
  const { pedidos, produtos, clientes, contasReceber, periodo, statusKeys } = e.data;

  const statusVenda = ['entregue_aguardando_pagamento', 'pago_aguardando_entrega', 'concluido'];
  const vendasReais = pedidos.filter(p => statusVenda.includes(p.status));
  const faturamento = vendasReais.reduce((acc, p) => acc + Number(p.total || 0), 0);
  
  let lucroTotal = 0;
  vendasReais.forEach(p => {
    const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || []));
    items.forEach((item: any) => {
      const preco = Number(item.preco || 0);
      const custo = Number(item.custo || 0);
      const qty = Number(item.qty || 0);
      lucroTotal += (preco - custo) * qty;
    });
  });

  const ticketMedio = vendasReais.length > 0 ? faturamento / vendasReais.length : 0;
  const valorEmAberto = contasReceber.reduce((acc, c) => acc + Number(c.valor_em_aberto || 0), 0);
  
  const stats = {
    vendasReais: [], // Não precisamos devolver o array inteiro
    faturamento,
    lucroTotal,
    margem: faturamento > 0 ? (lucroTotal / faturamento) * 100 : 0,
    ticketMedio,
    valorEmAberto,
    totalPedidos: vendasReais.length,
    pedidosEntregues: vendasReais.length,
    pedidosPendentes: contasReceber.length
  };

  // --- Chart Data ---
  const groups: Record<string, { name: string; faturamento: number; lucro: number }> = {};
  vendasReais.forEach(p => {
    const date = new Date(p.data || '');
    let key = '';
    let label = '';
    
    if (periodo === 'semana') {
      key = date.toISOString().slice(0, 10);
      label = `${date.getDate()}/${date.getMonth() + 1}`;
    } else if (periodo === 'mes') {
      const week = Math.ceil(date.getDate() / 7);
      key = `W${week}`;
      label = `Semana ${week}`;
    } else {
      key = date.toISOString().slice(0, 7);
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      label = months[date.getMonth()];
    }

    if (!groups[key]) groups[key] = { name: label, faturamento: 0, lucro: 0 };
    groups[key].faturamento += Number(p.total || 0);
    
    const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || []));
    items.forEach((item: any) => {
      groups[key].lucro += (Number(item.preco || 0) - Number(item.custo || 0)) * Number(item.qty || 0);
    });
  });
  const chartData = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));

  // --- Período Datas ---
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (periodo === 'semana') {
    const day = now.getDay();
    start.setDate(now.getDate() - day);
    end.setDate(now.getDate() + (6 - day));
  } else if (periodo === 'mes') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (periodo === 'ano') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  } else {
    if (pedidos.length > 0) {
      const dates = pedidos.map(p => new Date(p.data || '').getTime());
      start = new Date(Math.min(...dates));
      end = new Date(Math.max(...dates));
    }
  }
  const fmtDate = (d: Date) => {
    const dy = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const yr = String(d.getFullYear()).slice(-2);
    return `${dy}/${mo}/${yr}`;
  };
  const periodoDatas = pedidos.length === 0 && periodo === 'tudo' ? 'Todo o período' : `${fmtDate(start)} — ${fmtDate(end)}`;

  // --- Top Products ---
  const productSales: Record<string, { nome: string; receita: number }> = {};
  const parentMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  produtos.forEach(p => {
    if (p.produto_pai_id) parentMap.set(p.id, p.produto_pai_id);
    nameMap.set(p.id, p.nome);
  });

  let totalReceita = 0;
  vendasReais.forEach(p => {
    const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || []));
    items.forEach((item: any) => {
      if (!item.prodId) return;
      const effectiveId = parentMap.get(item.prodId) || item.prodId;
      const effectiveName = nameMap.get(effectiveId) || item.nome || 'Produto';
      const receita = Number(item.preco || 0) * Number(item.qty || 0);
      
      if (!productSales[effectiveId]) {
        productSales[effectiveId] = { nome: effectiveName, receita: 0 };
      }
      productSales[effectiveId].receita += receita;
      totalReceita += receita;
    });
  });
  
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5)
    .map(p => ({
      ...p,
      percent: totalReceita > 0 ? (p.receita / totalReceita) * 100 : 0
    }));

  // --- Status Distribution ---
  const statusDistribution: Record<string, number> = {};
  pedidos.forEach(p => {
    statusDistribution[p.status] = (statusDistribution[p.status] || 0) + 1;
  });
  const otherCount = pedidos.filter(p => !statusKeys.includes(p.status)).length;
  if (otherCount > 0) {
    statusDistribution['outros'] = otherCount;
  }

  // --- Health Metrics ---
  const totalClientes = clientes.length;
  const comContato = clientes.filter(c => c.whatsapp || c.email).length;
  const totalProdutos = produtos.length;
  const comEstoque = produtos.filter(p => Number(p.esal || 0) > 0).length;
  
  const produtosVendidos = new Set();
  pedidos.forEach(p => {
    if (p.status === 'cancelado') return;
    const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || []));
    items.forEach((i: any) => produtosVendidos.add(i.prodId));
  });

  const validPedidos = pedidos.filter(p => p.status !== 'cancelado');
  const entregues = validPedidos.filter(p => ['entregue_aguardando_pagamento', 'concluido'].includes(p.status)).length;

  const healthMetrics = {
    contato: totalClientes > 0 ? (comContato / totalClientes) * 100 : 0,
    estoque: totalProdutos > 0 ? (comEstoque / totalProdutos) * 100 : 0,
    mix: totalProdutos > 0 ? (produtosVendidos.size / totalProdutos) * 100 : 0,
    entrega: validPedidos.length > 0 ? (entregues / validPedidos.length) * 100 : 0
  };

  self.postMessage({
    stats,
    chartData,
    periodoDatas,
    topProducts,
    statusDistribution,
    healthMetrics
  });
};
