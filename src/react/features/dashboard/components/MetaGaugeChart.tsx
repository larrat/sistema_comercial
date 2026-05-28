import React from 'react';
import { PieChart, Pie, Sector } from 'recharts';
import { Typography } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

type MetaGaugeChartProps = {
  faturamento: number;
  meta: number;
};

export function MetaGaugeChart({ faturamento, meta }: MetaGaugeChartProps) {
  if (!meta || meta <= 0) return null;

  const percent = Math.min((faturamento / meta) * 100, 100);
  const remaining = 100 - percent;
  
  let color1 = '#fbbf24'; // Amarelo
  let color2 = '#d97706'; // Amarelo escuro
  let glowColor = 'rgba(251,191,36,0.5)';
  let textClass = 'text-amber-400';
  let glowClass = 'drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]';

  if (percent >= 100) { 
    color1 = '#34d399'; 
    color2 = '#059669'; 
    glowColor = 'rgba(52,211,153,0.5)';
    textClass = 'text-emerald-400'; 
    glowClass = 'drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]';
  } else if (percent < 50) { 
    color1 = '#fb7185'; 
    color2 = '#e11d48'; 
    glowColor = 'rgba(251,113,133,0.5)';
    textClass = 'text-rose-400'; 
    glowClass = 'drop-shadow-[0_0_15px_rgba(251,113,133,0.3)]';
  }

  const data = [
    { name: 'Atingido', value: percent, fill: 'url(#gaugeGradient)' },
    { name: 'Restante', value: remaining, fill: '#1e293b' } // bg color
  ];

  return (
    <div className={`flex flex-col items-center relative ${glowClass}`}>
      <div className="h-36 w-full mt-2 relative">
        {/* Glow de Fundo (Ambient Light) */}
        <div 
          className="absolute inset-0 rounded-full blur-[40px] opacity-30 pointer-events-none scale-75 transform-gpu"
          style={{ backgroundColor: color1 }}
        />
        <PieChart responsive width="100%" height="100%">
          <defs>
            <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color2} stopOpacity={1} />
              <stop offset="100%" stopColor={color1} stopOpacity={1} />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="bgInnerShadow">
              {/* Uma sombra interna (inset shadow) simples para o arco restante */}
              <feOffset dx="0" dy="2"/>
              <feGaussianBlur stdDeviation="2" result="offset-blur"/>
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
              <feFlood floodColor="black" floodOpacity="0.7" result="color"/>
              <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
              <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
            </filter>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={80}
            outerRadius={105}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            cornerRadius={10}
            shape={(props: any) => (
              <Sector
                cx={props.cx}
                cy={props.cy}
                innerRadius={props.innerRadius}
                outerRadius={props.outerRadius}
                startAngle={props.startAngle}
                endAngle={props.endAngle}
                fill={props.payload.fill}
                cornerRadius={props.cornerRadius}
                style={{ 
                  filter: props.index === 0 ? 'url(#gaugeGlow)' : 'url(#bgInnerShadow)' 
                }}
              />
            )}
          />
        </PieChart>
      </div>
      <div className="absolute bottom-1 flex flex-col items-center">
        <Typography variant="h3" weight="black" className={`!text-4xl tracking-tighter ${textClass} drop-shadow-md`}>
          {percent.toFixed(1)}<span className="text-xl opacity-70">%</span>
        </Typography>
        <Typography variant="label" color="muted" className="!text-[10px] uppercase tracking-widest mt-1 opacity-70">
          <span className="text-white font-bold">{fmtBRL(faturamento)}</span> <span className="mx-1">/</span> {fmtBRL(meta)}
        </Typography>
      </div>
    </div>
  );
}
