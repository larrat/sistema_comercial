import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useEstoqueFilters } from '../hooks/useEstoqueFilters';
import type { EstoqueView } from '../types';

const VIEW_TABS: { key: EstoqueView; label: string }[] = [
  { key: 'posicao', label: 'Posição' },
  { key: 'historico', label: 'Histórico' },
  { key: 'cobertura', label: 'Cobertura' },
  { key: 'sem_movimento', label: 'Sem Movimento' },
];

export function EstoqueInlineFilters() {
  const {
    view,
    periodo,
    buscaPosicao,
    statusFilter,
    categoriaFilter,
    buscaHistorico,
    tipoHistorico,
    categorias,
    setView,
    setPeriodo,
    setBuscaPosicao,
    setStatusFilter,
    setCategoriaFilter,
    setBuscaHistorico,
    setTipoHistorico
  } = useEstoqueFilters();

  const isPosition = view !== 'historico';
  const searchValue = isPosition ? buscaPosicao : buscaHistorico;
  const setSearchValue = isPosition ? setBuscaPosicao : setBuscaHistorico;

  const hasActiveFilters = isPosition
    ? [buscaPosicao, statusFilter, categoriaFilter].some(Boolean)
    : [buscaHistorico, tipoHistorico].some(Boolean);

  function clearAllFilters() {
    if (isPosition) {
      setBuscaPosicao('');
      setStatusFilter('');
      setCategoriaFilter('');
    } else {
      setBuscaHistorico('');
      setTipoHistorico('');
    }
  }

  return (
    <div className="space-y-0">
      {/* Row 1: Tabs + Period selector */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {VIEW_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`
                px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200
                ${view === key
                  ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-sm shadow-teal-500/10'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-slate-300 
                     focus:outline-none focus:border-teal-500/40 transition-colors appearance-none cursor-pointer
                     min-w-[140px]"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as any)}
          aria-label="Filtrar por período"
        >
          <option value="semana">Últimos 7 dias</option>
          <option value="mes">Últimos 30 dias</option>
          <option value="ano">Últimos 12 meses</option>
          <option value="tudo">Todo o período</option>
        </select>
      </div>

      {/* Row 2: Search + inline filter pills */}
      <div className="flex items-center gap-3 pt-4 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={isPosition ? 'Buscar produto ou SKU...' : 'Buscar no histórico...'}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2.5 text-xs text-white 
                       placeholder:text-slate-600 focus:outline-none focus:border-teal-500/40 focus:bg-white/[0.06] transition-all"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={12} className="text-slate-600" />

          {isPosition ? (
            <>
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filtrar por status"
                className={`
                  bg-white/[0.04] border rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer
                  focus:outline-none appearance-none
                  ${statusFilter
                    ? 'border-teal-500/30 text-teal-400 bg-teal-500/10'
                    : 'border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                  }
                `}
              >
                <option value="">Status</option>
                <option value="ok">OK</option>
                <option value="baixo">Baixo</option>
                <option value="zerado">Zerado</option>
              </select>

              {/* Category filter */}
              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                aria-label="Filtrar por categoria"
                className={`
                  bg-white/[0.04] border rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer
                  focus:outline-none appearance-none max-w-[180px]
                  ${categoriaFilter
                    ? 'border-teal-500/30 text-teal-400 bg-teal-500/10'
                    : 'border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                  }
                `}
              >
                <option value="">Categoria</option>
                {categorias.map((c) => (
                  <option key={c} value={c.toLowerCase()}>{c}</option>
                ))}
              </select>
            </>
          ) : (
            /* History type filter */
            <select
              value={tipoHistorico}
              onChange={(e) => setTipoHistorico(e.target.value as any)}
              aria-label="Filtrar por tipo"
              className={`
                bg-white/[0.04] border rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer
                focus:outline-none appearance-none
                ${tipoHistorico
                  ? 'border-teal-500/30 text-teal-400 bg-teal-500/10'
                  : 'border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                }
              `}
            >
              <option value="">Tipo</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="ajuste">Ajuste</option>
              <option value="transf">Transferência</option>
            </select>
          )}

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider
                         text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
            >
              <X size={10} />
              Limpar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
