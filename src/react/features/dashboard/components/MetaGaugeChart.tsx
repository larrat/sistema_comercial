import React from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Typography } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

type MetaGaugeChartProps = {
  faturamento: number;
  meta: number;
};

export function MetaGaugeChart({ faturamento, meta }: MetaGaugeChartProps) {
  if (!meta || meta <= 0) return null;

  const percent = Math.min((faturamento / meta) * 100, 100);
  
  let color = '#fbbf24'; // amber-400
  let colorLight = '#fde68a'; // amber-200

  if (percent >= 100) { 
    color = '#10b981'; // emerald-500
    colorLight = '#6ee7b7'; // emerald-300
  } else if (percent < 50) { 
    color = '#f43f5e'; // rose-500
    colorLight = '#fda4af'; // rose-300
  }

  const options: ApexOptions = {
    chart: {
      type: 'radialBar',
      background: 'transparent',
      offsetY: -10,
      sparkline: { enabled: true },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 1000
      }
    },
    colors: [color],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: {
          background: '#1e293b',
          strokeWidth: '97%',
          margin: 5,
          dropShadow: {
            enabled: true,
            top: 2,
            left: 0,
            blur: 4,
            opacity: 0.15
          }
        },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: -10,
            fontSize: '36px',
            fontFamily: 'inherit',
            fontWeight: 800,
            color: colorLight,
            formatter: (val) => val.toFixed(1) + '%'
          }
        }
      }
    },
    stroke: { lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        shadeIntensity: 0.5,
        gradientToColors: [colorLight],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100]
      }
    }
  };

  return (
    <div className="flex flex-col items-center relative drop-shadow-xl">
      <div className="h-44 w-full relative">
        {/* Glow de Fundo (Ambient Light) */}
        <div 
          className="absolute inset-0 rounded-full blur-[40px] opacity-20 pointer-events-none scale-75 transform-gpu"
          style={{ backgroundColor: color }}
        />
        <Chart options={options} series={[percent]} type="radialBar" height="100%" width="100%" />
      </div>
      <div className="absolute bottom-2 flex flex-col items-center">
        <Typography variant="label" color="muted" className="!text-[10px] uppercase tracking-widest opacity-70">
          <span className="text-white font-bold">{fmtBRL(faturamento)}</span> <span className="mx-1">/</span> {fmtBRL(meta)}
        </Typography>
      </div>
    </div>
  );
}
