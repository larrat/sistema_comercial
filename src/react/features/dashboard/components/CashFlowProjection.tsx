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
    <div className="w-full h-48 group">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity={1} />
              <stop offset="100%" stopColor="#0f766e" stopOpacity={0.4} />
            </linearGradient>
            <filter id="neonGlowBar" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-[0_0_30px_rgba(45,212,191,0.15)] ring-1 ring-white/10 min-w-[160px] animate-in zoom-in-95 duration-100">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{label}</p>
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
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
          <Bar 
            dataKey="receita" 
            fill="url(#barGradient)" 
            radius={[6, 6, 0, 0]} 
            maxBarSize={40} 
            className="transition-all duration-300 hover:filter-[url(#neonGlowBar)]"
            style={{ filter: 'url(#neonGlowBar)' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
