import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { EmptyChartState } from './EmptyChartState';

type HeatmapSeries = {
  name: string; // e.g. "Segunda", "Terça" (Y axis)
  data: {
    x: string; // e.g. "08h", "09h" (X axis)
    y: number; // Value
  }[];
};

type SystemHeatmapChartProps = {
  series: HeatmapSeries[];
  height?: number;
  valueFormatter?: (value: number) => string;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  colorScale?: {
    from: number;
    to: number;
    color: string;
    name?: string;
  }[];
};

export function SystemHeatmapChart({
  series,
  height = 300,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  colorScale
}: SystemHeatmapChartProps) {
  if (!series.length || !series[0].data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  const options: ApexOptions = {
    chart: {
      type: 'heatmap',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      animations: {
        enabled: true,
        speed: 800
      }
    },
    theme: { mode: 'dark' },
    plotOptions: {
      heatmap: {
        enableShades: !colorScale,
        shadeIntensity: 0.5,
        colorScale: colorScale ? {
          ranges: colorScale
        } : undefined
      }
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      show: true,
      borderColor: 'rgba(255,255,255,0.05)',
      padding: { top: 0, right: 0, bottom: 0, left: 10 }
    },
    xaxis: {
      type: 'category',
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#94a3b8', fontSize: '11px', fontFamily: 'inherit', fontWeight: 600 }
      },
      tooltip: { enabled: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#cbd5e1', fontSize: '11px', fontFamily: 'inherit', fontWeight: 600 }
      }
    },
    legend: {
      show: !!colorScale,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '11px',
      fontFamily: 'inherit',
      fontWeight: 600,
      labels: { colors: '#94a3b8' }
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'inherit' },
      y: {
        formatter: (val) => {
          if (valueFormatter) {
            return valueFormatter(val);
          }
          return String(val);
        }
      }
    }
  };

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <Chart options={options} series={series} type="heatmap" height="100%" width="100%" />
    </div>
  );
}
