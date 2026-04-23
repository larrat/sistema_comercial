import type { CSSProperties } from 'react';
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
      <div className="mg bento-band">
        <div className="met"><div className="ml">Pedidos</div><div className="mv">{pedidos.length}</div></div>
        <div className="met"><div className="ml">Entregues</div><div className="mv tone-success">{entregues.length}</div></div>
        <div className="met"><div className="ml">Faturamento</div><div className="mv">{fmt(faturamento)}</div></div>
        <div className="met"><div className="ml">Ticket médio</div><div className="mv">{fmt(ticketMedio)}</div></div>
      </div>

      <div className="rel-bento-grid">
        <div className="card card-shell">
          <div className="ct">Status dos pedidos</div>
          {statusEntries.length > 0 ? (
            statusEntries.map(([status, qtd]) => (
              <div key={status} className="rrow rel-kpi-row">
                <div className="rel-kpi-label">{status.replace(/_/g, ' ')}</div>
                <div className="rel-kpi-bar">
                  <span style={{ '--rel-bar-pct': `${Math.max(8, (qtd / totalPedidos) * 100)}%` } as CSSProperties} />
                </div>
                <div className="rel-kpi-value">{qtd}</div>
              </div>
            ))
          ) : (
            <div className="empty"><div className="ico">PD</div><p>Sem pedidos.</p></div>
          )}
        </div>

        <div className="card card-shell">
          <div className="ct">Top clientes por faturamento</div>
          {topClientes.length > 0 ? (
            topClientes.map(([nome, dados]) => (
              <div key={nome} className="rrow rel-op-row">
                <span className="rel-op-dot rel-op-dot--success" />
                <div className="rel-grow">
                  <div className="rel-op-title">{nome}</div>
                  <div className="rel-op-sub">{dados.pedidos} pedido(s) • {fmt(dados.total)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty"><div className="ico">CL</div><p>Nenhum cliente com pedido.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
