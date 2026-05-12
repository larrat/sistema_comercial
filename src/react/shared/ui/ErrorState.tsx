import type { ReactNode } from 'react';

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  technicalMessage?: string;
  compact?: boolean;
  'data-testid'?: string;
};

export function ErrorState({
  title = 'Não foi possível carregar os dados.',
  description,
  action,
  onRetry,
  retryLabel = 'Tentar novamente',
  technicalMessage,
  compact = false,
  'data-testid': testId
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} px-6`}
      data-testid={testId}
      role="alert"
    >
      <p className="text-sm font-semibold text-rose-600 m-0">{title}</p>
      {description ? <p className="text-xs text-slate-400 mt-1.5 max-w-md">{description}</p> : null}
      {technicalMessage ? (
        <p className="text-[11px] text-slate-400/75 mt-1 font-mono">{technicalMessage}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
      {!action && onRetry ? (
        <div className="mt-4">
          <button type="button" className="btn btn-sm" onClick={onRetry}>
            {retryLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
