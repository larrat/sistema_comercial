import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceDot
} from 'recharts';

import { ChartTooltip } from './ChartTooltip';
import { EmptyChartState } from './EmptyChartState';

type ChartRow = Record<string, unknown>;
type ChartValue = number | string | null | undefined;

type SystemAreaChartProps<T extends ChartRow> = {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  height?: number;
  valueFormatter?: (value: ChartValue, row?: Record<string, unknown>) => string;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  hideYAxis?: boolean;
  color?: string;
};

export function SystemAreaChart<T extends ChartRow>({
  data,
  xKey,
  yKey,
  height = 240,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  hideYAxis = false,
  color = '#06b6d4'
}: SystemAreaChartProps<T>) {
  const uid = useId().replace(/:/g, '');

  if (!data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={`area-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="50%" stopColor={color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="rgba(148,163,184,0.08)"
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey={xKey as string}
            axisLine={false}
            tickLine={false}
            tickMargin={12}
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
          />
          <YAxis
            hide={hideYAxis}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
            tickFormatter={(v) => {
              if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
              return String(v);
            }}
          />
          <Tooltip
            cursor={{ stroke: color, strokeDasharray: '4 4', strokeOpacity: 0.4 }}
            content={<ChartTooltip valueFormatter={valueFormatter} />}
          />
          <Area
            type="monotone"
            dataKey={yKey as string}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#area-fill-${uid})`}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: color,
              fill: '#0f172a'
            }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
