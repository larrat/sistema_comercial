import type { CSSProperties } from 'react';
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
      <div className="mg bento-band">
        <div className="met"><div className="ml">Clientes</div><div className="mv">{clientes.length}</div></div>
        <div className="met"><div className="ml">Com aniversário</div><div className="mv">{comAniversario}</div></div>
        <div className="met"><div className="ml">Opt-in marketing</div><div className="mv tone-success">{marketing}</div></div>
        <div className="met"><div className="ml">Prospectos</div><div className="mv tone-warning">{prospects}</div></div>
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
            <div className="empty"><div className="ico">CL</div><p>Sem clientes cadastrados.</p></div>
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
            <div className="empty"><div className="ico">SG</div><p>Sem segmentos suficientes.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
