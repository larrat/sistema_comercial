import { useMemo, useState } from 'react';
import { Card, Badge, Typography, DataTable } from '../../../shared/ui';

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

  const slowActionsData = useMemo(() => 
    sortedEvents.slice(0, 6).map(e => ({ name: e.event, value: e.durationMs })), 
    [sortedEvents]
  );

  return (
    <div className="w-full flex flex-col gap-8">
      {/* KPIs de Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex flex-col gap-2">
          <Typography variant="label" color="muted" className="uppercase tracking-tighter">Ações registradas</Typography>
          <Typography variant="h2" className="!font-black text-indigo-400">{kpis.total}</Typography>
        </Card>
        <Card className="flex flex-col gap-2">
          <Typography variant="label" color="muted" className="uppercase tracking-tighter">Tempo médio</Typography>
          <Typography variant="h2" className="!font-black text-teal-400">{kpis.avgDuration}ms</Typography>
        </Card>
        <Card className="flex flex-col gap-2">
          <Typography variant="label" color="muted" className="uppercase tracking-tighter">Ação mais usada</Typography>
          <Typography variant="h3" className="!font-bold text-amber-400 mt-2 truncate">{kpis.topEvent}</Typography>
        </Card>
        <Card className="flex flex-col gap-2">
          <Typography variant="label" color="muted" className="uppercase tracking-tighter">Falhas (Erros)</Typography>
          <Typography variant="h2" className={`!font-black${kpis.errors > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{kpis.errors}</Typography>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Ações Lentas */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col gap-4">
            <Typography variant="h3" className="font-bold">Latência por Evento (ms)</Typography>
            <div className="flex flex-col gap-3 mt-4">
              {slowActionsData.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 truncate">{item.name}</span>
                    <span className="text-slate-400 font-mono">{item.value}ms</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${Math.min(100, (item.value / 2000) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Tabela de Eventos */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <Typography variant="h3" className="font-bold mb-6">Log de Operações em Tempo Real</Typography>
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
                { key: 'evento', label: 'Evento', render: (row) => <strong className="text-slate-200">{row.event}</strong> },
                { key: 'area', label: 'Módulo', render: (row) => <Badge variant="slate">{row.area}</Badge> },
                { key: 'duracao', label: 'Duração', render: (row) => <span className={row.durationMs > 1000 ? 'text-rose-400' : 'text-slate-400'}>{row.durationMs}ms</span> },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => (
                    <Badge variant={row.status === 'error' ? 'red' : 'green'}>
                      {row.status.toUpperCase()}
                    </Badge>
                  )
                },
                { key: 'hora', label: 'Hora', render: (row) => <span className="font-mono text-[10px] text-slate-500">{row.createdAt}</span> }
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
