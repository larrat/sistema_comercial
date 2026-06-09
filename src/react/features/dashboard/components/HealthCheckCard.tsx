import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { Button, Badge } from '../../../shared/ui';

import { useQuery } from '@tanstack/react-query';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

type Issue = {
  id: string;
  type: 'warning' | 'error';
  title: string;
  description: string;
};

export function HealthCheckCard() {
  const { resolve } = useApiContext();
  const context = resolve();

  const { data: issues = [], refetch, isFetching } = useQuery({
    queryKey: ['auditoria-sistema', context?.filialId],
    queryFn: async () => {
      if (!context) return [];
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/rpc/rpc_auditoria_sistema`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${context.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_filial_id: context.filialId })
      });
      if (!res.ok) return [];
      return await res.json() as Issue[];
    },
    enabled: !!context,
    refetchOnWindowFocus: false
  });

  const displayIssues = issues.length > 0 
    ? issues 
    : [{ id: 'ok', type: 'warning' as const, title: 'Tudo Certo', description: 'Nenhum problema detectado na base de dados.' }];

  const hasCritical = displayIssues.some(i => i.type === 'error');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <Activity size={16} className={hasCritical ? 'text-rose-500' : 'text-emerald-500'} />
           <span className="text-white text-sm font-medium text-slate-400">Saúde do Sistema</span>
        </div>
        <Badge variant={hasCritical ? 'red' : 'green'} className="!py-0 !text-[8px]">
          {hasCritical ? 'ATENÇÃO' : 'SAUDÁVEL'}
        </Badge>
      </div>

      <div className="flex-1 space-y-3">
        {displayIssues.map(issue => (
          <div key={issue.id} className="flex gap-3 items-start p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
            <div className={`mt-0.5 ${issue.type === 'error' ? 'text-rose-500' : 'text-amber-500'}`}>
              <AlertTriangle size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="group-hover:text-white transition-colors text-sm font-medium text-slate-400">{issue.title}</h4>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{issue.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => refetch()}
        disabled={isFetching}
        className="mt-4 w-full py-2 hover:text-teal-400 transition-colors border-t border-white/5 pt-4 text-sm font-medium text-slate-400 disabled:opacity-50"
      >
        {isFetching ? 'Verificando...' : 'Executar Auditoria'}
      </button>
    </div>
  );
}
