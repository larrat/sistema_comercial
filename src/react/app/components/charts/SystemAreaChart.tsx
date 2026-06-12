import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
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
  if (!data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  const series = [
    {
      name: 'Valor',
      data: data.map((row) => Number(row[yKey]) || 0)
    }
  ];

  const categories = data.map((row) => String(row[xKey]));

  const options: ApexOptions = {
    chart: {
      type: 'area',
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
    colors: [color],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    grid: {
      show: true,
      borderColor: 'rgba(148,163,184,0.06)',
      strokeDashArray: 4,
      position: 'back',
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: !hideYAxis } },
      padding: { top: 0, right: 0, bottom: 0, left: 10 }
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
      <Chart options={options} series={series} type="area" height="100%" width="100%" />
    </div>
  );
}
