import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fmtBRL } from '../../../shared/lib/formatters';
import { Typography } from '../../../shared/ui/Typography';
import { useRelatoriosStore } from '../store/useRelatoriosStore';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#64748b'];

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
        <div className="rf-bento-item rf-bento-span-6 rf-glass-glow shadow-2xl !p-8 border border-white/5 flex flex-col">
          <Typography variant="h3" weight="black" className="uppercase tracking-tight mb-8">Distribuição por Status</Typography>
          <div className="flex-1 min-h-[300px] mt-4 relative">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value} pedidos`, 'Quantidade']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-500 italic">Sem dados.</span>
            )}
            
            {/* Custom Legend */}
            {statusData.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                {statusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-sm text-slate-300 font-medium">{item.name}</span>
                    <span className="text-sm text-slate-400 font-bold ml-1">({item.value})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Clientes */}
        <div className="rf-bento-item rf-bento-span-6 rf-glass-glow shadow-2xl !p-8 border border-white/5 flex flex-col">
          <Typography variant="h3" weight="black" className="uppercase tracking-tight mb-8">Top 8 Clientes (Faturamento)</Typography>
          <div className="flex-1 min-h-[300px] mt-4 relative">
            {clientesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientesData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => val.length > 10 ? `${val.substring(0, 10)}...` : val}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
                    formatter={(value: number) => [fmt(value), 'Faturamento']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {clientesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-500 italic">Sem dados.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
