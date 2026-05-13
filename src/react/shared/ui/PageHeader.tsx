import type { ReactNode } from 'react';

type PageHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  meta
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-8 border-b border-slate-200/60 pb-10 pt-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          {kicker ? (
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-brand-gold)] mb-1 opacity-90">
              {kicker}
            </div>
          ) : null}
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-none m-0">
            {title}
          </h1>
          {description ? (
            <p className="text-sm md:text-lg text-slate-500 mt-2 mb-0 leading-relaxed max-w-4xl font-medium">
              {description}
            </p>
          ) : null}
        </div>
        
        {actions && (
          <div className="flex items-center gap-4 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {meta && (
        <div className="flex items-center gap-4 py-3 px-4 bg-slate-50/50 rounded-xl border border-slate-200/50 w-fit">
          {meta}
        </div>
      )}
    </header>
  );
}
