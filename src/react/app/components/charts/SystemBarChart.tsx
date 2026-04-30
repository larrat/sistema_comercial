import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { ChartTooltip } from './ChartTooltip';
import { EmptyChartState } from './EmptyChartState';

type ChartRow = Record<string, unknown>;
type ChartValue = number | string | null | undefined;

type SystemBarChartProps<T extends ChartRow> = {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
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
  yKey,
  height = 220,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  hideYAxis = true
}: SystemBarChartProps<T>) {
  const gradientId = useId().replace(/:/g, '');

  if (!data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rf-ui-chart" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gradientId}-bar`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
          <XAxis
            dataKey={xKey as string}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={{ fontSize: 10, fill: 'var(--color-text-3)' }}
          />
          <YAxis hide={hideYAxis} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
            content={<ChartTooltip valueFormatter={valueFormatter} />}
          />
          <Bar
            dataKey={yKey as string}
            fill={`url(#${gradientId}-bar)`}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
