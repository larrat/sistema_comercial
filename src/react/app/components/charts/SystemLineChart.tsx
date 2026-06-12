import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
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

  const series = [
    {
      name: 'Valor',
      data: data.map((row) => Number(row[yKey]) || 0)
    }
  ];

  const categories = data.map((row) => String(row[xKey] || ''));

  const options: ApexOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    theme: { mode: 'dark' },
    colors: ['#0ea5e9'],
    stroke: {
      curve: 'monotoneCubic',
      width: 3
    },
    markers: {
      size: 0,
      strokeWidth: 2,
      hover: { size: 6 }
    },
    grid: {
      show: true,
      borderColor: 'rgba(148,163,184,0.06)',
      strokeDashArray: 4,
      position: 'back',
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: !hideYAxis } },
      padding: { top: 0, right: 0, bottom: 0, left: hideYAxis ? 0 : 10 }
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#64748b', fontSize: '11px', fontFamily: 'inherit', fontWeight: 500 }
      },
      tooltip: { enabled: false }
    },
    yaxis: {
      show: !hideYAxis,
      labels: {
        style: { colors: '#475569', fontSize: '10px', fontFamily: 'inherit', fontWeight: 600 },
        formatter: (val) => {
          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
          return String(val);
        }
      }
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'inherit' },
      marker: { show: false },
      y: {
        title: { formatter: () => '' },
        formatter: (val, opts) => {
          if (valueFormatter) {
            const originalRow = data[opts.dataPointIndex];
            return valueFormatter(val, originalRow);
          }
          return String(val);
        }
      }
    }
  };

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <Chart options={options} series={series} type="line" height="100%" width="100%" />
    </div>
  );
}
