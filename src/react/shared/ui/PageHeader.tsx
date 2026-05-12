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
    <header className="flex flex-col gap-6 border-b border-slate-200 pb-8 pt-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {kicker ? (
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              {kicker}
            </div>
          ) : null}
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight leading-tight m-0 truncate">
            {title}
          </h1>
          {description ? (
            <p className="text-sm md:text-base text-slate-500 mt-1 mb-0 leading-relaxed max-w-3xl">
              {description}
            </p>
          ) : null}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {meta && (
        <div className="flex items-center gap-4 pt-2">
          {meta}
        </div>
      )}
    </header>
  );
}
