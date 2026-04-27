import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  'data-testid'?: string;
};

export function EmptyState({
  title,
  description,
  action,
  compact = false,
  'data-testid': testId
}: EmptyStateProps) {
  return (
    <div
      className={compact ? 'empty-inline rf-ui-empty-state' : 'empty rf-ui-empty-state'}
      data-testid={testId}
    >
      <p className="rf-ui-empty-state__title">{title}</p>
      {description ? <p className="table-cell-caption table-cell-muted">{description}</p> : null}
      {action ? <div className="rf-ui-empty-state__action">{action}</div> : null}
    </div>
  );
}
