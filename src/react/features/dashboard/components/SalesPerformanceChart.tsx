import { useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { TrendingUp } from 'lucide-react';
import { Card, Typography, EmptyState } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

const fmt = (v: number) => fmtBRL(v || 0);

export function SalesPerformanceChart({ chartData, stats, periodoDatas }: { chartData: any[], stats: any, periodoDatas: string }) {
  const navigate = useNavigate();

  const series = [
    {
      name: 'Faturamento Atual',
      type: 'area',
      data: chartData.map((row) => Number(row.faturamento) || 0)
    },
    {
      name: 'Período Anterior',
      type: 'line',
      data: chartData.map((row) => Number(row.faturamentoAnt) || 0)
    }
  ];

  const categories = chartData.map((row) => String(row.name));

  const options: ApexOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      events: {
        markerClick: () => navigate('/app/pedidos'),
        dataPointSelection: () => navigate('/app/pedidos')
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    theme: { mode: 'dark' },
    colors: ['#f59e0b', '#64748b'], // amber-500, slate-500
    stroke: {
      curve: 'smooth',
      width: [4, 2],
      dashArray: [0, 4]
    },
    fill: {
      type: ['gradient', 'solid'],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.0,
        stops: [0, 90, 100]
      }
    },
    dataLabels: { enabled: false },
    grid: {
      show: true,
      borderColor: 'rgba(255,255,255,0.05)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 0, right: 0, bottom: 0, left: 10 }
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#64748b', fontSize: '11px', fontFamily: 'inherit', fontWeight: 700 } },
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
        formatter: (val) => fmt(val)
      }
    }
  };

  return (
    <Card padding="none" variant="glass" className="h-full flex flex-col justify-between transition-all duration-300 hover:shadow-2xl">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="space-y-0.5">
          <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Desempenho Comercial</Typography>
          <Typography variant="caption" color="muted">Faturamento vs Lucro Bruto</Typography>
        </div>
        <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-sm font-medium text-slate-400">
          {periodoDatas}
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div 
          className="h-72 w-full mt-2 cursor-pointer" 
          role="figure" 
          aria-label={`Gráfico de área exibindo o faturamento e lucro ao longo do período: ${periodoDatas}`}
        >
          {chartData.length === 0 ? (
            <EmptyState 
              icon={<TrendingUp size={32} className="text-slate-500" />} 
              title="Nenhum registro comercial" 
              description="Não existem vendas registradas para o período selecionado." 
            />
          ) : (
            <Chart options={options} series={series} type="line" height="100%" width="100%" />
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-white/5">
          {[
            { label: 'Melhor Dia', val: Math.max(...chartData.map((d: any) => d.faturamento), 0) },
            { label: 'Média Diária', val: chartData.length > 0 ? chartData.reduce((acc: any, d: any) => acc + d.faturamento, 0) / chartData.length : 0 },
            { label: 'Total Período', val: chartData.reduce((acc: any, d: any) => acc + d.faturamento, 0) },
            { label: 'Margem Bruta', val: stats.margem, suffix: '%' }
          ].map((m, i) => (
            <div key={i}>
              <span className="block mb-1 text-sm font-medium text-slate-400">{m.label}</span>
              <span className="block text-lg font-black text-white">
                {m.suffix ? `${m.val.toFixed(1)}%` : fmt(m.val)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
