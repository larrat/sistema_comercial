import { useNavigate } from 'react-router-dom';
import { 
  ComposedChart,
  Line,
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, Typography, EmptyState } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

const fmt = (v: number) => fmtBRL(v || 0);

export function SalesPerformanceChart({ chartData, stats, periodoDatas }: { chartData: any[], stats: any, periodoDatas: string }) {
  const navigate = useNavigate();

  return (
    <Card padding="none" variant="glass" className="h-full flex flex-col justify-between transition-all duration-300 hover:shadow-2xl">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="space-y-0.5">
          <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Desempenho Comercial</Typography>
          <Typography variant="caption" color="muted">Faturamento vs Lucro Bruto</Typography>
        </div>
        <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-sm font-medium text-slate-400">
          {periodoDatas}
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div 
          className="h-72 w-full mt-2" 
          role="figure" 
          aria-label={`Gráfico de área exibindo o faturamento e lucro ao longo do período: ${periodoDatas}`}
        >
          {chartData.length === 0 ? (
            <EmptyState 
              icon={<TrendingUp size={32} className="text-slate-500" />} 
              title="Nenhum registro comercial" 
              description="Não existem vendas registradas para o período selecionado." 
            />
          ) : (
            <ComposedChart responsive width="100%" height="100%" data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} onClick={(data: any) => { if (data && data.activePayload) navigate('/app/pedidos'); }}>
              <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-amber-vibrant)" stopOpacity={0.5}/>
                    <stop offset="60%" stopColor="var(--color-amber-vibrant)" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="var(--color-amber-vibrant)" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="areaGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.15)] ring-1 ring-white/10 min-w-[180px] animate-in zoom-in-95 duration-100">
                        <p className="mb-3 border-b border-white/5 pb-2 text-sm font-medium text-slate-400">{label}</p>
                        <div className="space-y-3">
                          {payload.map((entry: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: entry.color, color: entry.color }} />
                                <span className="text-sm font-medium text-slate-400">{entry.name}</span>
                              </div>
                              <span className="text-xs font-black text-white">{fmt(entry.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Line type="monotone" dataKey="faturamentoAnt" name="Período Anterior" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento Atual" stroke="var(--color-amber-vibrant)" strokeWidth={4} fillOpacity={1} fill="url(#colorFat)" style={{ filter: 'url(#areaGlow)' }} activeDot={{ r: 6, fill: 'var(--color-amber-vibrant)', stroke: '#fff', strokeWidth: 2, filter: 'url(#areaGlow)' }} />
            </ComposedChart>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-white/5">
          {[
            { label: 'Melhor Dia', val: Math.max(...chartData.map((d: any) => d.faturamento), 0) },
            { label: 'Média Diária', val: chartData.length > 0 ? chartData.reduce((acc: any, d: any) => acc + d.faturamento, 0) / chartData.length : 0 },
            { label: 'Total Período', val: chartData.reduce((acc: any, d: any) => acc + d.faturamento, 0) },
            { label: 'Margem Bruta', val: stats.margem, suffix: '%' }
          ].map((m, i) => (
            <div key={i}>
              <span className="block mb-1 text-sm font-medium text-slate-400">{m.label}</span>
              <span className="block text-lg font-black text-white">
                {m.suffix ? `${m.val.toFixed(1)}%` : fmt(m.val)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
