import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

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
};

const DONUT_COLORS = [
  'var(--color-accent)',
  'var(--color-accent-strong)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-surface-3)'
];

export function SystemDonutChart<T extends ChartRow>({
  data,
  nameKey,
  valueKey,
  height = 240,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription
}: SystemDonutChartProps<T>) {
  if (!data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rf-ui-chart" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey as string}
            nameKey={nameKey as string}
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={String(entry[nameKey] ?? index)}
                fill={DONUT_COLORS[index % DONUT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: 'var(--color-text-2)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
