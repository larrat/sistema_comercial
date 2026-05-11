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
    default: 'bg-white border-slate-200 text-slate-800',
    success: 'bg-[#F2F4EF] border-[#4B5320]/20 text-[#4B5320]', // Military Green soft background
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-900',
    blue: 'bg-slate-50 border-slate-200 text-slate-800',
    emerald: 'bg-[#F2F4EF] border-[#4B5320]/20 text-[#4B5320]',
    amber: 'bg-[#FAF6EF] border-[#C5A059]/20 text-[#C5A059]', // Matte Gold soft background
  };

  const labelToneClasses = {
    default: 'text-slate-500',
    success: 'text-[#4B5320]/70',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    blue: 'text-slate-500',
    emerald: 'text-[#4B5320]/70',
    amber: 'text-[#C5A059]',
  };

  return (
    <section 
      onClick={onClick}
      className={`p-8 rounded-xl border shadow-sm transition-all flex flex-col items-center text-center gap-3 ${toneClasses[tone]} ${onClick ? 'cursor-pointer hover:shadow-md hover:translate-y-[-2px] active:translate-y-0' : ''}`}
    >
      <div className={`text-[10px] font-black uppercase tracking-[0.15em] mb-1 ${labelToneClasses[tone]}`}>
        {label}
      </div>
      <div className="text-3xl font-bold tracking-tight leading-none">
        {value}
      </div>
      {description ? (
        <div className="text-[11px] font-medium opacity-60 leading-relaxed max-w-[140px]">
          {description}
        </div>
      ) : null}
      {foot ? (
        <div className="mt-2 pt-3 border-t border-current/5 w-full">
          {foot}
        </div>
      ) : null}
    </section>
  );
}
