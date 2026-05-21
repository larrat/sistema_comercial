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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-3 rounded-2xl shadow-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">{label}</p>
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-[10px] font-bold text-teal-400 uppercase">A Receber</span>
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
