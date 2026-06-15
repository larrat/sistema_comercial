import { exportToCSV } from '../../../shared/lib/formatters';

export function exportDashboardToCSV(workerData: any, periodLabel: string) {
  if (!workerData) return;

  const { chartData, topProducts, financeMetrics, rfmData, rcaRanking } = workerData;

  // 1. Export Performance
  const perfData = chartData.map((d: any) => ({
    Periodo: d.name,
    Faturamento: d.faturamento,
    FaturamentoAnt: d.faturamentoAnt,
    LucroBruto: d.lucro,
    Proj: d.forecast || 0
  }));
  exportToCSV(perfData, [
    { key: 'Periodo', label: 'Período' },
    { key: 'Faturamento', label: 'Faturamento' },
    { key: 'FaturamentoAnt', label: 'Faturamento Ant.' },
    { key: 'LucroBruto', label: 'Lucro Bruto' },
    { key: 'Proj', label: 'Forecast' }
  ], `performance_${periodLabel.replace(/\s+/g, '_')}`);

  // 2. Export Mix de Produtos
  const mixData = topProducts.map((p: any) => ({
    Produto: p.nome,
    Receita: p.receita,
    Percentual: `${(p.percent || 0).toFixed(1)}%`
  }));
  exportToCSV(mixData, [
    { key: 'Produto', label: 'Produto' },
    { key: 'Receita', label: 'Receita' },
    { key: 'Percentual', label: 'Participação %' }
  ], `mix_produtos_${periodLabel.replace(/\s+/g, '_')}`);

  // 3. Export RFM e Vendedores se existirem
  if (rcaRanking && rcaRanking.length > 0) {
    const vData = rcaRanking.map((v: any) => ({
      Vendedor: v.nome,
      Faturamento: v.faturamento
    }));
    exportToCSV(vData, [
      { key: 'Vendedor', label: 'Vendedor' },
      { key: 'Faturamento', label: 'Faturamento' }
    ], `vendedores_${periodLabel.replace(/\s+/g, '_')}`);
  }
}
