import { useNavigate } from 'react-router-dom';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Card, Typography, EmptyState } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

const fmt = (v: number) => fmtBRL(v || 0);

export function SalesMixCard({ topProducts }: { topProducts: any[] }) {
  const navigate = useNavigate();

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
          <div className="flex flex-col h-full gap-4 pt-2">
             {topProducts.slice(0, 5).map((p: any, i: number) => {
               const maxReceita = Math.max(...topProducts.map((tp: any) => tp.receita));
               const width = (p.receita / maxReceita) * 100;
               const colors = [
                 'var(--color-teal-primary)', 
                 'var(--color-amber-vibrant)', 
                 'var(--color-emerald-vibrant)', 
                 'var(--color-indigo-vibrant)', 
                 'var(--color-rose-vibrant)'
               ];
               const color = colors[i % colors.length];

               return (
                 <div key={i} className="flex flex-col gap-1.5 cursor-pointer hover:bg-white/[0.04] p-2 -mx-2 rounded-xl transition-all group" onClick={() => navigate('/app/produtos')}>
                   <div className="flex justify-between items-center text-sm font-medium text-slate-400">
                     <span className="text-slate-300 truncate max-w-[180px] group-hover:text-white transition-colors">{p.nome}</span>
                     <div className="text-right">
                       <span className="text-white block tabular-nums">{fmt(p.receita)}</span>
                     </div>
                   </div>
                   <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                     <div className="h-full rounded-full transition-all duration-1000 group-hover:brightness-110" style={{ width: `${Math.max(width, 2)}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}40` }} />
                   </div>
                 </div>
               );
             })}
             {topProducts.length > 5 && (
               <div className="mt-2 text-center">
                 <span className="cursor-pointer hover:text-white transition-colors text-sm font-medium text-slate-400" onClick={() => navigate('/app/produtos')}>
                   + {topProducts.length - 5} outros produtos
                 </span>
               </div>
             )}
          </div>
        )}
      </div>
    </Card>
  );
}
