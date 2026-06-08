import { DollarSign } from 'lucide-react';
import { StatusBadge } from '../../../shared/ui';

type PdvLeftPanelHeaderProps = {
  pdvViewMode: 'list' | 'grid';
  setPdvViewMode: (mode: 'list' | 'grid') => void;
  pendingQueueCount: number;
  saleToken: string;
  nowFormatted: string;
};

export function PdvLeftPanelHeader({
  pdvViewMode,
  setPdvViewMode,
  pendingQueueCount,
  saleToken,
  nowFormatted
}: PdvLeftPanelHeaderProps) {
  return (
    <header className="rf-pdv__panel-head flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="rf-pdv__title flex items-center gap-2 text-gold-premium font-extrabold uppercase tracking-wide">
          <DollarSign size={16} />
          Nova venda
        </div>
        {/* Catalog / List Toggle */}
        <div className="flex items-center gap-1 bg-black/45 p-1 rounded-lg border border-white/5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setPdvViewMode('list')}
            className={`px-2 py-1 rounded transition-all ${pdvViewMode === 'list' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-400'}`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setPdvViewMode('grid')}
            className={`px-2 py-1 rounded transition-all ${pdvViewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-400'}`}
          >
            Catálogo Grid
          </button>
        </div>
      </div>
      <div className="rf-pdv__head-meta">
        {pendingQueueCount > 0 ? (
          <StatusBadge tone="warning">
            {pendingQueueCount} venda{pendingQueueCount > 1 ? 's' : ''} pendente{pendingQueueCount > 1 ? 's' : ''}
          </StatusBadge>
        ) : null}
        <span>{saleToken}</span>
        <span>{nowFormatted}</span>
      </div>
    </header>
  );
}
