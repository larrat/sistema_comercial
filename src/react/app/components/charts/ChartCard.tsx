import type { ReactNode } from 'react';
import { ZoomIn } from 'lucide-react';

type ChartCardProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  onDrillDown?: () => void;
  isFilterActive?: boolean;
};

export function ChartCard({ title, description, action, children, className, onDrillDown, isFilterActive }: ChartCardProps) {
  return (
    <section
      className={`bg-slate-900/60 backdrop-blur-xl border ${isFilterActive ? 'border-teal-500/30 shadow-[0_8px_32px_rgba(20,184,166,0.15)] ring-1 ring-teal-500/20' : 'border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'} rounded-2xl overflow-hidden transition-all duration-300 ${className ?? ''}`}
    >
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[15px] font-bold text-white tracking-tight leading-tight">{title}</h3>
          {description ? (
            <div className="text-[11px] font-medium text-slate-400 leading-snug">{description}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {action ? <div className="flex-shrink-0">{action}</div> : null}
          {onDrillDown && (
            <button 
              onClick={onDrillDown}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-teal-500/20 text-slate-400 hover:text-teal-400 border border-white/5 transition-all"
              title="Aprofundar análise (Drill-down)"
            >
              <ZoomIn size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 pb-5">{children}</div>
    </section>
  );
}
