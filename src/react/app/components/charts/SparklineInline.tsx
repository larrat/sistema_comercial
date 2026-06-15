import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

type SparklineInlineProps = {
  data: number[];
  color?: string;
  width?: number | string;
  height?: number | string;
  type?: 'line' | 'area' | 'bar';
};

export function SparklineInline({
  data,
  color = '#10b981', // emerald-500 default
  width = 100,
  height = 40,
  type = 'line'
}: SparklineInlineProps) {
  if (!data || data.length === 0) return null;

  const options: ApexOptions = {
    chart: {
      type,
      width,
      height,
      sparkline: {
        enabled: true
      },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    stroke: {
      curve: 'smooth',
      width: type === 'bar' ? 0 : 2
    },
    fill: {
      opacity: type === 'area' ? 0.3 : 1,
      type: type === 'area' ? 'gradient' : 'solid',
      gradient: type === 'area' ? {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 100]
      } : undefined
    },
    colors: [color],
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: function (seriesName) {
            return '';
          }
        }
      },
      marker: {
        show: false
      }
    }
  };

  const series = [{
    name: 'Valor',
    data
  }];

  return (
    <div className="inline-block align-middle" style={{ width, height }}>
      <Chart options={options} series={series} type={type} width={width} height={height} />
    </div>
  );
}
