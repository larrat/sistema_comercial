import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { ChartTooltip } from './ChartTooltip';
import { EmptyChartState } from './EmptyChartState';

type ChartRow = Record<string, unknown>;
type ChartValue = number | string | null | undefined;

type SystemLineChartProps<T extends ChartRow> = {
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

export function SystemLineChart<T extends ChartRow>({
  data,
  xKey,
  yKey,
  height = 220,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  hideYAxis = true
}: SystemLineChartProps<T>) {
  if (!data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rf-ui-chart" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
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
            cursor={{ stroke: 'var(--color-accent)', strokeDasharray: '3 3' }}
            content={<ChartTooltip valueFormatter={valueFormatter} />}
          />
          <Line
            type="monotone"
            dataKey={yKey as string}
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: 'var(--color-accent)' }}
            activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--color-accent-strong)' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
