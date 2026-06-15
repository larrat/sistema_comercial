import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { EmptyChartState } from './EmptyChartState';
import { useChartFilter } from './ChartFilterContext';

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
  filterKey?: string; // Optional key to use for cross-filtering
};

export function SystemBarChart<T extends ChartRow>({
  data,
  xKey,
  series: seriesConfig,
  height = 240,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription,
  hideYAxis = true,
  layout = 'horizontal',
  stacked = false,
  filterKey
}: SystemBarChartProps<T> & { stacked?: boolean }) {
  const { filters, setFilter, getFilter } = useChartFilter();

  if (!data.length || !seriesConfig.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  const isVertical = layout === 'vertical'; // Horizontal bars visually

  const activeFilterValue = filterKey ? getFilter(filterKey) : undefined;

  const series = seriesConfig.map((config) => ({
    name: config.label,
    data: data.map((row) => ({
      x: String(row[xKey] || 'N/A'),
      y: Number(row[config.key]) || 0,
      fillColor: activeFilterValue && String(row[xKey] || 'N/A') !== activeFilterValue 
        ? `${config.color}40` // 25% opacity if not selected
        : config.color
    }))
  }));

  const categories = data.map((row) => String(row[xKey] || 'N/A'));

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      stacked,
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      animations: {
        enabled: true,
        speed: 800
      },
      events: {
        dataPointSelection: (e, chart, config) => {
          if (!filterKey) return;
          const category = categories[config.dataPointIndex];
          if (activeFilterValue === category) {
            setFilter(filterKey, null); // deselect
          } else {
            setFilter(filterKey, category);
          }
        }
      }
    },
    theme: { mode: 'dark' },
    colors: seriesConfig.map((s) => s.color),
    plotOptions: {
      bar: {
        horizontal: isVertical,
        borderRadius: stacked ? 2 : 4,
        borderRadiusApplication: 'end',
        columnWidth: stacked ? '35%' : '50%',
        barHeight: '60%'
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: isVertical ? 'horizontal' : 'vertical',
        shadeIntensity: 0.25,
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 0.8,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: false },
    grid: {
      show: true,
      borderColor: 'rgba(255,255,255,0.05)',
      strokeDashArray: 4,
      position: 'back',
      xaxis: { lines: { show: isVertical } },
      yaxis: { lines: { show: !isVertical } },
      padding: { top: 0, right: 0, bottom: 0, left: isVertical ? 0 : 10 }
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        show: !isVertical,
        trim: true,
        maxHeight: 60,
        style: { colors: '#94a3b8', fontSize: '11px', fontFamily: 'inherit', fontWeight: 600 },
        formatter: (val) => {
          if (isVertical) {
            const num = Number(val);
            if (!isNaN(num) && num >= 1000) return `${(num / 1000).toFixed(0)}k`;
          }
          return String(val);
        }
      },
      tooltip: { enabled: false }
    },
    yaxis: {
      show: isVertical ? true : !hideYAxis,
      labels: {
        show: true,
        trim: true,
        maxWidth: 160,
        style: {
          colors: isVertical ? '#cbd5e1' : '#475569',
          fontSize: isVertical ? '11px' : '10px',
          fontFamily: 'inherit',
          fontWeight: 600
        },
        formatter: (val) => {
          if (!isVertical && typeof val === 'number') {
            if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
          }
          return String(val);
        }
      }
    },
    legend: {
      show: seriesConfig.length > 1,
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
      <Chart options={options} series={series} type="bar" height="100%" width="100%" />
    </div>
  );
}
