import type { CSSProperties } from 'react';
import { EmptyState, StatCard } from '../../../shared/ui';
import { useRelatoriosStore } from '../store/useRelatoriosStore';

export function ClientesTab() {
  const clientes = useRelatoriosStore((s) => s.clientes);

  const comAniversario = clientes.filter((c) => String(c.data_aniversario || '').trim()).length;
  const marketing = clientes.filter((c) => c.optin_marketing).length;
  const prospects = clientes.filter((c) => String(c.status || '').toLowerCase() === 'prospecto').length;

  const statusMap: Record<string, number> = {};
  clientes.forEach((c) => {
    const key = String(c.status || 'sem_status');
    statusMap[key] = (statusMap[key] || 0) + 1;
  });
  const totalClientes = clientes.length || 1;
  const statusEntries = Object.entries(statusMap).sort(([, a], [, b]) => b - a);

  const segMap: Record<string, { total: number; marketing: number }> = {};
  clientes.forEach((c) => {
    const seg = String(c.seg || 'Sem segmento');
    if (!segMap[seg]) segMap[seg] = { total: 0, marketing: 0 };
    segMap[seg].total += 1;
    if (c.optin_marketing) segMap[seg].marketing += 1;
  });
  const topSegmentos = Object.entries(segMap)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8);

  return (
    <div className="rf-ui-stack">
      <div className="rf-ui-stat-grid">
        <StatCard label="Clientes" value={clientes.length} />
        <StatCard label="Com aniversário" value={comAniversario} />
        <StatCard label="Opt-in marketing" value={marketing} tone="success" />
        <StatCard label="Prospectos" value={prospects} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            Status da base
          </h3>
          {statusEntries.length > 0 ? (
            <div className="flex flex-col gap-4">
              {statusEntries.map(([status, qtd]) => (
                <div key={status} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{status.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-extrabold text-white">{qtd}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(2, (qtd / totalClientes) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem clientes cadastrados." compact />
          )}
        </div>

        <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            Segmentos e opt-ins
          </h3>
          {topSegmentos.length > 0 ? (
            <div className="flex flex-col gap-3">
              {topSegmentos.map(([seg, dados]) => (
                <div key={seg} className="p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                     {seg.substring(0, 2).toUpperCase()}
                   </div>
                  <div className="flex-grow min-w-0">
                    <div className="text-sm font-bold text-white truncate">{seg}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {dados.total} cliente(s) • <span className="text-emerald-400">{dados.marketing} marketing</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem segmentos suficientes." compact />
          )}
        </div>
      </div>
    </div>
  );
}
