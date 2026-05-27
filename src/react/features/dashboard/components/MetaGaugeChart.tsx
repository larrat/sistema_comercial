import React from 'react';
import { PieChart, Pie, Sector } from 'recharts';
import { Typography } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

type MetaGaugeChartProps = {
  faturamento: number;
  meta: number;
};

export function MetaGaugeChart({ faturamento, meta }: MetaGaugeChartProps) {
  if (!meta || meta <= 0) return null;

  const percent = Math.min((faturamento / meta) * 100, 100);
  const remaining = 100 - percent;
  
  let color = '#fbbf24'; // Amarelo (abaixo)
  let textClass = 'text-amber-400';
  if (percent >= 100) { color = '#10b981'; textClass = 'text-emerald-400'; }
  else if (percent >= 80) { color = '#34d399'; textClass = 'text-emerald-400'; }
  else if (percent < 50) { color = '#ef4444'; textClass = 'text-rose-400'; }

  const data = [
    { name: 'Atingido', value: percent, fill: color },
    { name: 'Restante', value: remaining, fill: '#1e293b' }
  ];

  return (
    <div className="flex flex-col items-center relative">
      <div className="h-32 w-full mt-4">
        <PieChart responsive width="100%" height="100%">
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={70}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            shape={(props: any) => (
              <Sector
                cx={props.cx}
                cy={props.cy}
                innerRadius={props.innerRadius}
                outerRadius={props.outerRadius}
                startAngle={props.startAngle}
                endAngle={props.endAngle}
                fill={props.payload.fill}
              />
            )}
          />
        </PieChart>
      </div>
      <div className="absolute bottom-2 flex flex-col items-center">
        <Typography variant="h3" weight="black" className={`!text-3xl ${textClass}`}>
          {percent.toFixed(1)}%
        </Typography>
        <Typography variant="label" color="muted" className="!text-[10px] uppercase tracking-widest mt-1">
          {fmtBRL(faturamento)} / {fmtBRL(meta)}
        </Typography>
      </div>
    </div>
  );
}
