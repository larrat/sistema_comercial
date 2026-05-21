import React from 'react';
import { motion } from 'framer-motion';
import { Typography } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

type RcaRankingItem = {
  id: string;
  nome: string;
  faturamento: number;
};

type RcaRankingChartProps = {
  data: RcaRankingItem[];
};

export function RcaRankingChart({ data }: RcaRankingChartProps) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.faturamento), 1);

  return (
    <div className="flex flex-col gap-4 w-full">
      {data.map((item, index) => {
        const percentOfMax = (item.faturamento / maxVal) * 100;

        return (
          <div key={item.id} className="relative flex flex-col gap-1 w-full group">
            <div className="flex justify-between items-end mb-1">
              <Typography variant="label" color="muted" className="!text-[10px] uppercase font-bold tracking-tight">
                {index + 1}. {item.nome}
              </Typography>
              <span className="text-xs font-black text-white">{fmtBRL(item.faturamento)}</span>
            </div>
            
            <div className="h-2 w-full bg-[#1e293b] rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentOfMax}%` }}
                transition={{ duration: 0.8, delay: index * 0.05, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: '#818cf8' }}
              />
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
