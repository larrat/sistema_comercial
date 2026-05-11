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
    <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-5 md:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        {kicker ? <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{kicker}</div> : null}
        <h1 className="text-2xl font-bold text-slate-900 leading-tight m-0 truncate">{title}</h1>
        {description ? <p className="text-sm text-slate-500 mt-1 mb-0">{description}</p> : null}
      </div>
      {(actions || meta) && (
        <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
      )}
    </header>
  );
}
