import { EmptyState, StatCard } from '../../../shared/ui';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { SystemTreemapChart, SystemBarChart, SystemDonutChart, ChartFilterProvider, useChartFilter } from '../../../app/components/charts';
import { ChartCard } from '../../../app/components/charts/ChartCard';
import { fmtBRL } from '../../../shared/lib/formatters';

function ClientesTabContent() {
  const clientes = useRelatoriosStore((s) => s.clientes);
  const pedidos = useRelatoriosStore((s) => s.pedidos);

  const { getFilter, setFilter } = useChartFilter();
  const selectedStatus = getFilter('status');

  const filteredClientes = selectedStatus ? clientes.filter(c => c.status === selectedStatus) : clientes;

  const comAniversario = filteredClientes.filter((c) => String(c.data_aniversario || '').trim()).length;
  const marketing = filteredClientes.filter((c) => c.optin_marketing).length;
  const prospects = filteredClientes.filter((c) => String(c.status || '').toLowerCase() === 'prospecto').length;

  const statusMap: Record<string, number> = {};
  clientes.forEach((c) => {
    const key = String(c.status || 'sem_status');
    statusMap[key] = (statusMap[key] || 0) + 1;
  });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const segMap: Record<string, { total: number; marketing: number }> = {};
  filteredClientes.forEach((c) => {
    const seg = String(c.seg || 'Sem segmento');
    if (!segMap[seg]) segMap[seg] = { total: 0, marketing: 0 };
    segMap[seg].total += 1;
    if (c.optin_marketing) segMap[seg].marketing += 1;
  });
  const topSegmentos = Object.entries(segMap)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10)
    .map(([name, data]) => ({ name, total: data.total, marketing: data.marketing }));

  // LTV (Faturamento) por Cliente (Treemap)
  const ltvMap: Record<string, number> = {};
  pedidos.forEach(p => {
    if (p.status === 'cancelado') return;
    const cName = p.cli || 'Sem cliente';
    ltvMap[cName] = (ltvMap[cName] || 0) + Number(p.total || 0);
  });
  const ltvData = Object.entries(ltvMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="rf-ui-stack">
      <div className="rf-ui-stat-grid">
        <StatCard label="Clientes" value={clientes.length} />
        <StatCard label="Com aniversário" value={comAniversario} />
        <StatCard label="Opt-in marketing" value={marketing} tone="success" />
        <StatCard label="Prospectos" value={prospects} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard 
          title="Status da Base" 
          description="Distribuição por funil / status de cliente"
          isFilterActive={!!selectedStatus}
          action={selectedStatus && (
            <button onClick={() => setFilter('status', null)} className="text-[10px] uppercase font-bold text-teal-400 bg-teal-400/10 px-2 py-1 rounded-md hover:bg-teal-400/20">
              Limpar Filtro
            </button>
          )}
        >
          <SystemDonutChart
            data={statusData}
            nameKey="name"
            valueKey="value"
            filterKey="status"
            height={280}
            centerLabel="Total Base"
            centerValue={String(clientes.length)}
          />
        </ChartCard>

        <ChartCard title="Top Segmentos" description="Clientes classificados por segmento">
          <SystemBarChart
            data={topSegmentos}
            xKey="name"
            height={280}
            layout="vertical"
            series={[
              { key: 'total', label: 'Total Clientes', color: '#3b82f6' },
              { key: 'marketing', label: 'Com Opt-in', color: '#10b981' }
            ]}
          />
        </ChartCard>
      </div>

      <div className="mt-6">
        <ChartCard title="Lifetime Value (LTV) - Top 20" description="Faturamento acumulado por cliente no período">
          <SystemTreemapChart
            data={ltvData}
            height={360}
            valueFormatter={(val) => fmtBRL(val)}
            colorScale={[
              { from: 0, to: 1000, color: '#f59e0b' },
              { from: 1001, to: 5000, color: '#3b82f6' },
              { from: 5001, to: 9999999, color: '#10b981' }
            ]}
          />
        </ChartCard>
      </div>
    </div>
  );
}

export function ClientesTab() {
  return (
    <ChartFilterProvider>
      <ClientesTabContent />
    </ChartFilterProvider>
  );
}
