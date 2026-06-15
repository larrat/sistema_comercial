import { useNavigate } from 'react-router-dom';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Card, Typography, EmptyState } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';
import { SystemTreemapChart } from '../../../app/components/charts';

const fmt = (v: number) => fmtBRL(v || 0);

export function SalesMixCard({ topProducts }: { topProducts: any[] }) {
  const navigate = useNavigate();

  const treemapData = topProducts.map((p) => ({
    name: p.nome,
    value: p.receita
  }));

  return (
    <Card padding="none" variant="glass" className="flex flex-col h-full transition-all duration-300 hover:scale-[1.01] hover:shadow-xl border-t-2! border-t-cyan-400">
      <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
        <Typography variant="h3" weight="black" className="uppercase !text-sm tracking-tight text-white">Mix de Vendas</Typography>
        <Typography variant="caption" color="muted">Top Categorias mais vendidas</Typography>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">
        {topProducts.length === 0 ? (
          <EmptyState 
            icon={<PieChartIcon size={32} className="text-slate-500" />} 
            title="Mix vazio" 
            description="Sem movimentação de produtos no período." 
          />
        ) : (
          <div className="h-full pt-2 min-h-[220px]" onClick={() => navigate('/app/produtos')}>
             <SystemTreemapChart 
               data={treemapData} 
               height={250} 
               valueFormatter={(val) => fmt(val)} 
               colorScale={[
                 { from: 0, to: 1000, color: '#0ea5e9' },
                 { from: 1001, to: 5000, color: '#8b5cf6' },
                 { from: 5001, to: 999999, color: '#f59e0b' }
               ]}
             />
          </div>
        )}
      </div>
    </Card>
  );
}
