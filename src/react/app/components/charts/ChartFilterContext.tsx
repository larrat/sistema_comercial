import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type FilterValue = string | number | null;

type ChartFilterContextType = {
  filters: Map<string, FilterValue>;
  setFilter: (key: string, value: FilterValue) => void;
  getFilter: (key: string) => FilterValue | undefined;
  clearFilter: (key: string) => void;
  clearAll: () => void;
};

const ChartFilterContext = createContext<ChartFilterContextType | null>(null);

export function ChartFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Map<string, FilterValue>>(new Map());

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters((prev) => {
      const next = new Map(prev);
      if (value === null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  }, []);

  const getFilter = useCallback((key: string) => {
    return filters.get(key);
  }, [filters]);

  const clearFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFilters(new Map());
  }, []);

  return (
    <ChartFilterContext.Provider value={{ filters, setFilter, getFilter, clearFilter, clearAll }}>
      {children}
    </ChartFilterContext.Provider>
  );
}

export function useChartFilter() {
  const context = useContext(ChartFilterContext);
  if (!context) {
    // Return a dummy context if not wrapped in a provider, so charts can be used anywhere safely
    return {
      filters: new Map(),
      setFilter: () => {},
      getFilter: () => undefined,
      clearFilter: () => {},
      clearAll: () => {}
    };
  }
  return context;
}
