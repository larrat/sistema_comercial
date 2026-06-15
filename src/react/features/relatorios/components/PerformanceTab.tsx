import { fmtBRL } from '../../../shared/lib/formatters';
import { Typography } from '../../../shared/ui/Typography';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { SystemDonutChart, SystemBarChart, SystemHeatmapChart, SparklineInline, ChartFilterProvider, useChartFilter } from '../../../app/components/charts';
import { ChartCard } from '../../../app/components/charts/ChartCard';

function fmt(v: number | string | null | undefined): string {
  return fmtBRL(Number(v) || 0);
}

function PerformanceTabContent() {
  const pedidos = useRelatoriosStore((s) => s.pedidos);

  const entregues = pedidos.filter((p) => p.status === 'entregue' || p.status === 'concluido' || p.status === 'entregue_aguardando_pagamento');
  const faturamento = entregues.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const ticketMedio = entregues.length ? faturamento / entregues.length : 0;

  const { getFilter, setFilter } = useChartFilter();
  const selectedSeller = getFilter('seller');

  const filteredPedidos = selectedSeller ? pedidos.filter(p => p.rca_nome === selectedSeller) : pedidos;

  const filteredEntregues = filteredPedidos.filter((p) => p.status === 'entregue' || p.status === 'concluido' || p.status === 'entregue_aguardando_pagamento');
  const filteredFaturamento = filteredEntregues.reduce((acc, p) => acc + Number(p.total || 0), 0);

  // Heatmap Data (Sales by Day of Week / Hour)
  const heatmapData = [
    { name: 'Seg', data: Array.from({ length: 14 }, (_, i) => ({ x: `${i+8}h`, y: 0 })) },
    { name: 'Ter', data: Array.from({ length: 14 }, (_, i) => ({ x: `${i+8}h`, y: 0 })) },
    { name: 'Qua', data: Array.from({ length: 14 }, (_, i) => ({ x: `${i+8}h`, y: 0 })) },
    { name: 'Qui', data: Array.from({ length: 14 }, (_, i) => ({ x: `${i+8}h`, y: 0 })) },
    { name: 'Sex', data: Array.from({ length: 14 }, (_, i) => ({ x: `${i+8}h`, y: 0 })) },
    { name: 'Sáb', data: Array.from({ length: 14 }, (_, i) => ({ x: `${i+8}h`, y: 0 })) },
  ];

  filteredEntregues.forEach(p => {
    const d = new Date(p.criado_em || p.data || '');
    if (isNaN(d.getTime())) return;
    const day = d.getDay(); // 0 = Sun, 1 = Mon...
    if (day === 0) return; // Ignore Sunday for now
    const hour = d.getHours();
    if (hour >= 8 && hour <= 21) {
      heatmapData[day - 1].data[hour - 8].y += Number(p.total || 0);
    }
  });

  // Stacked Bar Data (Faturamento por Vendedor e Status)
  const sellerMap: Record<string, { seller: string; entregue: number; aberto: number }> = {};
  pedidos.forEach(p => {
    const s = p.rca_nome || 'Sem Vendedor';
    if (!sellerMap[s]) sellerMap[s] = { seller: s, entregue: 0, aberto: 0 };
    const val = Number(p.total || 0);
    if (['entregue', 'concluido', 'entregue_aguardando_pagamento'].includes(p.status)) {
      sellerMap[s].entregue += val;
    } else if (p.status !== 'cancelado') {
      sellerMap[s].aberto += val;
    }
  });
  const sellerData = Object.values(sellerMap).sort((a, b) => (b.entregue + b.aberto) - (a.entregue + a.aberto)).slice(0, 10);

  return (
    <div className="space-y-8">
      {/* KPIs de Topo */}
      <div className="rf-bento-grid">
        <div className="rf-bento-item rf-bento-span-3 rf-glass flex flex-col gap-1 border border-white/5 shadow-xl relative overflow-hidden group">
          <Typography variant="label" color="muted">Total de Pedidos</Typography>
          <div className="flex items-end justify-between">
            <Typography variant="h2" weight="black" className="text-white font-display">
              {filteredPedidos.length}
            </Typography>
            <SparklineInline data={[12, 14, 18, 15, 22, 25, filteredPedidos.length]} type="bar" color="#64748b" width={80} height={30} />
          </div>
        </div>
        <div className="rf-bento-item rf-bento-span-3 rf-glass flex flex-col gap-1 border border-white/5 shadow-xl relative overflow-hidden group">
          <Typography variant="label" color="muted">Pedidos Faturados</Typography>
          <div className="flex items-end justify-between">
            <Typography variant="h2" weight="black" className="text-emerald-400 font-display">
              {filteredEntregues.length}
            </Typography>
            <SparklineInline data={[10, 12, 16, 14, 20, 24, filteredEntregues.length]} type="area" color="#10b981" width={80} height={30} />
          </div>
        </div>
        <div className="rf-bento-item rf-bento-span-3 rf-glass flex flex-col gap-1 border border-white/5 shadow-xl relative overflow-hidden group">
          <Typography variant="label" color="muted">Faturamento</Typography>
          <div className="flex items-end justify-between">
            <Typography variant="h2" weight="black" className="text-white font-display">
              {fmt(filteredFaturamento)}
            </Typography>
            <SparklineInline data={[200, 300, 250, 400, 350, 500, filteredFaturamento/1000]} type="area" color="#3b82f6" width={80} height={30} />
          </div>
        </div>
        <div className="rf-bento-item rf-bento-span-3 rf-glass flex flex-col gap-1 border border-white/5 shadow-xl relative overflow-hidden group">
          <Typography variant="label" color="muted">Ticket Médio</Typography>
          <div className="flex items-end justify-between">
            <Typography variant="h2" weight="black" className="text-amber-400 font-display">
              {fmt(filteredEntregues.length ? filteredFaturamento / filteredEntregues.length : 0)}
            </Typography>
            <SparklineInline data={[150, 160, 155, 170, 165, 180, ticketMedio]} type="line" color="#f59e0b" width={80} height={30} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <ChartCard 
          title="Faturamento por Vendedor" 
          description="Performance de vendas empilhada por status"
          isFilterActive={!!selectedSeller}
          action={selectedSeller && (
            <button onClick={() => setFilter('seller', null)} className="text-[10px] uppercase font-bold text-teal-400 bg-teal-400/10 px-2 py-1 rounded-md hover:bg-teal-400/20">
              Limpar Filtro
            </button>
          )}
        >
          <SystemBarChart 
            data={sellerData}
            xKey="seller"
            filterKey="seller"
            stacked
            layout="vertical"
            series={[
              { key: 'entregue', label: 'Faturado', color: '#10b981' },
              { key: 'aberto', label: 'Em Aberto', color: '#3b82f6' }
            ]}
            height={320}
            valueFormatter={fmt}
          />
        </ChartCard>

        <ChartCard 
          title="Heatmap de Vendas" 
          description="Faturamento (Faturado) por Dia da Semana e Hora"
        >
          <SystemHeatmapChart 
            series={heatmapData}
            height={320}
            valueFormatter={fmt}
          />
        </ChartCard>
      </div>
    </div>
  );
}

export function PerformanceTab() {
  return (
    <ChartFilterProvider>
      <PerformanceTabContent />
    </ChartFilterProvider>
  );
}
