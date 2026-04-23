import type { ReactNode } from 'react';

type FilterBarProps = {
  children: ReactNode;
  actions?: ReactNode;
};

export function FilterBar({ children, actions }: FilterBarProps) {
  return (
    <section className="rf-ui-filter-bar" aria-label="Filtros">
      <div className="rf-ui-filter-bar__fields">{children}</div>
      {actions ? <div className="rf-ui-filter-bar__actions">{actions}</div> : null}
    </section>
  );
}
