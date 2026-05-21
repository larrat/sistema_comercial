import React from 'react';
import { motion } from 'framer-motion';
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
    <div className="flex flex-col gap-5 w-full">
      {/* Segmented aging bar */}
      <div className="flex w-full h-3 rounded-full overflow-hidden bg-[#1e293b] gap-[2px]">
        {data.map((bucket, index) => {
          if (bucket.value === 0) return null;
          const percent = (bucket.value / total) * 100;
          return (
            <motion.div
              key={bucket.id}
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, delay: index * 0.05, ease: 'easeOut' }}
              className="h-full first:rounded-l-full last:rounded-r-full hover:brightness-110 transition-all cursor-help"
              style={{ backgroundColor: bucket.color }}
              title={`${bucket.label}: ${fmtBRL(bucket.value)} (${percent.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Structured details list */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 mt-2">
        {data.map(bucket => {
          const percent = total > 0 ? (bucket.value / total) * 100 : 0;
          return (
            <div key={bucket.id} className="flex items-center justify-between border-b border-white/[0.02] pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: bucket.color }} />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                  {bucket.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1 text-right pl-2">
                <span className="text-xs font-black text-white">{fmtBRL(bucket.value)}</span>
                {bucket.value > 0 && (
                  <span className="text-[8px] font-bold text-slate-500">
                    ({percent.toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
