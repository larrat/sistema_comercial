import { useMemo, useState } from 'react';
import { 
  Card as TremorCard, 
  Title, 
  Text, 
  Grid, 
  Metric, 
  BarList, 
  Flex, 
  Badge as TremorBadge,
  Bold,
  Col
} from '@tremor/react';
import { DataTable } from '../../../shared/ui';

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
    <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
      {/* KPIs de Performance */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <TremorCard decoration="top" decorationColor="indigo" className="!bg-surface-card !border-border-subtle shadow-premium">
          <Text className="!text-text-muted uppercase tracking-tighter font-bold">Ações registradas</Text>
          <Metric className="!text-text-primary !font-black">{kpis.total}</Metric>
        </TremorCard>
        <TremorCard decoration="top" decorationColor="cyan" className="!bg-surface-card !border-border-subtle shadow-premium">
          <Text className="!text-text-muted uppercase tracking-tighter font-bold">Tempo médio</Text>
          <Metric className="!text-text-primary !font-black">{kpis.avgDuration}ms</Metric>
        </TremorCard>
        <TremorCard decoration="top" decorationColor="amber" className="!bg-surface-card !border-border-subtle shadow-premium">
          <Text className="!text-text-muted uppercase tracking-tighter font-bold">Ação mais usada</Text>
          <Metric className="!text-text-primary !text-lg !font-bold mt-2 truncate">{kpis.topEvent}</Metric>
        </TremorCard>
        <TremorCard decoration="top" decorationColor={kpis.errors > 0 ? 'rose' : 'emerald'} className="!bg-surface-card !border-border-subtle shadow-premium">
          <Text className="!text-text-muted uppercase tracking-tighter font-bold">Falhas (Erros)</Text>
          <Metric className={`!font-black ${kpis.errors > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{kpis.errors}</Metric>
        </TremorCard>
      </Grid>

      <Grid numItemsLg={3} className="gap-6">
        {/* Gráfico de Ações Lentas */}
        <Col numColSpanLg={1}>
          <TremorCard className="!bg-surface-card !border-border-subtle shadow-premium">
            <Title className="!text-text-primary !font-bold mb-6">Latência por Evento (ms)</Title>
            <BarList data={slowActionsData} color="indigo" valueFormatter={(v) => `${v}ms`} />
          </TremorCard>
        </Col>

        {/* Tabela de Eventos */}
        <Col numColSpanLg={2}>
          <TremorCard className="!bg-surface-card !border-border-subtle shadow-premium">
            <Title className="!text-text-primary !font-bold mb-6">Log de Operações em Tempo Real</Title>
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
                { key: 'evento', label: 'Evento', render: (row) => <Bold className="!text-text-primary">{row.event}</Bold> },
                { key: 'area', label: 'Módulo', render: (row) => <TremorBadge color="slate">{row.area}</TremorBadge> },
                { key: 'duracao', label: 'Duração', render: (row) => <Text color={row.durationMs > 1000 ? 'rose' : 'slate'}>{row.durationMs}ms</Text> },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => (
                    <TremorBadge color={row.status === 'error' ? 'rose' : 'emerald'}>
                      {row.status.toUpperCase()}
                    </TremorBadge>
                  )
                },
                { key: 'hora', label: 'Hora', render: (row) => <Text className="!font-mono !text-[10px]">{row.createdAt}</Text> }
              ]}
            />
          </TremorCard>
        </Col>
      </Grid>
    </main>
  );
}
