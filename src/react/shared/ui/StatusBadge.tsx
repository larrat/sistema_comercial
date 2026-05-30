import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './index';

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:shadow-[0_0_8px_currentColor] transition-colors",
  {
    variants: {
      tone: {
        neutral: 'bg-slate-500/10 text-slate-300 ring-slate-500/20 before:bg-slate-400',
        info: 'bg-blue-500/10 text-blue-400 ring-blue-500/20 before:bg-blue-400',
        success: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 before:bg-emerald-400',
        warning: 'bg-amber-500/10 text-amber-400 ring-amber-500/20 before:bg-amber-400',
        danger: 'bg-rose-500/10 text-rose-400 ring-rose-500/20 before:bg-rose-400',
        'vibrant-blue': 'bg-teal-500/10 text-teal-400 ring-teal-500/20 before:bg-teal-400',
        'vibrant-pink': 'bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20 before:bg-fuchsia-400',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  }
);

export type StatusBadgeTone = NonNullable<VariantProps<typeof statusBadgeVariants>['tone']>;

export interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ children, tone, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone, className }))}>
      {children}
    </span>
  );
}
