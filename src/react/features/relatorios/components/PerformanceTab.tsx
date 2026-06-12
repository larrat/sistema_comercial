import { fmtBRL } from '../../../shared/lib/formatters';
import { Typography } from '../../../shared/ui/Typography';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { SystemDonutChart, SystemBarChart } from '../../../app/components/charts';

function fmt(v: number | string | null | undefined): string {
  return fmtBRL(Number(v) || 0);
}

export function PerformanceTab() {
  const pedidos = useRelatoriosStore((s) => s.pedidos);

  const entregues = pedidos.filter((p) => p.status === 'entregue');
  const faturamento = entregues.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const ticketMedio = entregues.length ? faturamento / entregues.length : 0;

  const statusData = Object.entries(
    pedidos.reduce<Record<string, number>>((acc, p) => {
      const key = String(p.status || 'sem_status').replace(/_/g, ' ').toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }))
   .sort((a, b) => b.value - a.value);

  const clientesData = Object.entries(
    pedidos.reduce<Record<string, { total: number }>>((acc, p) => {
      const key = String(p.cli || 'Sem cliente');
      if (!acc[key]) acc[key] = { total: 0 };
      acc[key].total += Number(p.total || 0);
      return acc;
    }, {})
  )
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8)
    .map(([name, data]) => ({ name, value: data.total }));

  return (
    <div className="space-y-8">
      {/* KPIs de Topo */}
      <div className="rf-bento-grid">
        <div className="rf-bento-item rf-bento-span-3 rf-glass flex flex-col gap-1 border border-white/5 shadow-xl">
          <Typography variant="label" color="muted">Total de Pedidos</Typography>
          <Typography variant="h2" weight="black" className="text-white font-display">
            {pedidos.length}
          </Typography>
        </div>
        <div className="rf-bento-item rf-bento-span-3 rf-glass flex flex-col gap-1 border border-white/5 shadow-xl">
          <Typography variant="label" color="muted">Pedidos Entregues</Typography>
          <Typography variant="h2" weight="black" className="text-emerald-400 font-display">
            {entregues.length}
          </Typography>
        </div>
        <div className="rf-bento-item rf-bento-span-3 rf-glass flex flex-col gap-1 border border-white/5 shadow-xl">
          <Typography variant="label" color="muted">Faturamento</Typography>
          <Typography variant="h2" weight="black" className="text-white font-display">
            {fmt(faturamento)}
          </Typography>
        </div>
        <div className="rf-bento-item rf-bento-span-3 rf-glass flex flex-col gap-1 border border-white/5 shadow-xl">
          <Typography variant="label" color="muted">Ticket Médio</Typography>
          <Typography variant="h2" weight="black" className="text-amber-400 font-display">
            {fmt(ticketMedio)}
          </Typography>
        </div>
      </div>

      <div className="rf-bento-grid">
        {/* Distribuição por Status */}
        <div className="rf-bento-item rf-bento-span-6 rf-glass-glow shadow-2xl !p-6 border border-white/5 flex flex-col">
          <Typography variant="h3" weight="black" className="uppercase tracking-tight mb-4">Distribuição por Status</Typography>
          <div className="flex-1 mt-2">
            <SystemDonutChart 
              data={statusData}
              nameKey="name"
              valueKey="value"
              height={300}
              centerLabel="Pedidos"
              centerValue={String(pedidos.length)}
              emptyTitle="Sem dados"
              emptyDescription="Nenhum pedido encontrado."
            />
          </div>
        </div>

        {/* Top Clientes */}
        <div className="rf-bento-item rf-bento-span-6 rf-glass-glow shadow-2xl !p-6 border border-white/5 flex flex-col">
          <Typography variant="h3" weight="black" className="uppercase tracking-tight mb-4">Top 8 Clientes (Faturamento)</Typography>
          <div className="flex-1 mt-2">
            <SystemBarChart 
              data={clientesData}
              xKey="name"
              series={[{ key: 'value', label: 'Faturamento', color: '#10b981' }]}
              height={300}
              valueFormatter={fmt}
              emptyTitle="Sem dados"
              emptyDescription="Nenhum faturamento registrado."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
