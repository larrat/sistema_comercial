import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  foot?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'blue' | 'emerald' | 'amber';
  onClick?: () => void;
};

export function StatCard({ label, value, description, foot, tone = 'default', onClick }: StatCardProps) {
  const toneClasses = {
    default: 'bg-white border-slate-200 text-slate-900',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    warning: 'bg-amber-50 border-amber-100 text-amber-900',
    danger: 'bg-rose-50 border-rose-100 text-rose-900',
    blue: 'bg-blue-50 border-blue-100 text-blue-900',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    amber: 'bg-amber-50 border-amber-100 text-amber-900',
  };

  const labelToneClasses = {
    default: 'text-slate-500',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  };

  return (
    <section 
      onClick={onClick}
      className={`p-5 rounded-2xl border shadow-sm transition-all flex flex-col gap-3 ${toneClasses[tone]} ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-100' : ''}`}
    >
      <div className={`text-[10px] font-black uppercase tracking-widest ${labelToneClasses[tone]}`}>
        {label}
      </div>
      <div className="text-3xl font-black tracking-tight leading-none">
        {value}
      </div>
      {description ? (
        <div className="text-xs font-medium opacity-70 leading-relaxed">
          {description}
        </div>
      ) : null}
      {foot ? (
        <div className="mt-auto pt-3 border-t border-current/10">
          {foot}
        </div>
      ) : null}
    </section>
  );
}
