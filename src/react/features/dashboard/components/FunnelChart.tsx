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
  const maxStep = data.reduce((prev, current) => (prev.value > current.value) ? prev : current, data[0]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {data.map((step, index) => {
        const percentOfMax = (step.value / maxVal) * 100;
        // Taxa de conversão em relação ao passo anterior
        const prevValue = index > 0 ? data[index - 1].value : null;
        const conversionRate = prevValue && prevValue > 0 ? (step.value / prevValue) * 100 : null;

        return (
          <div key={step.id} className="relative flex flex-col gap-1 w-full group">
            <div className="flex justify-between items-end mb-1">
              <Typography variant="label" color="muted" className="!text-[10px] uppercase font-bold tracking-tight">
                {step.label}
              </Typography>
              <div className="flex items-center gap-3">
                {conversionRate !== null && (
                  <span className="text-[9px] text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {conversionRate.toFixed(1)}% conversão
                  </span>
                )}
                <span className="text-xs font-black text-white">{step.value}</span>
              </div>
            </div>
            
            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentOfMax}%` }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: step.color }}
              />
              
              {/* Brilho hover */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
