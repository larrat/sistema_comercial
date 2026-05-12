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
  orcamento: { label: 'Orçamento', color: '#888' },
  em_separacao: { label: 'Em separação', color: '#378ADD' },
  entregue_aguardando_pagamento: { label: 'Entregue · aguardando pgto', color: '#C47B0A' },
  pago_aguardando_entrega: { label: 'Pago · aguardando entrega', color: '#7F77DD' },
  concluido: { label: 'Concluído', color: '#1D9E75' },
  cancelado: { label: 'Cancelado', color: '#C0392B' }
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
    const validPedidos = pedidos.filter(p => !['cancelado', 'em_andamento'].includes(p.status));
    const finishedPedidos = pedidos.filter(p => ['entregue_aguardando_pagamento', 'pago_aguardando_entrega', 'concluido'].includes(p.status));
    
    const faturamento = finishedPedidos.reduce((acc, p) => acc + Number(p.total || 0), 0);
    
    let lucroTotal = 0;
    validPedidos.forEach(p => {
      const items = (p.itens || []) as PedidoItem[];
      items.forEach(item => {
        const preco = Number(item.preco || 0);
        const custo = Number(item.custo || 0);
        const qty = Number(item.qty || 0);
        lucroTotal += (preco - custo) * qty;
      });
    });

    const ticketMedio = validPedidos.length > 0 ? faturamento / validPedidos.length : 0;
    const valorEmAberto = contasReceber.reduce((acc, c) => acc + Number(c.valor_em_aberto || 0), 0);
    
    return {
      faturamento,
      lucroTotal,
      margem: faturamento > 0 ? (lucroTotal / faturamento) * 100 : 0,
      ticketMedio,
      valorEmAberto,
      totalPedidos: validPedidos.length,
      pedidosEntregues: finishedPedidos.length,
      pedidosPendentes: contasReceber.length
    };
  }, [pedidos, contasReceber]);

  const chartData = useMemo(() => {
    const groups: Record<string, { name: string; faturamento: number; lucro: number }> = {};
    
    pedidos.forEach(p => {
      if (p.status === 'cancelado') return;
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
  }, [pedidos, periodo]);

  const topProducts = useMemo(() => {
    const productSales: Record<string, { nome: string; receita: number }> = {};
    pedidos.forEach(p => {
      if (p.status === 'cancelado') return;
      const items = (p.itens || []) as PedidoItem[];
      items.forEach(item => {
        if (!item.prodId) return;
        if (!productSales[item.prodId]) productSales[item.prodId] = { nome: item.nome || 'Produto', receita: 0 };
        productSales[item.prodId].receita += Number(item.preco || 0) * Number(item.qty || 0);
      });
    });
    return Object.values(productSales)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [pedidos]);

  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    pedidos.forEach(p => {
      dist[p.status] = (dist[p.status] || 0) + 1;
    });
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
        title: `Estoque zerado em ${healthMetrics.zeroStockCount} produtos`,
        desc: 'Nenhum produto com saldo disponível',
        link: '/app/estoque',
        tone: 'danger'
      });
    }

    if (healthMetrics.mix < 10 && stats.totalPedidos > 0) {
      list.push({
        id: 'mix-baixo',
        title: 'Mix ativo crítico',
        desc: 'Menos de 10% dos produtos ativos tiveram saída no período',
        link: '/app/produtos',
        tone: 'danger'
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
            <span className="rf-stat-value !text-emerald-600">{fmt(stats.lucroTotal)}</span>
            <span className="rf-stat-sub success">
              <TrendingUp size={12} /> Margem {stats.margem.toFixed(1)}%
            </span>
          </article>
        )}

        <article className="rf-dash-card">
          <span className="rf-stat-label">Ticket médio</span>
          <span className="rf-stat-value">{fmt(stats.ticketMedio)}</span>
          <span className="rf-stat-sub muted">{stats.totalPedidos} pedido(s) no período</span>
        </article>

        <article className={`rf-dash-card ${stats.valorEmAberto === 0 ? 'is-success' : ''}`}>
          <span className="rf-stat-label">Em aberto</span>
          <span className={`rf-stat-value ${stats.valorEmAberto > 0 ? '!text-amber-600' : '!text-emerald-600'}`}>
            {fmt(stats.valorEmAberto)}
          </span>
          <span className={`rf-stat-sub ${stats.valorEmAberto > 0 ? 'warning' : 'success'}`}>
            {stats.pedidosPendentes} pendências · {stats.valorEmAberto === 0 ? 'Quitado' : 'Aguardando'}
          </span>
        </article>

        {visao !== 'operacional' && (
          <article className={`rf-dash-card ${!filial?.meta_mensal ? 'is-warning' : ''}`}>
            <span className="rf-stat-label">Pacing mensal</span>
            {filial?.meta_mensal ? (
              <>
                <span className={`rf-stat-value ${stats.faturamento >= filial.meta_mensal ? '!text-emerald-600' : '!text-amber-600'}`}>
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
            <div className="rf-dash-card__header">
              <div>
                <h2 className="rf-dash-card__title">Faturamento e Lucro</h2>
                <p className="rf-dash-card__subtitle">Visão por período selecionado</p>
              </div>
              <div className="flex gap-4 text-[10px] font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#378ADD]" /> Faturamento</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1D9E75]" /> Lucro</span>
              </div>
            </div>
            <div className="flex-1 mt-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-xl text-xs">
                            <p className="font-bold mb-2 text-slate-900 border-b pb-1">{payload[0].payload.name}</p>
                            <div className="flex flex-col gap-1">
                              <span className="text-blue-600 font-semibold">Fat: {fmt(payload[0].value as number)}</span>
                              <span className="text-emerald-600 font-semibold">Luc: {fmt(payload[1].value as number)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="faturamento" fill="#378ADD" radius={[3, 3, 0, 0]} barSize={20} />
                  <Bar dataKey="lucro" fill="#1D9E75" radius={[3, 3, 0, 0]} barSize={20} />
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
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = statusDistribution[key] || 0;
              const perc = pedidos.length > 0 ? (count / pedidos.length) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                  <span className="text-[11px] font-medium text-slate-600 w-[100px] truncate">{config.label}</span>
                  <div className="flex-1 h-[5px] bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${perc}%`, background: config.color }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="rf-dash-card__title mb-4">Top produtos</h3>
            <div className="flex flex-col gap-3">
              {topProducts.length > 0 ? topProducts.map((p, i) => {
                const max = topProducts[0].receita;
                const perc = max > 0 ? (p.receita / max) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-slate-700 truncate max-w-[180px]">{p.nome}</span>
                      <span className="font-bold text-slate-900">{fmt(p.receita)}</span>
                    </div>
                    <div className="h-[4px] bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${perc}%` }} />
                    </div>
                  </div>
                );
              }) : <p className="text-center text-xs text-slate-400 py-4">Nenhum produto vendido no período.</p>}
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
              <div key={a.id} className="rf-dash-list-item">
                <div className={`rf-dash-list-item__icon ${a.tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                  {a.tone === 'danger' ? <AlertCircle size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="rf-dash-list-item__content">
                  <p className="rf-dash-list-item__title">{a.title}</p>
                  <p className="rf-dash-list-item__desc">{a.desc}</p>
                </div>
                <a href={a.link} className="rf-dash-list-item__action">Ver</a>
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
