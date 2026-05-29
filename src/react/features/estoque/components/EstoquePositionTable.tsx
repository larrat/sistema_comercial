import { useState, useMemo } from 'react';
import { EmptyState, StatusBadge, Button } from '../../../shared/ui';
import type { EstoquePositionRow } from '../types';
import { Package, ChevronDown, ChevronRight, ArrowUpDown, TrendingDown, AlertTriangle } from 'lucide-react';

type EstoquePositionTableProps = {
  rows: EstoquePositionRow[];
  totalProdutos: number;
  onMoveProduct: (row: EstoquePositionRow) => void;
};

type SortKey = 'nome' | 'saldo' | 'valorEstoque' | 'status';
type SortDir = 'asc' | 'desc';

function fmtCurrency(value: number) {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function fmtQuantity(value: number) {
  return Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function statusOrder(status: EstoquePositionRow['status']): number {
  if (status === 'zerado') return 0;
  if (status === 'baixo') return 1;
  return 2;
}

function StockLevelBar({ saldo, minimo, status }: { saldo: number; minimo: number; status: EstoquePositionRow['status'] }) {
  // If no minimum defined, show a simple indicator
  if (minimo <= 0) {
    const barColor = saldo <= 0
      ? 'bg-rose-500/60'
      : 'bg-emerald-500/60';
    return (
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: saldo <= 0 ? '3%' : '100%' }}
        />
      </div>
    );
  }

  // With a minimum, show percentage fill
  const pct = Math.min(Math.max((saldo / minimo) * 100, 0), 200);
  const displayPct = Math.min(pct, 100);

  const barColor = status === 'zerado'
    ? 'bg-rose-500'
    : status === 'baixo'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div className="w-full">
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1.5 relative">
        {/* Minimum threshold marker */}
        <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white/20 z-10" title="Estoque mínimo" />
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${displayPct / 2}%` }}
        />
      </div>
    </div>
  );
}

export function EstoquePositionTable({
  rows,
  totalProdutos,
  onMoveProduct
}: EstoquePositionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'nome':
          cmp = a.nome.localeCompare(b.nome, 'pt-BR');
          break;
        case 'saldo':
          cmp = a.saldo - b.saldo;
          break;
        case 'valorEstoque':
          cmp = a.valorEstoque - b.valorEstoque;
          break;
        case 'status':
          cmp = statusOrder(a.status) - statusOrder(b.status);
          if (cmp === 0) cmp = a.nome.localeCompare(b.nome, 'pt-BR');
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [rows, sortKey, sortDir]);

  const grouped = useMemo(() => {
    const map = new Map<string, EstoquePositionRow[]>();
    sortedRows.forEach(row => {
      const cat = row.categoria || 'Sem categoria';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(row);
    });
    // Sort categories: those with alerts first
    return [...map.entries()].sort((a, b) => {
      const aAlerts = a[1].filter(r => r.status === 'zerado' || r.status === 'baixo').length;
      const bAlerts = b[1].filter(r => r.status === 'zerado' || r.status === 'baixo').length;
      if (aAlerts !== bAlerts) return bAlerts - aAlerts;
      return a[0].localeCompare(b[0], 'pt-BR');
    });
  }, [sortedRows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleCategory(cat: string) {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  if (!rows.length) {
    return (
      <EmptyState
        title={
          totalProdutos
            ? 'Nenhum item combina com os filtros atuais.'
            : 'Ainda não há produtos para acompanhar no estoque.'
        }
        description={
          totalProdutos
            ? 'Limpe a busca ou ajuste o status para voltar a ver a posição do estoque.'
            : 'Cadastre produtos primeiro para começar a movimentar e monitorar saldo.'
        }
      />
    );
  }

  // Summary stats for the top
  const totalValor = rows.reduce((s, r) => s + r.valorEstoque, 0);
  const totalZerados = rows.filter(r => r.status === 'zerado').length;
  const totalBaixo = rows.filter(r => r.status === 'baixo').length;
  const totalOk = rows.filter(r => r.status === 'ok').length;

  return (
    <div className="space-y-4">
      {/* Compact summary bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-6 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">OK</span>
            <span className="text-white font-bold">{totalOk}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-400">Baixo</span>
            <span className="text-white font-bold">{totalBaixo}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-400">Zerado</span>
            <span className="text-white font-bold">{totalZerados}</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Valor total</span>
            <span className="text-white font-bold">{fmtCurrency(totalValor)}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
              viewMode === 'grouped'
                ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                : 'bg-white/5 text-slate-500 border border-white/5 hover:text-slate-300'
            }`}
          >
            Por Categoria
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flat')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
              viewMode === 'flat'
                ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                : 'bg-white/5 text-slate-500 border border-white/5 hover:text-slate-300'
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <span>Ordenar:</span>
        {([
          ['status', 'Criticidade'],
          ['nome', 'Nome'],
          ['saldo', 'Saldo'],
          ['valorEstoque', 'Valor'],
        ] as [SortKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleSort(key)}
            className={`px-2 py-1 rounded-md transition-colors ${
              sortKey === key
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
            {sortKey === key && (
              <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'grouped' ? (
        <div className="space-y-3">
          {grouped.map(([cat, catRows]) => {
            const isCollapsed = collapsedCats.has(cat);
            const catValor = catRows.reduce((s, r) => s + r.valorEstoque, 0);
            const catAlerts = catRows.filter(r => r.status === 'zerado' || r.status === 'baixo').length;

            return (
              <div key={cat} className="border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.01]">
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
                >
                  {isCollapsed
                    ? <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
                    : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
                  }
                  <span className="text-sm font-black text-white uppercase tracking-wide">{cat}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{catRows.length} {catRows.length === 1 ? 'item' : 'itens'}</span>
                  {catAlerts > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      <AlertTriangle size={10} />
                      {catAlerts} {catAlerts === 1 ? 'alerta' : 'alertas'}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-slate-400 font-bold">{fmtCurrency(catValor)}</span>
                </button>

                {/* Category rows */}
                {!isCollapsed && (
                  <div className="border-t border-white/[0.04]">
                    {catRows.map((row, i) => (
                      <ProductRow key={row.id} row={row} onMove={onMoveProduct} isLast={i === catRows.length - 1} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.01]">
          {sortedRows.map((row, i) => (
            <ProductRow key={row.id} row={row} onMove={onMoveProduct} isLast={i === sortedRows.length - 1} showCategory />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Individual Product Row ─── */
function ProductRow({
  row,
  onMove,
  isLast,
  showCategory
}: {
  row: EstoquePositionRow;
  onMove: (row: EstoquePositionRow) => void;
  isLast: boolean;
  showCategory?: boolean;
}) {
  const statusConfig = {
    zerado: { bg: 'bg-rose-500/10', border: 'border-l-rose-500', text: 'text-rose-400', label: 'Zerado', icon: <TrendingDown size={10} /> },
    baixo: { bg: 'bg-amber-500/10', border: 'border-l-amber-500', text: 'text-amber-400', label: 'Baixo', icon: <AlertTriangle size={10} /> },
    ok: { bg: 'bg-emerald-500/5', border: 'border-l-emerald-500', text: 'text-emerald-400', label: 'OK', icon: null },
    '': { bg: '', border: 'border-l-slate-600', text: 'text-slate-400', label: '—', icon: null },
  };

  const cfg = statusConfig[row.status] || statusConfig[''];

  return (
    <div
      className={`flex items-center gap-4 px-5 py-3 border-l-2 ${cfg.border} hover:bg-white/[0.03] transition-colors ${
        !isLast ? 'border-b border-b-white/[0.04]' : ''
      }`}
    >
      {/* Product thumbnail */}
      <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {row.foto_url ? (
          <img src={row.foto_url} alt={row.nome} className="w-full h-full object-cover" />
        ) : (
          <Package size={16} className="text-slate-600" />
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white truncate">{row.nome}</span>
          {showCategory && row.categoria && (
            <span className="text-[9px] font-bold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-md flex-shrink-0">
              {row.categoria}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-teal-500 font-bold">{row.sku || '—'}</span>
          <StockLevelBar saldo={row.saldo} minimo={row.minimo} status={row.status} />
        </div>
      </div>

      {/* Saldo */}
      <div className="text-right flex-shrink-0 w-20">
        <div className={`text-sm font-black ${row.saldo <= 0 ? 'text-rose-400' : 'text-white'}`}>
          {fmtQuantity(row.saldo)} <span className="text-[10px] text-slate-500 font-medium">{row.unidade}</span>
        </div>
        <div className="text-[10px] text-slate-500">
          {row.minimo > 0 ? `Mín. ${fmtQuantity(row.minimo)}` : 'Sem mín.'}
        </div>
      </div>

      {/* Cost */}
      <div className="text-right flex-shrink-0 w-24 hidden md:block">
        <div className="text-xs text-slate-300 font-bold">{fmtCurrency(row.custoMedio)}</div>
        <div className="text-[10px] text-slate-600">custo médio</div>
      </div>

      {/* Value */}
      <div className="text-right flex-shrink-0 w-28 hidden lg:block">
        <div className="text-xs text-white font-bold">{fmtCurrency(row.valorEstoque)}</div>
        <div className="text-[10px] text-slate-600">em estoque</div>
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0 w-20 flex justify-center">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        <Button
          size="sm"
          onClick={() => onMove(row)}
          className="!rounded-xl !text-[10px] !font-bold !px-3 !py-1.5"
        >
          + Movimento
        </Button>
      </div>
    </div>
  );
}
