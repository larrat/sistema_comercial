import type { ReactNode } from 'react';

type ChartCardProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ChartCard({ title, description, action, children, className }: ChartCardProps) {
  return (
    <section
      className={`bg-slate-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden ${className ?? ''}`}
    >
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[15px] font-bold text-white tracking-tight leading-tight">{title}</h3>
          {description ? (
            <div className="text-[11px] font-medium text-slate-400 leading-snug">{description}</div>
          ) : null}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
      <div className="px-4 pb-5">{children}</div>
    </section>
  );
}
