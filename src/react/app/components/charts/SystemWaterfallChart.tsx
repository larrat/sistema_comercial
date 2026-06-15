import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { EmptyChartState } from './EmptyChartState';
import { useMemo } from 'react';

type WaterfallData = {
  name: string;
  value: number; // positive for addition, negative for subtraction, absolute for total
  isTotal?: boolean;
};

type SystemWaterfallChartProps = {
  data: WaterfallData[];
  height?: number;
  valueFormatter?: (value: number) => string;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function SystemWaterfallChart({
  data,
  height = 300,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyDescription
}: SystemWaterfallChartProps) {
  if (!data.length) {
    return <EmptyChartState title={emptyTitle} description={emptyDescription} />;
  }

  // Convert to RangeBar format: y: [start, end]
  const seriesData = useMemo(() => {
    let runningTotal = 0;
    return data.map((item) => {
      if (item.isTotal) {
        return {
          x: item.name,
          y: [0, item.value],
          fillColor: '#10b981', // Emerald for totals
          meta: item.value
        };
      }

      const start = runningTotal;
      const end = runningTotal + item.value;
      runningTotal = end;

      return {
        x: item.name,
        y: [start, end],
        fillColor: item.value >= 0 ? '#3b82f6' : '#f43f5e', // Blue for positive, Rose for negative
        meta: item.value
      };
    });
  }, [data]);

  const options: ApexOptions = {
    chart: {
      type: 'rangeBar',
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
      bar: {
        horizontal: false,
        borderRadius: 2,
        columnWidth: '50%'
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val, opts) {
        // RangeBar gives an array of [start, end], we want to display the diff
        const originalValue = opts.w.config.series[0].data[opts.dataPointIndex].meta;
        if (valueFormatter) return valueFormatter(originalValue);
        return String(originalValue);
      },
      style: {
        colors: ['#fff'],
        fontSize: '11px',
        fontWeight: 'bold',
        fontFamily: 'inherit'
      }
    },
    grid: {
      show: true,
      borderColor: 'rgba(255,255,255,0.05)',
      strokeDashArray: 4,
      position: 'back',
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
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
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const item = w.config.series[seriesIndex].data[dataPointIndex];
        const val = item.meta;
        const formatted = valueFormatter ? valueFormatter(val) : val;
        const color = item.fillColor;
        
        return `
          <div class="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg shadow-xl">
            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">${item.x}</span>
            <span class="text-sm font-black flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
              ${formatted}
            </span>
          </div>
        `;
      }
    }
  };

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <Chart options={options} series={[{ data: seriesData }]} type="rangeBar" height="100%" width="100%" />
    </div>
  );
}
