import type { ReactNode } from 'react';

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  'data-testid'?: string;
};

export function ErrorState({
  title = 'Não foi possível carregar os dados.',
  description,
  action,
  compact = false,
  'data-testid': testId
}: ErrorStateProps) {
  return (
    <div
      className={compact ? 'empty-inline rf-ui-error-state' : 'empty rf-ui-error-state'}
      data-testid={testId}
      role="alert"
    >
      <p className="rf-ui-error-state__title">{title}</p>
      {description ? <p className="table-cell-caption table-cell-muted">{description}</p> : null}
      {action ? <div className="rf-ui-error-state__action">{action}</div> : null}
    </div>
  );
}
