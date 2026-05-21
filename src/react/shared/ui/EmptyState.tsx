import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  'data-testid'?: string;
};

export function EmptyState({
  title,
  description,
  action,
  icon,
  compact = false,
  'data-testid': testId
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} px-6`}
      data-testid={testId}
    >
      {icon ? <div className="text-2xl text-slate-400 mb-3">{icon}</div> : null}
      <p className="text-sm font-semibold text-slate-300 m-0">{title}</p>
      {description ? <p className="text-xs text-slate-400 mt-1.5 max-w-md">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
