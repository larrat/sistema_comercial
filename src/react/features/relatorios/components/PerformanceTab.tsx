import { 
  Card as TremorCard, 
  Metric, 
  Text, 
  Flex, 
  Grid, 
  BarList,
  Title,
  Bold
} from '@tremor/react';
import { useRelatoriosStore } from '../store/useRelatoriosStore';

function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function PerformanceTab() {
  const pedidos = useRelatoriosStore((s) => s.pedidos);

  const entregues = pedidos.filter((p) => p.status === 'entregue');
  const faturamento = entregues.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const ticketMedio = entregues.length ? faturamento / entregues.length : 0;

  const statusData = Object.entries(
    pedidos.reduce<Record<string, number>>((acc, p) => {
      const key = String(p.status || 'sem_status').replace(/_/g, ' ').toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const clientesData = Object.entries(
    pedidos.reduce<Record<string, { total: number }>>((acc, p) => {
      const key = String(p.cli || 'Sem cliente');
      if (!acc[key]) acc[key] = { total: 0 };
      acc[key].total += Number(p.total || 0);
      return acc;
    }, {})
  )
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8)
    .map(([name, data]) => ({ name, value: data.total }));

  return (
    <div className="space-y-6">
      {/* KPIs de Topo */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <TremorCard decoration="left" decorationColor="indigo" className="!bg-surface-card !border-border-subtle">
          <Text className="!text-text-muted">Total de Pedidos</Text>
          <Metric className="!text-text-primary !font-black">{pedidos.length}</Metric>
        </TremorCard>
        <TremorCard decoration="left" decorationColor="emerald" className="!bg-surface-card !border-border-subtle">
          <Text className="!text-text-muted">Pedidos Entregues</Text>
          <Metric className="!text-text-primary !font-black">{entregues.length}</Metric>
        </TremorCard>
        <TremorCard decoration="left" decorationColor="cyan" className="!bg-surface-card !border-border-subtle">
          <Text className="!text-text-muted">Faturamento</Text>
          <Metric className="!text-text-primary !font-black">{fmt(faturamento)}</Metric>
        </TremorCard>
        <TremorCard decoration="left" decorationColor="amber" className="!bg-surface-card !border-border-subtle">
          <Text className="!text-text-muted">Ticket Médio</Text>
          <Metric className="!text-text-primary !font-black">{fmt(ticketMedio)}</Metric>
        </TremorCard>
      </Grid>

      <Grid numItemsLg={2} className="gap-6">
        {/* Distribuição por Status */}
        <TremorCard className="!bg-surface-card !border-border-subtle">
          <Title className="!text-text-primary !font-bold">Distribuição por Status</Title>
          <Flex className="mt-4">
            <Text className="!text-text-muted"><Bold>Status</Bold></Text>
            <Text className="!text-text-muted"><Bold>Qtd</Bold></Text>
          </Flex>
          <BarList data={statusData} color="emerald" className="mt-2" />
        </TremorCard>

        {/* Top Clientes */}
        <TremorCard className="!bg-surface-card !border-border-subtle">
          <Title className="!text-text-primary !font-bold">Top 8 Clientes (Faturamento)</Title>
          <Flex className="mt-4">
            <Text className="!text-text-muted"><Bold>Cliente</Bold></Text>
            <Text className="!text-text-muted"><Bold>Total</Bold></Text>
          </Flex>
          <BarList data={clientesData} valueFormatter={fmt} color="cyan" className="mt-2" />
        </TremorCard>
      </Grid>
    </div>
  );
}
