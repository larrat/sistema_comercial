import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import ReactCountUp from 'react-countup';
import { Card, Typography } from '../../../shared/ui';
import { cn } from '../../../shared/ui/index';
import { SparklineInline } from '../../../app/components/charts';

const CountUp = (ReactCountUp as any).default || ReactCountUp;

function BadgeDelta({ value, isPositive, isNeutral }: { value: string; isPositive: boolean; isNeutral: boolean }) {
  if (isNeutral) {
    return (
      <span className="px-2 py-0.5 rounded-lg flex items-center gap-0.5 border bg-slate-500/10 border-slate-500/20 text-sm font-medium text-slate-400">
        {value}
      </span>
    );
  }
  return (
    <span className={cn(
      "text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-0.5 border uppercase tracking-wider",
      isPositive 
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
    )}>
      <ArrowUpRight size={10} className={isPositive ? "" : "rotate-90"} />
      {value}
    </span>
  );
}

export function MetricsGrid({ stats, financeMetrics, periodo }: { stats: any, financeMetrics: any, periodo: string }) {
  const metricCards = [
    { 
      label: 'Faturamento', val: stats?.faturamento || 0, prefix: 'R$ ', color: 'text-[#C5A059]', borderColor: '#C5A059', hex: '#C5A059',
      trend: typeof stats?.trends?.faturamento === 'number' ? `${stats.trends.faturamento > 0 ? '+' : ''}${stats.trends.faturamento.toFixed(1)}%` : '-', 
      trendLabel: periodo === 'tudo' ? '-' : `vs ${periodo} anterior`, 
      trendUp: typeof stats?.trends?.faturamento === 'number' ? stats.trends.faturamento >= 0 : true,
    },
    { 
      label: 'Lucro bruto', val: stats?.lucroTotal || 0, prefix: 'R$ ', color: 'text-emerald-400', borderColor: '#10b981', hex: '#10b981',
      trend: typeof stats?.trends?.lucro === 'number' ? `${stats.trends.lucro > 0 ? '+' : ''}${stats.trends.lucro.toFixed(1)}%` : '-', 
      trendLabel: periodo === 'tudo' ? '-' : `vs ${periodo} anterior`, 
      trendUp: typeof stats?.trends?.lucro === 'number' ? stats.trends.lucro >= 0 : true,
    },
    { 
      label: 'Ticket médio', val: stats?.ticketMedio || 0, prefix: 'R$ ', color: 'text-cyan-400', borderColor: '#22d3ee', hex: '#22d3ee',
      trend: typeof stats?.trends?.ticket === 'number' ? `${stats.trends.ticket > 0 ? '+' : ''}${stats.trends.ticket.toFixed(1)}%` : '-', 
      trendLabel: periodo === 'tudo' ? '-' : `vs ${periodo} anterior`, 
      trendUp: typeof stats?.trends?.ticket === 'number' ? stats.trends.ticket >= 0 : true,
    },
    { 
      label: 'Contas em aberto', val: stats?.valorEmAberto || 0, prefix: 'R$ ', color: (stats?.valorEmAberto || 0) > 0 ? 'text-amber-400' : 'text-emerald-400', borderColor: '#f59e0b', hex: '#f59e0b',
      trend: '-', 
      trendLabel: 'Variação N/A', 
      trendUp: (stats?.valorEmAberto || 0) === 0,
    },
    { 
      label: 'Inadimplência', val: financeMetrics?.inadimplencia || 0, prefix: '', suffix: '%', color: (financeMetrics?.inadimplencia || 0) > 5 ? 'text-rose-400' : 'text-emerald-400', borderColor: '#f43f5e', hex: '#f43f5e',
      trend: '-', 
      trendLabel: 'Variação N/A', 
      trendUp: (financeMetrics?.inadimplencia || 0) <= 5,
    },
    { 
      label: 'DSO (Prazo)', val: financeMetrics?.dso || 0, prefix: '', suffix: ' dias', color: 'text-indigo-400', borderColor: '#818cf8', hex: '#818cf8',
      trend: '-', 
      trendLabel: 'Variação N/A', 
      trendUp: true,
    }
  ];

  return (
    <motion.section 
      initial="hidden" animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-6"
    >
      {metricCards.map((stat, i) => {
        // Generate pseudo-random sparkline data that ends on the current value for visualization
        const val = Number(stat.val) || 1;
        const sparklineData = stat.trendUp 
          ? [val * 0.7, val * 0.8, val * 0.75, val * 0.9, val * 0.95, val] 
          : [val * 1.3, val * 1.2, val * 1.25, val * 1.1, val * 1.05, val];

        return (
          <motion.article 
            key={i}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          >
            <Card 
              className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between h-full min-h-[140px] relative border-t-2! group" 
              style={{ borderTopColor: stat.borderColor }}
              variant="glass"
              padding="sm"
            >
              <div className="absolute inset-0 bg-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="flex items-start justify-between gap-2 relative z-10">
                <Typography variant="label" color="muted" className="text-sm font-medium text-slate-400">{stat.label}</Typography>
                <BadgeDelta value={stat.trend} isPositive={stat.trendUp} isNeutral={stat.trend === '-'} />
              </div>
              <div className="mt-4 mb-2 flex items-end justify-between relative z-10">
                <span className={cn("text-xl lg:text-2xl 2xl:text-3xl font-black font-display tracking-tight truncate whitespace-nowrap block tabular-nums", stat.color)}>
                  <CountUp 
                    end={stat.val || 0} 
                    decimals={stat.suffix === ' dias' ? 0 : 2} 
                    decimal="," 
                    prefix={stat.prefix} 
                    suffix={stat.suffix} 
                    duration={1.5} 
                    separator="." 
                  />
                </span>
                <div className="ml-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <SparklineInline data={sparklineData} type={i % 2 === 0 ? 'area' : 'bar'} color={stat.hex} width={60} height={30} />
                </div>
              </div>
              <span className="block mt-1 relative z-10 text-sm font-medium text-slate-400">{stat.trendLabel}</span>
            </Card>
          </motion.article>
        );
      })}
    </motion.section>
  );
}
