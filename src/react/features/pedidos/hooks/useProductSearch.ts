import { useState, useEffect, useRef } from 'react';
import type { PdvProdutoSearchResult } from '../services/produtosApi';
import { searchProdutosPdv } from '../services/produtosApi';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

export type ProductSearchState = {
  query: string;
  setQuery: (_query: string) => void;
  results: PdvProdutoSearchResult[];
  isSearching: boolean;
  error: string | null;
  searchMs: number | null;
  activeIndex: number;
  setActiveIndex: (_index: number | ((_prev: number) => number)) => void;
  clear: () => void;
};

export function useProductSearch(): ProductSearchState {
  const session = useAuthStore((state) => state.session);
  const filialId = useFilialStore((state) => state.filialId);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PdvProdutoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMs, setSearchMs] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const searchRequestRef = useRef(0);

  function resolveContext() {
    if (!session?.access_token || !filialId) return null;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return null;
    return { url, key, token: session.access_token, filialId };
  }

  function clear() {
    setQuery('');
    setResults([]);
    setError(null);
    setSearchMs(null);
    setActiveIndex(0);
    setIsSearching(false);
  }

  useEffect(() => {
    const trimmedQuery = query.trim();
    const context = resolveContext();
    if (!trimmedQuery) {
      clear();
      return;
    }
    if (!context) return;

    const requestId = ++searchRequestRef.current;
    const timer = window.setTimeout(() => {
      const startedAt = performance.now();
      setIsSearching(true);
      setError(null);
      
      searchProdutosPdv(context, trimmedQuery, 8)
        .then((res) => {
          if (requestId !== searchRequestRef.current) return;
          const inStockResults = res.filter((p) => Number(p.esal) > 0);
          setResults(inStockResults);
          setActiveIndex(0);
          setSearchMs(Math.round(performance.now() - startedAt));
        })
        .catch((err) => {
          if (requestId !== searchRequestRef.current) return;
          setError(err instanceof Error ? err.message : 'Erro ao buscar produto.');
          setResults([]);
          setSearchMs(null);
        })
        .finally(() => {
          if (requestId === searchRequestRef.current) setIsSearching(false);
        });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [query, session?.access_token, filialId]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    searchMs,
    activeIndex,
    setActiveIndex,
    clear
  };
}
