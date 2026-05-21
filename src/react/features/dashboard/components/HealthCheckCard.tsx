import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { Button, Badge } from '../../../shared/ui';

import { useDashboardStore } from '../store/useDashboardStore';

type Issue = {
  id: string;
  type: 'warning' | 'error';
  title: string;
  description: string;
};

export function HealthCheckCard() {
  const { produtos, clientes, pedidos } = useDashboardStore();

  const prodSemCat = produtos.filter(p => !p.cat && !p.categoria).length;
  const cliSemContato = clientes.filter(c => !c.whatsapp && !c.email).length;
  
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const pedPendentes = pedidos.filter(p => {
    const isPendente = ['orcamento', 'em_andamento', 'em_separacao'].includes(p.status);
    const date = new Date(p.data || new Date());
    return isPendente && date < seteDiasAtras;
  }).length;

  const issues: Issue[] = [];
  if (prodSemCat > 0) {
    issues.push({ id: '1', type: 'warning', title: 'Produtos sem Categoria', description: `${prodSemCat} itens no catálogo não possuem categoria definida.` });
  }
  if (cliSemContato > 0) {
    issues.push({ id: '2', type: 'warning', title: 'Clientes sem Contato', description: `${cliSemContato} cadastros não possuem WhatsApp ou Email.` });
  }
  if (pedPendentes > 0) {
    issues.push({ id: '3', type: 'error', title: 'Pedidos Estagnados', description: `${pedPendentes} pedidos abertos há mais de 7 dias.` });
  }

  if (issues.length === 0) {
    issues.push({ id: 'ok', type: 'warning', title: 'Tudo Certo', description: 'Nenhum problema detectado na base de dados.' });
  }

  const hasCritical = issues.some(i => i.type === 'error');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <Activity size={16} className={hasCritical ? 'text-rose-500' : 'text-emerald-500'} />
           <span className="text-[10px] font-black text-white uppercase tracking-widest">Saúde do Sistema</span>
        </div>
        <Badge variant={hasCritical ? 'red' : 'green'} className="!py-0 !text-[8px]">
          {hasCritical ? 'ATENÇÃO' : 'SAUDÁVEL'}
        </Badge>
      </div>

      <div className="flex-1 space-y-3">
        {issues.map(issue => (
          <div key={issue.id} className="flex gap-3 items-start p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
            <div className={`mt-0.5 ${issue.type === 'error' ? 'text-rose-500' : 'text-amber-500'}`}>
              <AlertTriangle size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[11px] font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{issue.title}</h4>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{issue.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-4 w-full py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-teal-400 transition-colors border-t border-white/5 pt-4">
        Executar Auditoria
      </button>
    </div>
  );
}
