import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { ChartTooltip } from './ChartTooltip';
import { EmptyChartState } from './EmptyChartState';

type ChartRow = Record<string, unknown>;
type ChartValue = number | string | null | undefined;

type BarChartSeries<T extends ChartRow> = {
  key: keyof T & string;
  label: string;
  color: string;
};

type SystemBarChartProps<T extends ChartRow> = {
  data: T[];
  xKey: keyof T & string;
  series: BarChartSeries<T>[];
  height?: number;
  valueFormatter?: (value: ChartValue, row?: Record<string, unknown>) => string;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  hideYAxis?: boolean;
};

export function SystemBarChart<T extends ChartRow>({
  data,
  xKey,
  series,
  height = 220,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  hideYAxis = true
}: SystemBarChartProps<T>) {
  const gradientId = useId().replace(/:/g, '');

  if (!data.length || !series.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <defs>
            {series.map((item, index) => (
              <linearGradient
                key={item.key}
                id={`${gradientId}-bar-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity="1" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0.6" />
              </linearGradient>
            ))}
          </defs>
          <XAxis
            dataKey={xKey as string}
            axisLine={false}
            tickLine={false}
            tickMargin={12}
            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
          />
          <YAxis hide={hideYAxis} axisLine={false} tickLine={false} />
          {series.length > 1 ? (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, color: '#64748b', paddingBottom: '16px', fontWeight: 500 }}
            />
          ) : null}
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            content={<ChartTooltip valueFormatter={valueFormatter} />}
          />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key as string}
              name={item.label}
              fill={`url(#${gradientId}-bar-${index})`}
              radius={[6, 6, 6, 6]}
              maxBarSize={16}
              isAnimationActive={true}
              animationDuration={800}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
