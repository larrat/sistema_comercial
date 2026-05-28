import React from 'react';
import { motion } from 'framer-motion';
import { Typography } from '../../../shared/ui';

type FunnelStep = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type FunnelChartProps = {
  data: FunnelStep[];
};

export function FunnelChart({ data }: FunnelChartProps) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value), 1); // evita divisao por zero

  return (
    <div className="flex flex-col gap-4 w-full">
      {data.map((step, index) => {
        const percentOfMax = (step.value / maxVal) * 100;
        const prevValue = index > 0 ? data[index - 1].value : null;
        const conversionRate = prevValue && prevValue > 0 ? (step.value / prevValue) * 100 : null;

        // Extraindo a cor base pura (sem var) para simular rgba em inline style, mas como temos CSS vars, vamos tentar compor.
        // Assumindo que step.color é algo como "var(--color-indigo-vibrant)". 
        // Em CSS moderno podemos usar color-mix.
        
        return (
          <div key={step.id} className="relative flex flex-col gap-1.5 w-full group">
            <div className="flex justify-between items-end mb-1">
              <Typography variant="label" color="muted" className="!text-[10px] uppercase font-bold tracking-widest text-slate-400 group-hover:text-slate-300 transition-colors">
                {step.label}
              </Typography>
              <div className="flex items-center gap-3">
                {conversionRate !== null && (
                  <span className="text-[10px] font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: `color-mix(in srgb, ${step.color} 80%, white)` }}>
                    {conversionRate.toFixed(1)}% <span className="text-slate-600">cv</span>
                  </span>
                )}
                <span className="text-sm font-black text-white group-hover:scale-110 transition-transform origin-right">
                  {step.value}
                </span>
              </div>
            </div>
            
            <div className="h-3 w-full bg-slate-900/50 rounded-full overflow-hidden relative ring-1 ring-white/5 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentOfMax}%` }}
                transition={{ duration: 1, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }} // smooth spring-like ease
                className="h-full rounded-full relative overflow-hidden"
                style={{ 
                  background: `linear-gradient(90deg, color-mix(in srgb, ${step.color} 20%, transparent) 0%, ${step.color} 100%)`,
                  boxShadow: `0 0 15px color-mix(in srgb, ${step.color} 60%, transparent), inset 0 2px 4px rgba(255,255,255,0.2)`
                }}
              >
                {/* Efeito de Reflexo de Vidro (Glass Shimmer) */}
                <div className="absolute inset-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/20 to-transparent" />
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
