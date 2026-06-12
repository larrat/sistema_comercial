import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
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
  layout?: 'horizontal' | 'vertical';
};

export function SystemBarChart<T extends ChartRow>({
  data,
  xKey,
  series,
  height = 240,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  hideYAxis = true,
  layout = 'horizontal'
}: SystemBarChartProps<T>) {
  const gradientId = useId().replace(/:/g, '');

  if (!data.length || !series.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  const isVertical = layout === 'vertical';

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 10, right: 16, left: isVertical ? 0 : 0, bottom: 4 }}
          barCategoryGap="20%"
        >
          <defs>
            {series.map((item, index) => (
              <linearGradient
                key={item.key}
                id={`${gradientId}-bar-${index}`}
                x1="0"
                y1="0"
                x2={isVertical ? "1" : "0"}
                y2={isVertical ? "0" : "1"}
              >
                <stop offset="0%" stopColor={item.color} stopOpacity="1" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0.75" />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            vertical={!isVertical}
            horizontal={isVertical}
            stroke="rgba(148,163,184,0.06)"
            strokeDasharray="4 4"
          />
          {isVertical ? (
            <>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey={xKey as string}
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                width={100}
                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey={xKey as string}
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              />
              <YAxis
                hide={hideYAxis}
                type="number"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
              />
            </>
          )}

          {series.length > 1 ? (
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginLeft: 2 }}>{value}</span>
              )}
              wrapperStyle={{ paddingTop: 16 }}
            />
          ) : null}
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.04)' }}
            content={<ChartTooltip valueFormatter={valueFormatter} />}
          />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key as string}
              name={item.label}
              fill={`url(#${gradientId}-bar-${index})`}
              radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={isVertical ? 18 : 24}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
