import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fmtBRL } from '../../../shared/lib/formatters';

type CashFlowData = {
  name: string;
  receita: number;
};

type CashFlowProjectionProps = {
  data: CashFlowData[];
};

export function CashFlowProjection({ data }: CashFlowProjectionProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl ring-1 ring-white/10 min-w-[160px]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{label}</p>
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-400" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">A Receber</span>
                      </div>
                      <span className="text-xs font-black text-white">{fmtBRL(payload[0].value as number)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }} 
          />
          <Bar dataKey="receita" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
