export type DashboardWorkerPayload = {
  pedidos: any[];
  pedidosAnteriores?: any[];
  produtos: any[];
  clientes: any[];
  contasReceber: any[];
  periodo: string;
  statusKeys: string[];
};

self.onmessage = (e: MessageEvent<DashboardWorkerPayload>) => {
  const { pedidos, pedidosAnteriores = [], produtos, clientes, contasReceber, periodo, statusKeys } = e.data;

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
  
  // -- Stats Anteriores para Tendência --
  const vendasReaisAnteriores = pedidosAnteriores.filter(p => statusVenda.includes(p.status));
  const faturamentoAnt = vendasReaisAnteriores.reduce((acc, p) => acc + Number(p.total || 0), 0);
  
  let lucroTotalAnt = 0;
  vendasReaisAnteriores.forEach(p => {
    const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || []));
    items.forEach((item: any) => {
      const preco = Number(item.preco || 0);
      const custo = Number(item.custo || 0);
      const qty = Number(item.qty || 0);
      lucroTotalAnt += (preco - custo) * qty;
    });
  });

  const ticketMedioAnt = vendasReaisAnteriores.length > 0 ? faturamentoAnt / vendasReaisAnteriores.length : 0;
  // Para contas a receber (em aberto), como não temos o saldo histórico preciso, vamos considerar a variação 0 ou calcular se tivéssemos.
  // Por enquanto "Em Aberto" não terá variação baseada no histórico de pedidos.

  const calcTrend = (current: number, previous: number) => {
    if (periodo === 'tudo') return null; // Sem comparativo
    if (previous === 0) return current > 0 ? 100 : 0; // Se antes era 0 e agora tem algo, 100% aumento
    return ((current - previous) / previous) * 100;
  };

  const trends = {
    faturamento: calcTrend(faturamento, faturamentoAnt),
    lucro: calcTrend(lucroTotal, lucroTotalAnt),
    ticket: calcTrend(ticketMedio, ticketMedioAnt),
    emAberto: null // Sem baseline fácil para contas a receber
  };

  const stats = {
    vendasReais: [], // Não precisamos devolver o array inteiro
    faturamento,
    lucroTotal,
    margem: faturamento > 0 ? (lucroTotal / faturamento) * 100 : 0,
    ticketMedio,
    valorEmAberto,
    totalPedidos: vendasReais.length,
    pedidosEntregues: vendasReais.length,
    pedidosPendentes: contasReceber.length,
    trends
  };

  // --- Chart Data ---
  const groups: Record<string, { name: string; faturamento: number; lucro: number; faturamentoAnt: number; lucroAnt: number; sortKey: number, dateKey: string }> = {};
  
  const isCustom = periodo.startsWith('custom:');
  const getDiffDays = () => {
    if (isCustom) {
      const [, startStr, endStr] = periodo.split(':');
      const d1 = new Date(startStr).getTime();
      const d2 = new Date(endStr).getTime();
      return Math.ceil(Math.abs(d2 - d1) / (1000 * 3600 * 24)) || 1;
    }
    if (periodo === '7' || periodo === 'semana') return 7;
    if (periodo === '30' || periodo === 'mes') return 30;
    if (periodo === '90') return 90;
    if (periodo === 'ano') return 365;
    return 365; // default
  };
  const diffDays = getDiffDays();
  let grouping: 'day' | 'week' | 'month' = 'month';
  if (diffDays <= 14) grouping = 'day';
  else if (diffDays <= 90) grouping = 'week';

  const processGroup = (p: any, isAnt: boolean) => {
    const date = new Date(p.data || '');
    let key = '';
    let label = '';
    let sortKey = 0;
    
    if (grouping === 'day') {
      const dStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
      const day = date.getDate();
      const mo = date.getMonth() + 1;
      key = dStr;
      label = `${day.toString().padStart(2, '0')}/${mo.toString().padStart(2, '0')}`;
      sortKey = date.getTime();
    } else if (grouping === 'week') {
      const ms = date.getTime();
      // start of week (Sunday)
      const startOfWeek = new Date(ms - date.getDay() * 86400000);
      const wStr = startOfWeek.toISOString().slice(0, 10);
      key = wStr;
      label = `Sem ${startOfWeek.getDate().toString().padStart(2, '0')}/${(startOfWeek.getMonth()+1).toString().padStart(2, '0')}`;
      sortKey = startOfWeek.getTime();
    } else {
      const y = date.getFullYear();
      const m = date.getMonth();
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      key = `${y}-${m}`;
      label = `${months[m]} ${y}`;
      sortKey = y * 100 + m;
    }

    if (!groups[key]) groups[key] = { name: label, faturamento: 0, lucro: 0, faturamentoAnt: 0, lucroAnt: 0, sortKey, dateKey: key };
    
    const faturamentoVal = Number(p.total || 0);
    let lucroVal = 0;
    const items = (typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || []));
    items.forEach((item: any) => {
      lucroVal += (Number(item.preco || 0) - Number(item.custo || 0)) * Number(item.qty || 0);
    });

    if (isAnt) {
      groups[key].faturamentoAnt += faturamentoVal;
      groups[key].lucroAnt += lucroVal;
    } else {
      groups[key].faturamento += faturamentoVal;
      groups[key].lucro += lucroVal;
    }
  };

  vendasReais.forEach(p => processGroup(p, false));
  vendasReaisAnteriores.forEach(p => processGroup(p, true));

  const chartData = Object.values(groups).sort((a, b) => a.sortKey - b.sortKey);

  // --- Linear Regression for Forecast ---
  if (chartData.length > 1) {
    const n = chartData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    chartData.forEach((d, i) => {
      sumX += i;
      sumY += d.faturamento;
      sumXY += i * d.faturamento;
      sumXX += i * i;
    });

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
    const b = (sumY - m * sumX) / n || 0;

    chartData.forEach((d, i) => {
      (d as any).forecast = Math.max(0, m * i + b); // No negative forecast
    });

    // Add 1 projection point
    const nextI = n;
    const projectedVal = Math.max(0, m * nextI + b);
    let nextLabel = 'Projeção';
    let nextKey = 'proj';
    if (grouping === 'month' && chartData.length > 0) {
      nextLabel = 'Próx. Mês';
    } else if (grouping === 'week') {
      nextLabel = 'Próx. Semana';
    } else if (grouping === 'day') {
      nextLabel = 'Próx. Dia';
    }

    chartData.push({
      name: nextLabel,
      faturamento: 0,
      lucro: 0,
      faturamentoAnt: 0,
      lucroAnt: 0,
      sortKey: chartData[chartData.length - 1].sortKey + 1,
      dateKey: nextKey,
      forecast: projectedVal
    } as any);
  }

  // --- Período Datas ---
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (isCustom) {
    const [, startStr, endStr] = periodo.split(':');
    start = new Date(startStr);
    end = new Date(endStr);
  } else if (periodo === '7' || periodo === 'semana') {
    start.setDate(now.getDate() - 7);
  } else if (periodo === '30' || periodo === 'mes') {
    start.setDate(now.getDate() - 30);
  } else if (periodo === '90') {
    start.setDate(now.getDate() - 90);
  } else if (periodo === 'ano') {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    // Tudo
    start = new Date(2020, 0, 1);
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

  // --- RCA Ranking ---
  const rcaMap: Record<string, { id: string; nome: string; faturamento: number }> = {};
  vendasReais.forEach(p => {
    const rcaId = p.rca_id || 'sem_rca';
    const rcaNome = p.rca_nome || 'Sem Vendedor';
    if (!rcaMap[rcaId]) {
      rcaMap[rcaId] = { id: rcaId, nome: rcaNome, faturamento: 0 };
    }
    rcaMap[rcaId].faturamento += Number(p.total || 0);
  });
  const rcaRanking = Object.values(rcaMap)
    .sort((a, b) => b.faturamento - a.faturamento)
    .slice(0, 5);

  // --- Funnel ---
  const countStatus = (statuses: string[]) => pedidos.filter(p => statuses.includes(p.status)).length;
  const orcamentos = countStatus(['orcamento']);
  const ativos = countStatus(['em_andamento', 'em_separacao', 'entregue_aguardando_pagamento', 'pago_aguardando_entrega', 'concluido']);
  const faturados = countStatus(['entregue_aguardando_pagamento', 'pago_aguardando_entrega', 'concluido']);
  const concluidos = countStatus(['concluido']);

  const funnelData = [
    { id: 'orcamentos', label: 'Orçamentos', value: orcamentos + ativos, color: '#94a3b8' },
    { id: 'ativos', label: 'Pedidos Ativos', value: ativos, color: '#3b82f6' },
    { id: 'faturados', label: 'Faturados', value: faturados, color: '#8b5cf6' },
    { id: 'concluidos', label: 'Concluídos', value: concluidos, color: '#10b981' },
  ].filter(f => f.value > 0);

  // --- Financial Metrics & Aging ---
  const nowMs = Date.now();
  const DAY_MS = 1000 * 3600 * 24;
  
  let aVencer = 0;
  let atraso30 = 0;
  let atraso60 = 0;
  let atraso90 = 0;
  let atraso90Mais = 0;
  let valorAtrasado = 0;

  contasReceber.forEach(c => {
    const val = Number(c.valor_em_aberto || 0);
    if (val <= 0) return;

    const venc = new Date(c.data_vencimento || '').getTime();
    const diffDays = Math.floor((nowMs - venc) / DAY_MS);

    if (diffDays <= 0) {
      aVencer += val;
    } else {
      valorAtrasado += val;
      if (diffDays <= 30) atraso30 += val;
      else if (diffDays <= 60) atraso60 += val;
      else if (diffDays <= 90) atraso90 += val;
      else atraso90Mais += val;
    }
  });

  const agingData = [
    { id: 'a_vencer', label: 'A Vencer', value: aVencer, color: '#10b981' },
    { id: '1_30', label: '1-30 dias', value: atraso30, color: '#fbbf24' },
    { id: '31_60', label: '31-60 dias', value: atraso60, color: '#f59e0b' },
    { id: '61_90', label: '61-90 dias', value: atraso90, color: '#ea580c' },
    { id: '90_mais', label: '> 90 dias', value: atraso90Mais, color: '#ef4444' }
  ];

  const daysInPeriod = Math.max(1, Math.floor((end.getTime() - start.getTime()) / DAY_MS));
  const dso = faturamento > 0 ? (valorEmAberto / faturamento) * daysInPeriod : 0;
  const inadimplencia = valorEmAberto > 0 ? (valorAtrasado / valorEmAberto) * 100 : 0;

  const financeMetrics = {
    dso,
    inadimplencia,
    valorAtrasado
  };

  // --- Cash Flow Projection (Next 7 Days) ---
  const cashFlowMap: Record<string, number> = {};
  
  // Normalize today to midnight local time to avoid timezone/hour offset bugs
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMidnightMs = todayMidnight.getTime();

  for (let i = 0; i < 7; i++) {
    const d = new Date(todayMidnightMs + i * DAY_MS);
    const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
    cashFlowMap[key] = 0;
  }

  contasReceber.forEach(c => {
    const val = Number(c.valor_em_aberto || 0);
    if (val <= 0) return;
    
    // Normalize due date to local midnight to match todayMidnightMs comparison
    const vencDate = new Date(c.data_vencimento || '');
    const vencMidnight = new Date(vencDate.getFullYear(), vencDate.getMonth(), vencDate.getDate());
    vencMidnight.setHours(0, 0, 0, 0);
    const vencMs = vencMidnight.getTime();
    
    const diffDays = Math.round((vencMs - todayMidnightMs) / DAY_MS);
    
    // Only if within next 7 days
    if (diffDays >= 0 && diffDays < 7) {
      const key = `${vencMidnight.getDate().toString().padStart(2, '0')}/${(vencMidnight.getMonth()+1).toString().padStart(2, '0')}`;
      if (cashFlowMap[key] !== undefined) {
        cashFlowMap[key] += val;
      }
    }
  });

  const cashFlowData = Object.entries(cashFlowMap).map(([name, receita]) => ({
    name,
    receita
  }));

  // --- RFM Segmentation (Simplified for period) ---
  const clientStats: Record<string, { recency: number, frequency: number, monetary: number }> = {};
  
  vendasReais.forEach(p => {
    const cId = p.cliente_id || 'unknown';
    const total = Number(p.total || 0);
    const date = new Date(p.data || p.criado_em || '').getTime();
    
    if (!clientStats[cId]) {
      clientStats[cId] = { recency: date, frequency: 0, monetary: 0 };
    }
    
    clientStats[cId].frequency += 1;
    clientStats[cId].monetary += total;
    if (date > clientStats[cId].recency) {
      clientStats[cId].recency = date;
    }
  });

  const campeoes = { size: 0, value: 0 };
  const leais = { size: 0, value: 0 };
  const risco = { size: 0, value: 0 };
  const novos = { size: 0, value: 0 };

  Object.values(clientStats).forEach(c => {
    const diffDays = Math.floor((nowMs - c.recency) / DAY_MS);
    if (diffDays <= 15 && c.frequency >= 3) {
      campeoes.size += 1;
      campeoes.value += c.monetary;
    } else if (c.frequency >= 2) {
      leais.size += 1;
      leais.value += c.monetary;
    } else if (diffDays > 30) {
      risco.size += 1;
      risco.value += c.monetary;
    } else {
      novos.size += 1;
      novos.value += c.monetary;
    }
  });

  const rfmData = [
    { name: 'Campeões', size: campeoes.size, value: campeoes.value, color: '#10b981' }, // emerald
    { name: 'Leais', size: leais.size, value: leais.value, color: '#3b82f6' }, // blue
    { name: 'Novos', size: novos.size, value: novos.value, color: '#8b5cf6' }, // violet
    { name: 'Risco', size: risco.size, value: risco.value, color: '#f43f5e' } // rose
  ].filter(g => g.size > 0);

  self.postMessage({
    stats,
    chartData,
    periodoDatas,
    topProducts,
    statusDistribution,
    healthMetrics,
    rcaRanking,
    funnelData,
    agingData,
    financeMetrics,
    cashFlowData,
    rfmData
  });
};
