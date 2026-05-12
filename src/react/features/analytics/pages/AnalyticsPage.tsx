import { useMemo, useState } from 'react';

import { DataTable, StatCard } from '../../../shared/ui';

type AnalyticsEvent = {
  id: string;
  event: string;
  area: string;
  durationMs: number;
  status: 'success' | 'error';
  createdAt: string;
};

const MOCK_EVENTS: AnalyticsEvent[] = [
  { id: '1', event: 'clientes:abrir-detalhe', area: 'Clientes', durationMs: 120, status: 'success', createdAt: '10:01' },
  { id: '2', event: 'clientes:salvar', area: 'Clientes', durationMs: 820, status: 'success', createdAt: '10:03' },
  { id: '3', event: 'pedidos:novo', area: 'Pedidos', durationMs: 640, status: 'success', createdAt: '10:06' },
  { id: '4', event: 'produtos:buscar', area: 'Produtos', durationMs: 150, status: 'success', createdAt: '10:08' },
  { id: '5', event: 'clientes:exportar', area: 'Clientes', durationMs: 1440, status: 'error', createdAt: '10:11' },
  { id: '6', event: 'estoque:movimentar', area: 'Estoque', durationMs: 910, status: 'success', createdAt: '10:15' },
  { id: '7', event: 'clientes:buscar', area: 'Clientes', durationMs: 95, status: 'success', createdAt: '10:17' },
  { id: '8', event: 'pedidos:buscar', area: 'Pedidos', durationMs: 130, status: 'success', createdAt: '10:20' },
  { id: '9', event: 'clientes:salvar', area: 'Clientes', durationMs: 980, status: 'error', createdAt: '10:23' },
  { id: '10', event: 'estoque:buscar', area: 'Estoque', durationMs: 110, status: 'success', createdAt: '10:26' },
  { id: '11', event: 'clientes:abrir-detalhe', area: 'Clientes', durationMs: 115, status: 'success', createdAt: '10:28' },
  { id: '12', event: 'produtos:editar', area: 'Produtos', durationMs: 1020, status: 'success', createdAt: '10:31' }
];

export function AnalyticsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sortedEvents = useMemo(
    () => [...MOCK_EVENTS].sort((a, b) => b.durationMs - a.durationMs),
    []
  );
  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedEvents.slice(start, start + pageSize);
  }, [page, pageSize, sortedEvents]);

  const kpis = useMemo(() => {
    const total = MOCK_EVENTS.length;
    const totalDuration = MOCK_EVENTS.reduce((acc, item) => acc + item.durationMs, 0);
    const avgDuration = total ? Math.round(totalDuration / total) : 0;

    const countsByEvent = MOCK_EVENTS.reduce<Record<string, number>>((acc, item) => {
      acc[item.event] = (acc[item.event] ?? 0) + 1;
      return acc;
    }, {});
    const topEvent = Object.entries(countsByEvent).sort((a, b) => b[1] - a[1])[0];
    const errors = MOCK_EVENTS.filter((item) => item.status === 'error').length;

    return {
      total,
      avgDuration,
      topEvent: topEvent ? `${topEvent[0]} (${topEvent[1]})` : '-',
      errors
    };
  }, []);

  const topSlowActions = useMemo(() => sortedEvents.slice(0, 5), [sortedEvents]);
  const maxDuration = topSlowActions[0]?.durationMs ?? 1;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6" data-testid="analytics-page">
      <section className="rf-ui-stat-grid rf-ui-stat-grid--2">
        <StatCard label="Ações registradas" value={kpis.total} />
        <StatCard label="Tempo médio" value={`${kpis.avgDuration}ms`} />
        <StatCard label="Ação mais usada" value={kpis.topEvent} />
        <StatCard label="Falhas" value={kpis.errors} tone={kpis.errors > 0 ? 'warning' : 'success'} />
      </section>

      <section className="card-shell rf-ui-stack">
        <h2 className="rf-ui-form-section__title">Gráficos simples</h2>
        <div className="rf-ui-stack">
          {topSlowActions.map((item) => (
            <div key={item.id} className="rf-ui-stack" style={{ gap: '6px' }}>
              <div className="table-cell-caption table-cell-muted">
                {item.event} · {item.durationMs}ms
              </div>
              <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '999px' }}>
                <div
                  style={{
                    width: `${Math.max(8, Math.round((item.durationMs / maxDuration) * 100))}%`,
                    height: '8px',
                    borderRadius: '999px',
                    background: '#9ca3af'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rf-ui-stack">
        <h2 className="rf-ui-form-section__title">Tabela de eventos</h2>
        <DataTable
          data={paginatedEvents}
          rowKey={(row) => row.id}
          page={page}
          pageSize={pageSize}
          total={sortedEvents.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          columns={[
            { key: 'evento', label: 'Evento', render: (row) => row.event },
            { key: 'area', label: 'Módulo', render: (row) => row.area },
            { key: 'duracao', label: 'Duração', render: (row) => `${row.durationMs}ms` },
            {
              key: 'status',
              label: 'Status',
              render: (row) => (
                <span className={row.status === 'error' ? 'text-red-600' : 'text-emerald-600'}>
                  {row.status}
                </span>
              )
            },
            { key: 'hora', label: 'Hora', render: (row) => row.createdAt }
          ]}
        />
      </section>
    </main>
  );
}
