import { useState, useId } from 'react';
import { Legend, Pie, PieChart, Tooltip, Sector, Cell, ResponsiveContainer } from 'recharts';

import { ChartTooltip } from './ChartTooltip';
import { EmptyChartState } from './EmptyChartState';

type ChartRow = Record<string, unknown>;
type ChartValue = number | string | null | undefined;

type SystemDonutChartProps<T extends ChartRow> = {
  data: T[];
  nameKey: keyof T & string;
  valueKey: keyof T & string;
  height?: number;
  valueFormatter?: (value: ChartValue, row?: Record<string, unknown>) => string;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  centerLabel?: string;
  centerValue?: string;
};

const DONUT_COLORS = [
  '#0ea5e9', // sky-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f43f5e'  // rose-500
];

function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 2}
      outerRadius={outerRadius + 4}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.4))' }}
    />
  );
}

function CenterLabel({ cx, cy, label, value }: { cx: number; cy: number; label?: string; value?: string }) {
  if (!value) return null;
  return (
    <g>
      {label && (
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight={600}>
          {label}
        </text>
      )}
      <text x={cx} y={cy + (label ? 12 : 4)} textAnchor="middle" fill="#ffffff" fontSize={18} fontWeight={800} letterSpacing={-0.5}>
        {value}
      </text>
    </g>
  );
}

export function SystemDonutChart<T extends ChartRow>({
  data,
  nameKey,
  valueKey,
  height = 280,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  centerLabel,
  centerValue
}: SystemDonutChartProps<T>) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  if (!data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  // Calculate total for center display if not provided
  const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);
  const displayValue = centerValue ?? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey as string}
            nameKey={nameKey as string}
            innerRadius="52%"
            outerRadius="82%"
            paddingAngle={3}
            stroke="rgba(15,23,42,0.8)"
            strokeWidth={2}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                style={{ 
                  transition: 'opacity 200ms',
                  opacity: activeIndex !== undefined && activeIndex !== index ? 0.45 : 1 
                }}
              />
            ))}
          </Pie>
          {/* Center label overlay */}
          <Pie
            data={[{ value: 1 }]}
            dataKey="value"
            innerRadius={0}
            outerRadius={0}
            isAnimationActive={false}
            label={({ cx, cy }) => <CenterLabel cx={cx} cy={cy} label={centerLabel ?? 'Total'} value={displayValue} />}
          />
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginLeft: 2 }}>{value}</span>
            )}
            wrapperStyle={{ paddingTop: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
