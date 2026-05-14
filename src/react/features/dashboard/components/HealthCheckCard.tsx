import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { Button } from '../../../shared/ui';

type Issue = {
  id: string;
  type: 'warning' | 'error';
  title: string;
  description: string;
};

export function HealthCheckCard() {
  // Mock data for health check
  const issues: Issue[] = [
    { id: '1', type: 'warning', title: 'Produtos sem Categoria', description: '12 itens no catálogo não possuem categoria definida.' },
    { id: '2', type: 'error', title: 'Clientes com CPF Inválido', description: '3 cadastros apresentam inconsistência no documento.' },
    { id: '3', type: 'warning', title: 'Pedidos com Pendência', description: '5 pedidos aguardam validação de estoque há mais de 24h.' }
  ];

  const hasCritical = issues.some(i => i.type === 'error');

  return (
    <div className="rf-card-premium overflow-hidden border-white/5 bg-surface-card/40 backdrop-blur-xl">
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${hasCritical ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Saúde do Sistema</h3>
            <p className="text-[10px] text-slate-500 font-medium">Integridade de dados e auditoria</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {hasCritical ? 'Atenção' : 'Saudável'}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {issues.map(issue => (
          <div key={issue.id} className="flex gap-3 items-start p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors cursor-default group">
            <div className={`mt-0.5 ${issue.type === 'error' ? 'text-rose-500' : 'text-amber-500'}`}>
              <AlertTriangle size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{issue.title}</h4>
              <p className="text-[11px] text-slate-500 leading-normal mt-0.5">{issue.description}</p>
            </div>
            <Button size="sm" variant="secondary" className="!p-1.5 !rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Search size={14} />
            </Button>
          </div>
        ))}

        {issues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 opacity-40">
            <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
            <p className="text-xs font-medium text-slate-400">Nenhuma inconsistência encontrada</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-black/20 border-t border-white/5">
        <button className="w-full py-2 text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:text-cyan-300 transition-colors">
          Executar Saneamento Completo
        </button>
      </div>
    </div>
  );
}
