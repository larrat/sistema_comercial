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

      <div className="rel-bento-grid">
        <div className="card card-shell">
          <div className="ct">Status da base</div>
          {statusEntries.length > 0 ? (
            statusEntries.map(([status, qtd]) => (
              <div key={status} className="rrow rel-kpi-row">
                <div className="rel-kpi-label">{status.replace(/_/g, ' ')}</div>
                <div className="rel-kpi-bar">
                  <span style={{ '--rel-bar-pct': `${Math.max(8, (qtd / totalClientes) * 100)}%` } as CSSProperties} />
                </div>
                <div className="rel-kpi-value">{qtd}</div>
              </div>
            ))
          ) : (
            <EmptyState title="Sem clientes cadastrados." compact />
          )}
        </div>

        <div className="card card-shell">
          <div className="ct">Segmentos e opt-ins</div>
          {topSegmentos.length > 0 ? (
            topSegmentos.map(([seg, dados]) => (
              <div key={seg} className="rrow rel-op-row">
                <span className="rel-op-dot" />
                <div className="rel-grow">
                  <div className="rel-op-title">{seg}</div>
                  <div className="rel-op-sub">{dados.total} cliente(s) • {dados.marketing} com opt-in marketing</div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Sem segmentos suficientes." compact />
          )}
        </div>
      </div>
    </div>
  );
}
