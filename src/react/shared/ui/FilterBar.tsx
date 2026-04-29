import type { ReactNode } from 'react';

type FilterBarOption = {
  value: string;
  label: string;
};

type FilterBarSearchConfig = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  testId?: string;
};

type FilterBarFilterConfig = {
  key: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterBarOption[];
  label?: string;
  className?: string;
  ariaLabel?: string;
  testId?: string;
};

type FilterBarProps = {
  children?: ReactNode;
  search?: FilterBarSearchConfig;
  filters?: FilterBarFilterConfig[];
  actions?: ReactNode;
  onClearFilters?: () => void;
  activeFilterCount?: number;
};

export function FilterBar({
  children,
  search,
  filters = [],
  actions,
  onClearFilters,
  activeFilterCount
}: FilterBarProps) {
  const hasConfigMode = Boolean(search) || filters.length > 0;
  const showClear =
    Boolean(onClearFilters) && (activeFilterCount === undefined || activeFilterCount > 0);

  const clearButton = showClear ? (
    <button type="button" className="btn btn-sm" onClick={onClearFilters}>
      {activeFilterCount !== undefined ? `Limpar filtros (${activeFilterCount})` : 'Limpar filtros'}
    </button>
  ) : null;

  return (
    <section className="rf-ui-filter-bar" aria-label="Filtros">
      <div className="rf-ui-filter-bar__fields">
        {hasConfigMode ? (
          <>
            {search ? (
              <input
                className={search.className ?? 'inp'}
                type="search"
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={search.placeholder ?? 'Buscar...'}
                aria-label={search.ariaLabel ?? 'Buscar'}
                data-testid={search.testId}
              />
            ) : null}
            {filters.map((filter) => (
              <select
                key={filter.key}
                className={filter.className ?? 'inp sel'}
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                aria-label={filter.ariaLabel ?? filter.label ?? `Filtro ${filter.key}`}
                data-testid={filter.testId}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
            {clearButton}
          </>
        ) : (
          <>
            {children}
            {clearButton}
          </>
        )}
      </div>
      {actions ? <div className="rf-ui-filter-bar__actions">{actions}</div> : null}
    </section>
  );
}
