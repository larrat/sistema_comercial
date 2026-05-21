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
  if (compact) {
    return (
      <div className="w-full flex items-center gap-3 p-4 bg-surface-hover rounded-xl animate-pulse" data-testid={testId} role="status">
        <div className="h-6 w-6 rounded-full bg-slate-700/50"></div>
        <div className="h-4 w-32 rounded bg-slate-700/50"></div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col gap-6 p-8 bg-surface-card rounded-2xl animate-pulse border border-border-subtle"
      data-testid={testId}
      role="status"
    >
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 bg-slate-700/50 rounded"></div>
        {description && <div className="h-4 w-64 bg-slate-700/30 rounded mt-2"></div>}
      </div>

      <div className="flex gap-4">
        <div className="h-24 flex-1 bg-slate-700/40 rounded-xl"></div>
        <div className="h-24 flex-1 bg-slate-700/40 rounded-xl hidden sm:block"></div>
        <div className="h-24 flex-1 bg-slate-700/40 rounded-xl hidden md:block"></div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <div className="h-12 w-full bg-slate-700/30 rounded-xl"></div>
        <div className="h-12 w-full bg-slate-700/30 rounded-xl"></div>
        <div className="h-12 w-full bg-slate-700/30 rounded-xl"></div>
      </div>
    </div>
  );
}
