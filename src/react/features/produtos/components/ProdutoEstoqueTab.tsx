import { History } from 'lucide-react';
import { formatCurrency } from './ProdutoUtils';

type ProdutoEstoqueTabProps = {
  loadingMovs: boolean;
  movs: any[];
};

export function ProdutoEstoqueTab({ loadingMovs, movs }: ProdutoEstoqueTabProps) {
  return (
    <article className="rf-dash-card">
      <div className="rf-dash-card__header flex-row items-center !mb-6">
        <div className="flex-1">
          <span className="rf-stat-label !mb-1 text-emerald-500">Histórico</span>
          <h2 className="rf-dash-card__title text-base">Auditoria de Estoque</h2>
        </div>
        <History className="w-4 h-4 text-slate-600" />
      </div>
      <div className="p-0">
        {loadingMovs ? (
          <div className="p-8 text-center text-slate-400">Carregando movimentações...</div>
        ) : movs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-sm font-medium text-slate-400">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Operação</th>
                  <th className="px-6 py-4 text-right">Qtd / Saldo</th>
                  <th className="px-6 py-4 text-right">Custo Unitário</th>
                  <th className="px-6 py-4">Observação</th>
                </tr>
              </thead>
              <tbody>
                {[...movs].sort((a, b) => (b.ts || 0) - (a.ts || 0)).map((mov: any) => {
                  const isEntrada = mov.tipo === 'entrada';
                  const isSaida = mov.tipo === 'saida' || mov.tipo === 'transf';
                  const badgeColor = isEntrada ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' : isSaida ? 'text-rose-400 bg-rose-500/10 border-rose-500/10' : 'text-amber-400 bg-amber-500/10 border-amber-500/10';
                  
                  return (
                    <tr key={mov.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {mov.data ? mov.data.split('-').reverse().join('/') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase ${badgeColor}`}>
                          {mov.tipo}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-black ${isEntrada ? 'text-emerald-400' : isSaida ? 'text-rose-400' : 'text-white'}`}>
                        {isEntrada ? '+' : isSaida ? '-' : ''}
                        {mov.tipo === 'ajuste' ? `Ajuste: ${mov.saldo_real ?? mov.saldoReal}` : mov.qty}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300 font-bold">
                        {mov.custo && mov.custo > 0 ? formatCurrency(mov.custo) : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs italic max-w-[200px] truncate">
                        {mov.obs || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 italic text-xs font-medium">Nenhuma movimentação registrada para este produto.</div>
        )}
      </div>
    </article>
  );
}
