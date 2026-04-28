type LoadingStateProps = {
  title?: string;
  description?: string;
  compact?: boolean;
  'data-testid'?: string;
};

export function LoadingState({
  title = 'Carregando...',
  description,
  compact = false,
  'data-testid': testId
}: LoadingStateProps) {
  return (
    <div
      className={compact ? 'empty-inline rf-ui-loading-state' : 'empty rf-ui-loading-state'}
      data-testid={testId}
      role="status"
      aria-live="polite"
    >
      <p className="rf-ui-loading-state__title">{title}</p>
      {description ? <p className="table-cell-caption table-cell-muted">{description}</p> : null}
    </div>
  );
}
