import { Legend, Pie, PieChart, Tooltip, Sector } from 'recharts';

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
  '#0ea5e9', // sky-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f43f5e'  // rose-500
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
      <PieChart responsive width="100%" height="100%">
        <Pie
          data={data}
          dataKey={valueKey as string}
          nameKey={nameKey as string}
          innerRadius="58%"
          outerRadius="86%"
          paddingAngle={2}
          stroke="none"
          isAnimationActive={false}
          shape={(props: any) => (
            <Sector
              cx={props.cx}
              cy={props.cy}
              innerRadius={props.innerRadius}
              outerRadius={props.outerRadius}
              startAngle={props.startAngle}
              endAngle={props.endAngle}
              fill={DONUT_COLORS[props.index % DONUT_COLORS.length]}
            />
          )}
        />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
        />
      </PieChart>
    </div>
  );
}
