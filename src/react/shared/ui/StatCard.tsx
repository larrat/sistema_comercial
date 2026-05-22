import type { ReactNode } from 'react';
import { Typography } from './Typography';

type StatCardProps = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  foot?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'blue' | 'emerald' | 'amber' | 'blue_to_pink';
  onClick?: () => void;
};

export function StatCard({ label, value, description, foot, tone = 'default', onClick }: StatCardProps) {
  const toneClasses = {
    default: 'bg-surface-card border-border-subtle text-primary',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    danger: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    blue_to_pink: 'bg-surface-card border-transparent relative before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-br before:from-[#3B82F6] before:to-[#EC4899] before:rounded-xl before:-z-10 text-white',
  };

  const labelToneClasses = {
    default: 'text-muted',
    success: 'text-emerald-500/70',
    warning: 'text-amber-500/70',
    danger: 'text-rose-500/70',
    blue: 'text-blue-500/70',
    emerald: 'text-emerald-500/70',
    amber: 'text-amber-500/70',
    blue_to_pink: 'text-cyan-400 font-bold',
  };

  return (
    <section 
      onClick={onClick}
      className={`!p-5 rounded-xl border shadow-sm transition-colors flex flex-col items-center text-center gap-2 overflow-hidden ${toneClasses[tone]} ${onClick ? 'cursor-pointer hover:shadow-md hover:translate-y-[-2px] active:translate-y-0' : ''}`}
    >
      <Typography variant="label" color="inherit" className={labelToneClasses[tone]}>
        {label}
      </Typography>
      <Typography variant="h3" color="inherit" weight="bold">
        {value}
      </Typography>
      {description ? (
        <Typography variant="body-sm" color="inherit" className="opacity-60 max-w-[140px]">
          {description}
        </Typography>
      ) : null}
      {foot ? (
        <div className="mt-2 pt-3 border-t border-current/5 w-full">
          {foot}
        </div>
      ) : null}
    </section>
  );
}
