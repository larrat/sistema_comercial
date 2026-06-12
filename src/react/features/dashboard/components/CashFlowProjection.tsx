import React from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { fmtBRL } from '../../../shared/lib/formatters';

type CashFlowData = {
  name: string;
  receita: number;
};

type CashFlowProjectionProps = {
  data: CashFlowData[];
};

export function CashFlowProjection({ data }: CashFlowProjectionProps) {
  if (!data || data.length === 0) return null;

  const series = [{
    name: 'A Receber',
    data: data.map(d => d.receita || 0)
  }];

  const categories = data.map(d => String(d.name || ''));

  const options: ApexOptions = {
    chart: {
      type: 'bar',
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
    colors: ['#2dd4bf'], // teal-400
    plotOptions: {
      bar: {
        borderRadius: 4,
        borderRadiusApplication: 'end',
        columnWidth: '40%'
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#0f766e'], // teal-700
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 0.8,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    grid: {
      show: true,
      borderColor: 'rgba(255,255,255,0.05)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
      padding: { top: 0, right: 0, bottom: 0, left: 10 }
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#64748b', fontSize: '11px', fontFamily: 'inherit', fontWeight: 700 }
      },
      tooltip: { enabled: false }
    },
    yaxis: {
      show: false
    },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'inherit' },
      y: {
        formatter: (val) => fmtBRL(val)
      }
    }
  };

  return (
    <div className="w-full h-48 group">
      <Chart options={options} series={series} type="bar" height="100%" width="100%" />
    </div>
  );
}
