import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './index';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors',
  {
    variants: {
      variant: {
        slate: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        red: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        cyan: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      },
    },
    defaultVariants: {
      variant: 'slate',
    },
  }
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, variant, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))}>
      {children}
    </span>
  );
}
