import { fmtBRL } from '../../../shared/lib/formatters';
import { Typography } from '../../../shared/ui/Typography';
import { useRelatoriosStore } from '../store/useRelatoriosStore';

function fmt(v: number): string {
  return fmtBRL(v);
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

  const maxStatusValue = Math.max(1, ...statusData.map(d => d.value));

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
    
  const maxClienteValue = Math.max(1, ...clientesData.map(d => d.value));

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
        <div className="rf-bento-item rf-bento-span-6 rf-glass-glow shadow-2xl !p-8 border border-white/5">
          <Typography variant="h3" weight="black" className="uppercase tracking-tight mb-8">Distribuição por Status</Typography>
          <div className="flex flex-col gap-3 mt-4">
            {statusData.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-200 truncate">{item.name}</span>
                  <span className="text-emerald-400 font-bold">{item.value}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${Math.min(100, (item.value / maxStatusValue) * 100)}%` }} 
                  />
                </div>
              </div>
            ))}
            {statusData.length === 0 && <span className="text-slate-500 italic">Sem dados.</span>}
          </div>
        </div>

        {/* Top Clientes */}
        <div className="rf-bento-item rf-bento-span-6 rf-glass-glow shadow-2xl !p-8 border border-white/5">
          <Typography variant="h3" weight="black" className="uppercase tracking-tight mb-8">Top 8 Clientes (Faturamento)</Typography>
          <div className="flex flex-col gap-3 mt-4">
            {clientesData.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-200 truncate pr-4">{item.name}</span>
                  <span className="text-teal-400 font-bold">{fmt(item.value)}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 rounded-full" 
                    style={{ width: `${Math.min(100, (item.value / maxClienteValue) * 100)}%` }} 
                  />
                </div>
              </div>
            ))}
            {clientesData.length === 0 && <span className="text-slate-500 italic">Sem dados.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
