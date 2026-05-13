import type { ReactNode } from 'react';

export type BadgeVariant = 'blue' | 'yellow' | 'red' | 'green' | 'slate' | 'indigo' | 'cyan';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  outline?: boolean;
}

export function Badge({
  children,
  variant = 'slate',
  className = '',
  outline = false
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  };

  const combinedClasses = [
    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
    variants[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={combinedClasses}>
      {children}
    </span>
  );
}
