import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { EmptyChartState } from './EmptyChartState';

type TreemapData = {
  name: string;
  value: number;
  color?: string; // Optional custom color per box
};

type SystemTreemapChartProps = {
  data: TreemapData[];
  height?: number;
  valueFormatter?: (value: number, row?: any) => string;
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

export function SystemTreemapChart({
  data,
  height = 300,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  colorScale
}: SystemTreemapChartProps) {
  if (!data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  // Pre-process series based on whether we have color ranges or custom colors per item
  const seriesData = data.map(item => ({
    x: item.name,
    y: item.value,
    fillColor: item.color
  }));

  const options: ApexOptions = {
    chart: {
      type: 'treemap',
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
      treemap: {
        enableShades: !colorScale,
        shadeIntensity: 0.5,
        distributed: !colorScale && !seriesData.some(d => d.fillColor), // Auto distribute colors if no custom colors
        colorScale: colorScale ? {
          ranges: colorScale
        } : undefined
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (text: string) => {
        return text.length > 15 ? text.substring(0, 15) + '...' : text;
      },
      style: {
        fontSize: '10px',
        fontWeight: 'bold',
        fontFamily: 'inherit',
        colors: ['#ffffff']
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        color: '#000',
        opacity: 0.45
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
        formatter: (val, opts) => {
          if (valueFormatter) {
            return valueFormatter(val, data[opts.dataPointIndex]);
          }
          return String(val);
        }
      }
    }
  };

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <Chart options={options} series={[{ data: seriesData }]} type="treemap" height="100%" width="100%" />
    </div>
  );
}
