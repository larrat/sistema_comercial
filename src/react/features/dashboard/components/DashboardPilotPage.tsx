import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

import { useDashboardStore, type Periodo, type Visao } from '../store/useDashboardStore';
import { useDashboardData } from '../hooks/useDashboardData';
import { LoadingState, ErrorState, StatusBadge } from '../../../shared/ui';
import type { Pedido, PedidoItem } from '../../../../types/domain';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => BRL.format(v || 0);

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  orcamento: { label: 'Orçamento', color: '#94A3B8' },
  em_andamento: { label: 'Em andamento', color: '#6366F1' },
  em_separacao: { label: 'Em separação', color: '#C5A059' },
  entregue_aguardando_pagamento: { label: 'Entregue · aguardando pgto', color: '#F59E0B' },
  pago_aguardando_entrega: { label: 'Pago · aguardando entrega', color: '#8B5CF6' },
  concluido: { label: 'Concluído', color: '#10B981' },
  cancelado: { label: 'Cancelado', color: '#EF4444' }
};

export function DashboardPilotPage() {
  const { reload } = useDashboardData();
  const navigate = useNavigate();
  
  const { 
    periodo, setPeriodo, 
    visao, setVisao,
    pedidos, produtos, clientes, contasReceber, filial,
    status, error 
  } = useDashboardStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await reload();
    setIsRefreshing(false);
  };

  // --- Cálculos ---
  const stats = useMemo(() => {
    // Vendas Reais: Apenas pedidos que já saíram do orçamento/andamento/separação e não foram cancelados
    // Idealmente: entregue, pago ou concluído.
    const statusVenda = ['entregue_aguardando_pagamento', 'pago_aguardando_entrega', 'concluido'];
    const vendasReais = pedidos.filter(p => statusVenda.includes(p.status));
    
    // Todos os pedidos que não foram cancelados (para ticket médio operacional se necessário, mas usaremos vendas reais por consistência)
    const faturamento = vendasReais.reduce((acc, p) => acc + Number(p.total || 0), 0);
    
    let lucroTotal = 0;
    vendasReais.forEach(p => {
      const items = (p.itens || []) as PedidoItem[];
      items.forEach(item => {
        const preco = Number(item.preco || 0);
        const custo = Number(item.custo || 0);
        const qty = Number(item.qty || 0);
        lucroTotal += (preco - custo) * qty;
      });
    });

    const ticketMedio = vendasReais.length > 0 ? faturamento / vendasReais.length : 0;
    const valorEmAberto = contasReceber.reduce((acc, c) => acc + Number(c.valor_em_aberto || 0), 0);
    
    return {
      vendasReais,
      faturamento,
      lucroTotal,
      margem: faturamento > 0 ? (lucroTotal / faturamento) * 100 : 0,
      ticketMedio,
      valorEmAberto,
      totalPedidos: vendasReais.length,
      pedidosEntregues: vendasReais.length, // Já filtrado por status real de venda
      pedidosPendentes: contasReceber.length
    };
  }, [pedidos, contasReceber]);

  const chartData = useMemo(() => {
    const groups: Record<string, { name: string; faturamento: number; lucro: number }> = {};
    
    // IMPORTANTE: O gráfico deve usar a MESMA base das stats (vendasReais) para ser "Certeiro"
    stats.vendasReais.forEach(p => {
      const date = new Date(p.data || p.criado_em || '');
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
        label = date.toLocaleString('pt-BR', { month: 'short' });
      }

      if (!groups[key]) groups[key] = { name: label, faturamento: 0, lucro: 0 };
      groups[key].faturamento += Number(p.total || 0);
      
      const items = (p.itens || []) as PedidoItem[];
      items.forEach(item => {
        groups[key].lucro += (Number(item.preco || 0) - Number(item.custo || 0)) * Number(item.qty || 0);
      });
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [stats.vendasReais, periodo]);

  const periodoDatas = useMemo(() => {
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
      if (!pedidos.length) return 'Todo o período';
      const dates = pedidos.map(p => new Date(p.data || p.criado_em || ''));
      start = new Date(Math.min(...dates.map(d => d.getTime())));
      end = new Date(Math.max(...dates.map(d => d.getTime())));
    }
    
    const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    return `${fmtDate(start)} — ${fmtDate(end)}`;
  }, [pedidos, periodo]);

  const topProducts = useMemo(() => {
    const productSales: Record<string, { nome: string; variant?: string; receita: number; isChild: boolean }> = {};
    
    stats.vendasReais.forEach(p => {
      const items = (p.itens || []) as PedidoItem[];
      items.forEach(item => {
        if (!item.prodId) return;
        
        const prodInfo = produtos.find(pr => pr.id === item.prodId);
        const paiInfo = prodInfo?.produto_pai_id ? produtos.find(pr => pr.id === prodInfo.produto_pai_id) : null;
        
        const mainName = paiInfo ? paiInfo.nome : (item.nome || 'Produto');
        const variantName = paiInfo ? item.nome.replace(paiInfo.nome, '').replace(/^[·\-\s]+/, '') : '';
        const key = paiInfo ? paiInfo.id : item.prodId;

        if (!productSales[key]) {
          productSales[key] = { 
            nome: mainName, 
            variants: new Set([variantName || 'Base']),
            receita: 0,
            isChild: !!paiInfo
          };
        } else if (paiInfo) {
          productSales[key].variants.add(variantName || 'Base');
        }
        productSales[key].receita += Number(item.preco || 0) * Number(item.qty || 0);
      });
    });
    
    return Object.values(productSales)
      .map(p => ({
        ...p,
        variantDisplay: p.variants.size > 1 
          ? `${p.variants.size} variantes vendidas` 
          : Array.from(p.variants)[0] === 'Base' ? '' : Array.from(p.variants)[0]
      }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [stats.vendasReais, produtos]);

  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    pedidos.forEach(p => {
      dist[p.status] = (dist[p.status] || 0) + 1;
    });
    
    // Identifica se há algum status não mapeado no STATUS_CONFIG
    const knownKeys = Object.keys(STATUS_CONFIG);
    const otherCount = pedidos.filter(p => !knownKeys.includes(p.status)).length;
    if (otherCount > 0) {
      dist['outros'] = otherCount;
    }
    
    return dist;
  }, [pedidos]);

  const healthMetrics = useMemo(() => {
    const totalClientes = clientes.length;
    const comContato = clientes.filter(c => c.whatsapp || c.email).length;
    
    const totalProdutos = produtos.length;
    const comEstoque = produtos.filter(p => Number(p.saldo_atual || 0) > 0).length;
    
    const produtosVendidos = new Set();
    pedidos.forEach(p => {
      if (p.status === 'cancelado') return;
      (p.itens || []).forEach((i: any) => produtosVendidos.add(i.prodId));
    });

    const validPedidos = pedidos.filter(p => p.status !== 'cancelado');
    const entregues = validPedidos.filter(p => ['entregue_aguardando_pagamento', 'concluido'].includes(p.status)).length;

    return {
      contato: totalClientes > 0 ? (comContato / totalClientes) * 100 : 0,
      estoque: totalProdutos > 0 ? (comEstoque / totalProdutos) * 100 : 0,
      mix: totalProdutos > 0 ? (produtosVendidos.size / totalProdutos) * 100 : 0,
      entrega: validPedidos.length > 0 ? (entregues / validPedidos.length) * 100 : 0,
      zeroStockCount: totalProdutos - comEstoque
    };
  }, [clientes, produtos, pedidos]);

  const customerMetrics = useMemo(() => {
    const total = clientes.length;
    const comWhats = clientes.filter(c => c.whatsapp).length;
    const comEmail = clientes.filter(c => c.email).length;
    const optIn = clientes.filter(c => c.participa_campanhas).length;
    
    const compradores = new Set();
    pedidos.forEach(p => {
      if (p.status !== 'cancelado') compradores.add(p.cliente_id);
    });

    return {
      total,
      comWhats,
      comEmail,
      optIn,
      compraram: compradores.size,
      coberturaWhats: total > 0 ? (comWhats / total) * 100 : 0
    };
  }, [clientes, pedidos]);

  const alerts = useMemo(() => {
    const list = [];
    const semBaixaPedidos = pedidos.filter(p => p.status === 'entregue_aguardando_pagamento');
    if (semBaixaPedidos.length > 0) {
      const p = semBaixaPedidos[0];
      const clienteNome = clientes.find(c => c.id === p.cliente_id)?.nome || 'Cliente';
      list.push({
        id: 'sem-baixa',
        title: `${semBaixaPedidos.length} pedido${semBaixaPedidos.length > 1 ? 's' : ''} entregue${semBaixaPedidos.length > 1 ? 's' : ''} sem baixa`,
        desc: `${clienteNome} · R$ ${fmt(p.total)} em aberto`,
        link: `/app/pedidos/${p.id}`,
        tone: 'warning'
      });
    }

    if (healthMetrics.zeroStockCount > 0) {
      list.push({
        id: 'estoque-zero',
        title: `Ruptura detectada em ${healthMetrics.zeroStockCount} itens`,
        desc: 'Nexus AI: Risco de perda de venda imediata',
        link: '/app/estoque',
        tone: 'danger',
        isPredictive: true
      });
    }

    if (filial?.meta_mensal && stats.faturamento < filial.meta_mensal * 0.5) {
      list.push({
        id: 'meta-risco',
        title: 'Meta mensal em risco',
        desc: 'Nexus AI: Projeção atual indica 15% abaixo do alvo',
        link: '/app/dashboard',
        tone: 'warning',
        isPredictive: true
      });
    }

    if (healthMetrics.mix < 10 && stats.totalPedidos > 0) {
      list.push({
        id: 'mix-baixo',
        title: 'Mix ativo crítico',
        desc: 'Baixa diversificação de portfólio no período',
        link: '/app/produtos',
        tone: 'danger',
        isPredictive: false
      });
    }

    const vencidas = contasReceber.filter(c => c.vencimento && new Date(c.vencimento) < new Date()).length;
    if (vencidas > 0) {
      const valorVencido = contasReceber
        .filter(c => c.vencimento && new Date(c.vencimento) < new Date())
        .reduce((acc, c) => acc + Number(c.valor_em_aberto || 0), 0);
      list.push({
        id: 'contas-vencidas',
        title: `${vencidas} conta(s) vencida(s)`,
        desc: `R$ ${fmt(valorVencido)} em atraso`,
        link: '/app/receber',
        tone: 'danger'
      });
    }

    return list;
  }, [pedidos, stats, healthMetrics, contasReceber]);

  if (status === 'loading') return <LoadingState message="Consolidando indicadores..." />;
  if (status === 'error') return <ErrorState title="Falha ao carregar dashboard" message={error || ''} onRetry={reload} />;

  const getHealthTone = (val: number, thresholds: [number, number]) => {
    if (val >= thresholds[0]) return 'success';
    if (val >= thresholds[1]) return 'warning';
    return 'danger';
  };

  return (
    <div className="rf-dashboard">
      {/* Topbar */}
      <header className="rf-dashboard-topbar">
        <h1 className="rf-dashboard-title">Dashboard</h1>
        
        <div className="rf-dashboard-filters">
          <div className="rf-pill-group">
            {(['semana', 'mes', 'ano', 'tudo'] as Periodo[]).map(p => (
              <button 
                key={p} 
                className={`rf-pill ${periodo === p ? 'is-active' : ''}`}
                onClick={() => setPeriodo(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <div className="rf-pill-group">
            {(['operacional', 'gerencial', 'analitico'] as Visao[]).map(v => (
              <button 
                key={v} 
                className={`rf-pill ${visao === v ? 'is-active' : ''}`}
                onClick={() => setVisao(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button className="btn btn-sm btn-ghost" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </header>

      {/* Linha 1: Stat Cards */}
      <section className="rf-dashboard-row rf-dashboard-row--1">
        <article className="rf-dash-card">
          <span className="rf-stat-label">Faturamento</span>
          <span className="rf-stat-value">{fmt(stats.faturamento)}</span>
          <span className="rf-stat-sub muted">{stats.pedidosEntregues} entregue(s) no período</span>
        </article>

        {visao !== 'operacional' && (
          <article className="rf-dash-card is-success">
            <span className="rf-stat-label">Lucro bruto</span>
            <span className="rf-stat-value text-emerald-600">{fmt(stats.lucroTotal)}</span>
            <span className="rf-stat-sub success font-bold">
              <TrendingUp size={12} strokeWidth={3} /> Margem {stats.margem.toFixed(1)}%
            </span>
          </article>
        )}

        <article className="rf-dash-card">
          <span className="rf-stat-label">Ticket médio</span>
          <span className="rf-stat-value">{fmt(stats.ticketMedio)}</span>
          <span className="rf-stat-sub muted">{stats.totalPedidos} pedido(s) no período</span>
        </article>

        <article className={`rf-dash-card ${stats.valorEmAberto === 0 ? 'is-success' : 'is-warning'}`}>
          <span className="rf-stat-label">Em aberto</span>
          <span className={`rf-stat-value ${stats.valorEmAberto > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {fmt(stats.valorEmAberto)}
          </span>
          <span className={`rf-stat-sub ${stats.valorEmAberto > 0 ? 'warning' : 'success'} font-bold`}>
            {stats.pedidosPendentes} pendências · {stats.valorEmAberto === 0 ? 'Quitado' : 'Aguardando'}
          </span>
        </article>

        {visao !== 'operacional' && (
          <article className={`rf-dash-card ${!filial?.meta_mensal ? 'is-warning' : ''}`}>
            <span className="rf-stat-label">Pacing mensal</span>
            {filial?.meta_mensal ? (
              <>
                <span className={`rf-stat-value ${stats.faturamento >= filial.meta_mensal ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {((stats.faturamento / filial.meta_mensal) * 100).toFixed(1)}%
                </span>
                <span className="rf-stat-sub muted">Meta: {fmt(filial.meta_mensal)}</span>
              </>
            ) : (
              <>
                <span className="rf-stat-value text-slate-400">—%</span>
                <span className="rf-stat-sub muted">Meta não configurada</span>
              </>
            )}
          </article>
        )}
      </section>

      {/* Linha 2: Gráfico + Status */}
      <section className="rf-dashboard-row rf-dashboard-row--2">
        {visao !== 'operacional' && (
          <article className="rf-dash-card">
            <div className="rf-dash-card__header flex-row items-center !mb-6">
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-0.5">Faturamento e Lucro</h2>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest opacity-80">Projeção por período</p>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-tighter bg-[#C5A059]/10 px-1.5 py-0.5 rounded">{periodoDatas}</span>
                </div>
              </div>
              <div className="flex gap-5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.4)]" /> 
                  <span className="text-slate-600">Faturamento</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> 
                  <span className="text-slate-600">Lucro</span>
                </span>
              </div>
            </div>
            <div className="flex-1 mt-6 min-h-[340px]">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart 
                  data={chartData} 
                  margin={{ top: 20, right: 40, left: 20, bottom: 0 }}
                  barCategoryGap={chartData.length < 5 ? "30%" : "15%"}
                  barGap={8}
                >
                  <defs>
                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C5A059" stopOpacity={1}/>
                      <stop offset="95%" stopColor="#C5A059" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="colorLuc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={1}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-2xl p-6 border border-white/60 rounded-3xl shadow-[0_40px_80px_-15px_rgba(15,23,42,0.15)] ring-1 ring-black/5 min-w-[200px] animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center mb-4 pb-3 border-b border-slate-100">
                              <p className="font-black text-slate-900 text-[12px] uppercase tracking-[0.2em] text-center">
                                {payload[0].payload.name}
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-4 items-center">
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Faturamento Bruto</span>
                                <span className="text-xl font-black text-[#C5A059] leading-none tracking-tight">{fmt(payload[0].value as number)}</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Lucro Operacional</span>
                                <span className="text-xl font-black text-[#10B981] leading-none tracking-tight">{fmt(payload[1].value as number)}</span>
                              </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-center gap-1.5 opacity-40">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Analítico Nexus v3</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="faturamento" fill="url(#colorFat)" radius={[8, 8, 0, 0]} barSize={chartData.length < 3 ? 48 : 32} />
                  <Bar dataKey="lucro" fill="url(#colorLuc)" radius={[8, 8, 0, 0]} barSize={chartData.length < 3 ? 48 : 32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        )}

        <article className="rf-dash-card overflow-hidden">
          <div className="rf-dash-card__header">
            <h2 className="rf-dash-card__title">Status dos pedidos</h2>
            <span className="badge badge-sm bg-blue-50 text-blue-600 border-blue-100">{pedidos.length} total</span>
          </div>
          
          <div className="flex flex-col gap-3 mt-2">
            {[...Object.entries(STATUS_CONFIG), ...(statusDistribution['outros'] ? [['outros', { label: 'Outros', color: '#CBD5E1' }]] : [])].map(([key, config]: any) => {
              const count = statusDistribution[key] || 0;
              const perc = pedidos.length > 0 ? (count / pedidos.length) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: config.color }} />
                  <span className="text-[11px] font-medium text-slate-600 w-[100px] truncate">{config.label}</span>
                  <div className="flex-1 h-[5px] bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${perc}%`, background: config.color }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 text-center">Produtos mais faturados</h3>
            <div className="flex flex-col gap-4">
              {topProducts.length > 0 ? topProducts.map((p, i) => (
                <div key={i} className="flex items-start justify-between group">
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-[11px] font-bold text-slate-900 truncate uppercase tracking-tight leading-tight mb-1">{p.nome}</p>
                    {p.variantDisplay ? (
                      <p className="text-[9px] font-semibold text-slate-400 truncate uppercase tracking-wider">{p.variantDisplay}</p>
                    ) : (
                      <p className="text-[9px] font-medium text-slate-300 italic">Produto Base</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 text-right min-w-[100px]">
                    <p className="text-[12px] font-black text-slate-900 leading-none mb-1.5">{fmt(p.receita)}</p>
                    <div className="w-full h-[3px] bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C5A059] rounded-full ml-auto" style={{ width: `${100 - i * 15}%` }} />
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-[10px] text-slate-400 italic text-center py-4">Nenhuma venda no período</p>
              )}
            </div>
          </div>
        </article>
      </section>

      {/* Linha 3: Saúde + Clientes + Alertas */}
      <section className="rf-dashboard-row rf-dashboard-row--3">
        {visao !== 'operacional' && (
          <article className="rf-dash-card">
            <div className="rf-dash-card__header">
              <div>
                <h2 className="rf-dash-card__title">Saúde da operação</h2>
                <p className="rf-dash-card__subtitle">Sinais de maturidade da base</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-2">
              {[
                { label: 'Contato da base', sub: 'WhatsApp ou e-mail', val: healthMetrics.contato, th: [80, 50] },
                { label: 'Estoque saudável', sub: 'Produtos com saldo > 0', val: healthMetrics.estoque, th: [90, 70] },
                { label: 'Mix ativo', sub: 'Saída no período', val: healthMetrics.mix, th: [30, 10] },
                { label: 'Taxa de entrega', sub: 'Pedidos concluídos', val: healthMetrics.entrega, th: [70, 40] }
              ].map(m => (
                <div key={m.label} className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{m.label}</p>
                    <p className="text-[10px] text-slate-500">{m.sub}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-slate-900">{m.val.toFixed(1)}%</span>
                    <StatusBadge tone={getHealthTone(m.val, m.th as [number, number])}>
                      {m.val >= m.th[0] ? 'Saudável' : m.val >= m.th[1] ? 'Atenção' : 'Crítico'}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}

        {visao === 'analitico' && (
          <article className="rf-dash-card">
            <div className="rf-dash-card__header">
              <div>
                <h2 className="rf-dash-card__title">Base de clientes</h2>
                <p className="rf-dash-card__subtitle">{customerMetrics.total} clientes ativos</p>
              </div>
              <StatusBadge tone="success">{customerMetrics.coberturaWhats.toFixed(0)}% alcançável</StatusBadge>
            </div>
            
            <div className="flex flex-col gap-5 mt-2">
              {[
                { label: 'Com WhatsApp', val: customerMetrics.comWhats, color: '#1D9E75' },
                { label: 'Com e-mail', val: customerMetrics.comEmail, color: '#378ADD' },
                { label: 'Opt-in campanhas', val: customerMetrics.optIn, color: '#7F77DD' },
                { label: 'Compraram no período', val: customerMetrics.compraram, color: '#C47B0A' }
              ].map(m => (
                <div key={m.label} className="rf-dash-progress-row">
                  <div className="rf-dash-progress-info">
                    <span className="rf-dash-progress-label">{m.label}</span>
                    <span className="rf-dash-progress-value">{m.val} / {customerMetrics.total}</span>
                  </div>
                  <div className="rf-dash-progress-bar">
                    <div 
                      className="rf-dash-progress-fill" 
                      style={{ width: `${(m.val / customerMetrics.total) * 100}%`, background: m.color }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rf-dash-footer">
              <a href="/app/clientes" className="rf-dash-link">Ver clientes <ChevronRight size={14} /></a>
            </div>
          </article>
        )}

        <article className="rf-dash-card">
          <div className="rf-dash-card__header">
            <div>
              <h2 className="rf-dash-card__title">Alertas e pendências</h2>
              <p className="rf-dash-card__subtitle">Ações que precisam de atenção</p>
            </div>
            <span className={`badge badge-sm ${alerts.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {alerts.length}
            </span>
          </div>

          <div className="rf-dash-list mt-2">
            {alerts.length > 0 ? alerts.map(a => (
              <div key={a.id} className="rf-dash-list-item group">
                <div className={`rf-dash-list-item__icon ${a.tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'} ${a.isPredictive ? 'ring-2 ring-[#C5A059]/20' : ''}`}>
                  {a.isPredictive ? <ArrowUpRight size={18} className="text-[#C5A059]" /> : a.tone === 'danger' ? <AlertCircle size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="rf-dash-list-item__content">
                  <div className="flex items-center gap-2">
                    <p className="rf-dash-list-item__title">{a.title}</p>
                    {a.isPredictive && (
                      <span className="rf-badge-ai">NEXUS AI</span>
                    )}
                  </div>
                  <p className="rf-dash-list-item__desc">{a.desc}</p>
                </div>
                <a href={a.link} className="rf-dash-list-item__action hover:bg-slate-100 px-3 py-1 rounded-md transition-colors">Ver</a>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <p className="text-xs font-semibold text-slate-900">Nenhuma pendência no momento</p>
                <p className="text-[10px] text-slate-500">Operação estável e saudável.</p>
              </div>
            )}
          </div>

          <div className="rf-dash-footer">
            <span className="text-[10px] text-slate-400">Última atualização: {new Date().toLocaleTimeString()}</span>
          </div>
        </article>
      </section>
    </div>
  );
}
