import { useDashboardData } from '../../dashboard/hooks/useDashboardData';
import { useDashboardStore } from '../../dashboard/store/useDashboardStore';
import { Card, Typography, Badge } from '../../../shared/ui';
import { SystemAbcChart } from '../../../app/components/charts/SystemAbcChart';
import { fmtBRL } from '../../../shared/lib/formatters';

export function ProdutosAbcTab() {
  const periodo = useDashboardStore((s) => s.periodo);
  const { workerData, isLoading } = useDashboardData(periodo);

  if (isLoading || !workerData) {
    return <div className="h-64 flex items-center justify-center">Carregando...</div>;
  }

  const { topProducts } = workerData;

  // Calculate ABC
  let totalRevenue = topProducts.reduce((acc: number, p: any) => acc + p.receita, 0);
  let cumulative = 0;
  
  const abcData = topProducts.map((p: any) => {
    cumulative += p.receita;
    const percent = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
    
    let category: 'A' | 'B' | 'C' = 'C';
    if (percent <= 80) category = 'A';
    else if (percent <= 95) category = 'B';

    return {
      name: p.nome,
      value: p.receita,
      cumulativePercent: percent,
      category
    };
  });

  const catA = abcData.filter((d: any) => d.category === 'A');
  const catB = abcData.filter((d: any) => d.category === 'B');
  const catC = abcData.filter((d: any) => d.category === 'C');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="glass" className="border-t-2 border-t-emerald-500">
          <Typography variant="caption" className="uppercase tracking-wider text-emerald-400">Classe A (80% da Receita)</Typography>
          <Typography variant="h3" weight="bold" className="mt-2 text-white">{catA.length} Produtos</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            {fmtBRL(catA.reduce((a: any, b: any) => a + b.value, 0))}
          </Typography>
        </Card>

        <Card variant="glass" className="border-t-2 border-t-amber-500">
          <Typography variant="caption" className="uppercase tracking-wider text-amber-400">Classe B (15% da Receita)</Typography>
          <Typography variant="h3" weight="bold" className="mt-2 text-white">{catB.length} Produtos</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            {fmtBRL(catB.reduce((a: any, b: any) => a + b.value, 0))}
          </Typography>
        </Card>

        <Card variant="glass" className="border-t-2 border-t-slate-500">
          <Typography variant="caption" className="uppercase tracking-wider text-slate-400">Classe C (5% da Receita)</Typography>
          <Typography variant="h3" weight="bold" className="mt-2 text-white">{catC.length} Produtos</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            {fmtBRL(catC.reduce((a: any, b: any) => a + b.value, 0))}
          </Typography>
        </Card>
      </div>

      <div className="h-[500px]">
        <SystemAbcChart data={abcData} title="Curva ABC de Produtos (Pareto)" />
      </div>

    </div>
  );
}
