import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Card, Typography, EmptyState } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

type AbcItem = {
  name: string;
  value: number;
  cumulativePercent: number;
  category: 'A' | 'B' | 'C';
};

type Props = {
  data: AbcItem[];
  title?: string;
};

export function SystemAbcChart({ data, title = 'Curva ABC (Pareto)' }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <EmptyState title="Sem dados" description="Não há dados para exibir a Curva ABC" />
      </Card>
    );
  }

  const series = [
    {
      name: 'Valor',
      type: 'column',
      data: data.map((d) => d.value)
    },
    {
      name: '% Acumulado',
      type: 'line',
      data: data.map((d) => d.cumulativePercent)
    }
  ];

  const options: ApexOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false }
    },
    theme: { mode: 'dark' },
    colors: ['#0ea5e9', '#f59e0b'], // sky-500, amber-500
    stroke: {
      width: [0, 3],
      curve: 'smooth'
    },
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 4,
        colors: {
          ranges: [
            { from: 0, to: Infinity, color: '#0ea5e9' } // default
          ]
        }
      }
    },
    dataLabels: { enabled: false },
    labels: data.map((d) => d.name),
    xaxis: {
      labels: {
        style: { colors: '#94a3b8' },
        formatter: (val: string) => {
          return val.length > 15 ? val.substring(0, 15) + '...' : val;
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: [
      {
        title: { text: 'Valor R$', style: { color: '#94a3b8' } },
        labels: {
          style: { colors: '#94a3b8' },
          formatter: (val) => `R$ ${(val / 1000).toFixed(1)}k`
        }
      },
      {
        opposite: true,
        title: { text: '% Acumulado', style: { color: '#f59e0b' } },
        min: 0,
        max: 100,
        labels: {
          style: { colors: '#f59e0b' },
          formatter: (val) => `${val.toFixed(0)}%`
        }
      }
    ],
    grid: {
      borderColor: 'rgba(255,255,255,0.05)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      y: [
        { formatter: (val) => fmtBRL(val) },
        { formatter: (val) => `${val.toFixed(2)}%` }
      ]
    },
    legend: {
      position: 'top',
      labels: { colors: '#fff' }
    }
  };

  return (
    <Card className="flex flex-col h-full" variant="glass">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Typography variant="h4" className="text-white">{title}</Typography>
          <Typography variant="caption" color="muted">80% da receita vem de 20% do esforço</Typography>
        </div>
      </div>
      <div className="flex-1 min-h-[300px]">
        <Chart options={options} series={series} type="line" height="100%" />
      </div>
    </Card>
  );
}
