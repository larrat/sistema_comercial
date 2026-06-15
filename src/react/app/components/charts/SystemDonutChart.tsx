import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { EmptyChartState } from './EmptyChartState';
import { useChartFilter } from './ChartFilterContext';

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
  filterKey?: string;
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
  height = 280,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  centerLabel,
  centerValue,
  filterKey
}: SystemDonutChartProps<T>) {
  const { setFilter, getFilter } = useChartFilter();
  if (!data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  const series = data.map((row) => Number(row[valueKey]) || 0);
  const labels = data.map((row) => String(row[nameKey] || 'N/A'));

  const activeFilterValue = filterKey ? getFilter(filterKey) : undefined;
  
  const colors = DONUT_COLORS.map((color, index) => {
    if (!activeFilterValue) return color;
    return labels[index] === activeFilterValue ? color : `${color}40`; // Dim others
  });

  const total = series.reduce((sum, val) => sum + val, 0);
  const displayValue = centerValue ?? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      background: 'transparent',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      },
      events: {
        dataPointSelection: (e, chart, config) => {
          if (!filterKey) return;
          const category = labels[config.dataPointIndex];
          if (activeFilterValue === category) {
            setFilter(filterKey, null); // deselect
          } else {
            setFilter(filterKey, category);
          }
        }
      }
    },
    theme: { mode: 'dark' },
    colors: colors,
    labels,
    stroke: {
      show: true,
      colors: ['#0f172a'],
      width: 2
    },
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '10px',
              fontFamily: 'inherit',
              fontWeight: 600,
              color: '#64748b',
              formatter: () => centerLabel ?? 'Total'
            },
            value: {
              show: true,
              fontSize: '18px',
              fontFamily: 'inherit',
              fontWeight: 800,
              color: '#ffffff',
              formatter: () => displayValue
            },
            total: {
              show: true,
              showAlways: true,
              label: centerLabel ?? 'Total',
              fontSize: '10px',
              fontFamily: 'inherit',
              fontWeight: 600,
              color: '#64748b',
              formatter: () => displayValue
            }
          }
        }
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '11px',
      fontFamily: 'inherit',
      fontWeight: 600,
      labels: { colors: '#94a3b8' },
      markers: { width: 8, height: 8, offsetX: -2 },
      itemMargin: { horizontal: 8, vertical: 4 }
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'inherit' },
      y: {
        formatter: (val, opts) => {
          if (valueFormatter) {
            const originalRow = data[opts.seriesIndex];
            return valueFormatter(val, originalRow);
          }
          return String(val);
        }
      }
    }
  };

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <Chart options={options} series={series} type="donut" height="100%" width="100%" />
    </div>
  );
}
