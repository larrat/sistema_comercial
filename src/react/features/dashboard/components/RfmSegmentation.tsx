import React from 'react';
import { motion } from 'framer-motion';
import { fmtBRL } from '../../../shared/lib/formatters';

type RfmGroup = {
  name: string;
  size: number;
  value: number;
  color: string;
};

type RfmSegmentationProps = {
  data: RfmGroup[];
};

export function RfmSegmentation({ data }: RfmSegmentationProps) {
  if (!data || data.length === 0) return null;

  const totalClients = data.reduce((acc, d) => acc + d.size, 0);

  return (
    <div className="flex flex-col gap-4 w-full">
      {data.map((item, index) => {
        const percent = totalClients > 0 ? (item.size / totalClients) * 100 : 0;
        return (
          <div key={item.name} className="flex flex-col gap-1.5 group">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="group-hover:text-white transition-colors text-sm font-medium text-slate-400">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-400">
                  {item.size} {item.size === 1 ? 'cliente' : 'clientes'} ({percent.toFixed(0)}%)
                </span>
                <span className="text-xs font-black text-white">{fmtBRL(item.value)}</span>
              </div>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
