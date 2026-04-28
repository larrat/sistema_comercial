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
  className?: string;
  ariaLabel?: string;
  testId?: string;
};

type FilterBarProps = {
  children?: ReactNode;
  search?: FilterBarSearchConfig;
  filters?: FilterBarFilterConfig[];
  actions?: ReactNode;
};

export function FilterBar({ children, search, filters = [], actions }: FilterBarProps) {
  const hasConfigMode = Boolean(search) || filters.length > 0;

  return (
    <section className="rf-ui-filter-bar" aria-label="Filtros">
      <div className="rf-ui-filter-bar__fields">
        {hasConfigMode ? (
          <>
            {search ? (
              <input
                className={
                  search.className ??
                  'h-9 w-[280px] rounded-md border border-gray-300 px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none'
                }
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
                className={
                  filter.className ??
                  'h-9 rounded-md border border-gray-300 px-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none'
                }
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                aria-label={filter.ariaLabel ?? `Filtro ${filter.key}`}
                data-testid={filter.testId}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </>
        ) : (
          children
        )}
      </div>
      {actions ? <div className="rf-ui-filter-bar__actions">{actions}</div> : null}
    </section>
  );
}
