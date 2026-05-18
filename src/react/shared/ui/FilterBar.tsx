import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Button } from './Button';

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
  className?: string;
  search?: FilterBarSearchConfig;
  filters?: FilterBarFilterConfig[];
  actions?: ReactNode;
  onClearFilters?: () => void;
  activeFilterCount?: number;
};

export function FilterBar({
  children,
  className,
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
    <Button variant="secondary" size="sm" onClick={onClearFilters}>
      {activeFilterCount !== undefined ? `Limpar filtros (${activeFilterCount})` : 'Limpar filtros'}
    </Button>
  ) : null;

  return (
    <section className={`rf-ui-filter-bar${className ? ` ${className}` : ''}`} aria-label="Filtros">
      <div className="rf-ui-filter-bar__fields">
        {hasConfigMode ? (
          <>
            {search ? (
              <div className="relative flex items-center group" style={{ minWidth: 240, flex: 1 }}>
                <Search 
                  className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-brand-gold transition-colors" 
                  aria-hidden="true" 
                />
                <input
                  className={`${search.className ?? 'rf-input-premium'} !pl-10 !h-10 w-full !bg-white/5 backdrop-blur-sm focus:border-brand-gold focus:ring-brand-gold/20 transition-colors`}
                  type="search"
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                  placeholder={search.placeholder ?? 'Buscar...'}
                  aria-label={search.ariaLabel ?? 'Buscar'}
                  data-testid={search.testId}
                />
              </div>
            ) : null}
            {filters.map((filter) => (
              <select
                key={filter.key}
                className={`${filter.className ?? 'rf-input-premium'} !h-10 !py-0 !pr-10 !bg-white/5 backdrop-blur-sm focus:border-brand-gold transition-colors cursor-pointer`}
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
