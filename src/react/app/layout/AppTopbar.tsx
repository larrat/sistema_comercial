import { useRef } from 'react';
import { FilialSwitcher } from '../filial/FilialSwitcher';
import { useHotkeys } from '../../shared/hooks/useHotkeys';
import { NotificationCenter } from '../../features/dashboard/components/NotificationCenter';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listProdutos } from '../../features/produtos/services/produtosApi';
import { useAuthStore } from '../useAuthStore';
import { useFilialStore } from '../useFilialStore';
import { useUIStore } from '../useUIStore';
import { getSupabaseConfig } from '../supabaseConfig';
import { Search, Package, ChevronRight, X, Loader2, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../../shared/ui';
import { useApiContext } from '../../shared/hooks/useApiContext';

export function AppTopbar() {
  const { theme, toggleTheme } = useUIStore();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { resolve, filialId } = useApiContext();
  const navigate = useNavigate();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['global-search-produtos', filialId],
    queryFn: () => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return listProdutos(context);
    },
    enabled: !!filialId && showResults
  });

  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    const low = query.toLowerCase();
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(low) || 
      (p.sku && p.sku.toLowerCase().includes(low))
    ).slice(0, 8);
  }, [produtos, query]);

  useHotkeys('Alt+k', () => {
    searchRef.current?.focus();
    setShowResults(true);
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        // Delay closing to allow clicking results
        setTimeout(() => setShowResults(false), 200);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full flex h-20 items-center justify-between px-4 sm:px-8 bg-surface-card/40 backdrop-blur-3xl border-b border-border-subtle shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
      <div className="flex-1 max-w-lg relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-teal-400 transition-colors">
          <Search className="w-4 h-4" />
        </div>
        <input 
          ref={searchRef}
          type="text" 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Busca global de produtos... (Alt + K)" 
          className="block w-full h-11 pl-11 pr-10 border border-white/5 rounded-2xl leading-5 bg-black/20 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 focus:border-teal-500/50 sm:text-sm text-white transition-all shadow-inner"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}

        <AnimatePresence>
          {showResults && (query.trim() || isLoading) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-surface-card border border-border-bold rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {isLoading ? (
                <div className="p-4 flex items-center justify-center gap-3 text-text-muted">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Buscando...</span>
                </div>
              ) : filteredResults.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-border-subtle bg-surface-hover">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Produtos Encontrados</span>
                  </div>
                  {filteredResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        navigate(`/app/produtos?id=${p.id}`);
                        setShowResults(false);
                        setQuery('');
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors border-b border-border-subtle last:border-0 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-surface-active border border-border-subtle overflow-hidden flex-shrink-0 flex items-center justify-center text-text-muted group-hover:text-accent transition-colors">
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-text-primary truncate">{p.nome}</span>
                          <Badge variant="slate" className="!text-[8px] !py-0">{p.sku || 'S/SKU'}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-text-muted">{p.cat || 'Sem categoria'}</span>
                          {p.genero && <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">/ {p.genero}</span>}
                          {p.tamanho && <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter">/ {p.tamanho}</span>}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-text-tertiary group-hover:text-text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="p-8 text-center flex flex-col items-center gap-3">
                  <Search size={24} className="text-text-tertiary" />
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Nenhum produto para "{query}"</p>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex items-center gap-4 sm:gap-6">
        <NotificationCenter />
        
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-surface-active border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-all shadow-sm"
          title={`Mudar para tema ${theme === 'light' ? 'Escuro' : 'Claro'}`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="h-8 w-px bg-border-bold mx-1" />
        
        <FilialSwitcher isTopbar={true} />
        
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 font-black text-sm shadow-sm">
          US
        </div>
      </div>
    </header>
  );
}
