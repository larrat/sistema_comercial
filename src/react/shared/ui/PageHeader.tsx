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
    <header className="flex flex-col gap-4 border-b border-white/5 pb-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {kicker ? (
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-brand-gold)] mb-0.5 opacity-90">
              {kicker}
            </div>
          ) : null}
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none m-0">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-slate-400 mt-1.5 mb-0 leading-relaxed max-w-4xl font-medium">
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
        <div className="flex items-center gap-4 py-2 px-3 bg-slate-50/50 rounded-lg border border-slate-200/50 w-fit">
          {meta}
        </div>
      )}
    </header>
  );
}
