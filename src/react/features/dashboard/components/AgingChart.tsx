import React from 'react';
import { motion } from 'framer-motion';
import { Typography } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

type AgingBucket = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type AgingChartProps = {
  data: AgingBucket[];
};

export function AgingChart({ data }: AgingChartProps) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex w-full h-4 rounded-full overflow-hidden bg-white/5 gap-0.5">
        {data.map((bucket, index) => {
          if (bucket.value === 0) return null;
          const percent = (bucket.value / total) * 100;
          return (
            <motion.div
              key={bucket.id}
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ backgroundColor: bucket.color }}
              title={`${bucket.label}: ${fmtBRL(bucket.value)}`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        {data.map(bucket => (
          <div key={bucket.id} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bucket.color }} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bucket.label}</span>
            </div>
            <span className="text-xs font-black text-white ml-3.5">{fmtBRL(bucket.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
