import type { CSSProperties } from 'react';
import { EmptyState, StatCard } from '../../../shared/ui';
import { useRelatoriosStore } from '../store/useRelatoriosStore';

function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function PerformanceTab() {
  const pedidos = useRelatoriosStore((s) => s.pedidos);

  const entregues = pedidos.filter((p) => p.status === 'entregue');
  const faturamento = entregues.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const ticketMedio = entregues.length ? faturamento / entregues.length : 0;

  const statusMap: Record<string, number> = {};
  pedidos.forEach((p) => {
    const key = String(p.status || 'sem_status');
    statusMap[key] = (statusMap[key] || 0) + 1;
  });
  const totalPedidos = pedidos.length || 1;
  const statusEntries = Object.entries(statusMap).sort(([, a], [, b]) => b - a);

  const clientesMap: Record<string, { total: number; pedidos: number }> = {};
  pedidos.forEach((p) => {
    const key = String(p.cli || 'Sem cliente');
    if (!clientesMap[key]) clientesMap[key] = { total: 0, pedidos: 0 };
    clientesMap[key].total += Number(p.total || 0);
    clientesMap[key].pedidos += 1;
  });
  const topClientes = Object.entries(clientesMap)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8);

  return (
    <div className="rf-ui-stack">
      <div className="rf-ui-stat-grid">
        <StatCard label="Pedidos" value={pedidos.length} />
        <StatCard label="Entregues" value={entregues.length} tone="success" />
        <StatCard label="Faturamento" value={fmt(faturamento)} />
        <StatCard label="Ticket médio" value={fmt(ticketMedio)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            Status dos pedidos
          </h3>
          {statusEntries.length > 0 ? (
            <div className="flex flex-col gap-4">
              {statusEntries.map(([status, qtd]) => (
                <div key={status} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{status.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-extrabold text-slate-900">{qtd}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(2, (qtd / totalPedidos) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem pedidos." compact />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            Top clientes por faturamento
          </h3>
          {topClientes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {topClientes.map(([nome, dados]) => (
                <div key={nome} className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0">
                     {nome.substring(0, 2).toUpperCase()}
                   </div>
                  <div className="flex-grow min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{nome}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {dados.pedidos} pedido(s) • <span className="text-emerald-600 font-bold">{fmt(dados.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhum cliente com pedido." compact />
          )}
        </div>
      </div>
    </div>
  );
}
