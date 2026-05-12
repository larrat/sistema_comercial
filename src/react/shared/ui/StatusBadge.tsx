import type { ReactNode } from 'react';

export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'vibrant-blue' | 'vibrant-pink';

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusBadgeTone;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: 'bg-slate-400/10 text-slate-600 ring-slate-400/20',
  info: 'bg-blue-500/10 text-blue-700 ring-blue-500/20',
  success: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-700 ring-rose-500/20',
  'vibrant-blue': 'bg-blue-600 text-white ring-blue-700 shadow-sm',
  'vibrant-pink': 'bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white ring-[#EC4899]/50 shadow-sm'
};

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
