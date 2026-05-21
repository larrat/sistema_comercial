import { useMemo } from 'react';
import { DataTable, EmptyState } from '../../../shared/ui';
import type { EstoquePositionRow } from '../types';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';

type EstoqueCoverageTableProps = {
  rows: EstoquePositionRow[];
};

export function EstoqueCoverageTable({ rows }: EstoqueCoverageTableProps) {
  const snapshot = useEstoqueStore((s) => s.snapshot);
  const periodo = useEstoqueStore((s) => s.periodo);

  const coverageData = useMemo(() => {
    const daysMap: Record<string, number> = { semana: 7, mes: 30, ano: 365, tudo: 180 }; // fallback 180 for 'tudo' calculation base
    const periodDays = daysMap[periodo] || 30;

    const exitMap: Record<string, number> = {};
    
    if (snapshot?.movimentacoes) {
      // Filter movements by period if possible, or just use all recent exits
      // For coverage, we usually want a fixed window (e.g. last 30 days) to calculate the "velocity"
      // Since 'periodo' could be 'tudo', we might just look at the last 30/90 days for velocity regardless, 
      // but let's use periodDays to keep it consistent.
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - periodDays);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      snapshot.movimentacoes.forEach(m => {
        if (m.tipo === 'saida') {
          const mDate = (m.data || new Date().toISOString()).split('T')[0];
          if (periodo === 'tudo' || mDate >= cutoffStr) {
            const prodId = m.prodId || m.prod_id || '';
            exitMap[prodId] = (exitMap[prodId] || 0) + Number(m.qty || 0);
          }
        }
      });
    }

    return rows.map(r => {
      const saídas = exitMap[r.id] || 0;
      const mediaDiaria = saídas / periodDays;
      const coberturaDias = mediaDiaria > 0 ? Math.round(r.saldo / mediaDiaria) : 999;
      
      let status: 'ok' | 'critico' | 'excesso' = 'ok';
      if (coberturaDias < 7) status = 'critico';
      else if (coberturaDias > 90) status = 'excesso';

      return {
        ...r,
        mediaDiaria,
        coberturaDias,
        statusCobertura: status
      };
    }).sort((a, b) => a.coberturaDias - b.coberturaDias); // Sort lowest coverage first
  }, [rows, snapshot, periodo]);

  if (!coverageData.length) {
    return (
      <EmptyState
        title="Nenhum produto"
        description="Ajuste os filtros para ver a cobertura do estoque."
      />
    );
  }

  return (
    <DataTable
      columns={[
        {
          key: 'produto',
          header: 'Produto',
          render: (row) => (
            <div>
              <p className="font-medium text-primary">{row.nome}</p>
              {row.sku && <p className="text-xs text-muted">SKU: {row.sku}</p>}
            </div>
          )
        },
        {
          key: 'saldo',
          header: 'Saldo Atual',
          render: (row) => (
            <span className="font-medium">
              {row.saldo} {row.unidade}
            </span>
          )
        },
        {
          key: 'media',
          header: `Saída Média (${periodo})`,
          render: (row) => (
            <span className="text-muted">
              {row.mediaDiaria > 0 ? `${row.mediaDiaria.toFixed(2)}/dia` : 'Sem saídas'}
            </span>
          )
        },
        {
          key: 'cobertura',
          header: 'Cobertura',
          render: (row) => (
            <span className="font-bold">
              {row.coberturaDias === 999 ? '+90 dias' : `${row.coberturaDias} dias`}
            </span>
          )
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => {
            if (row.statusCobertura === 'critico') {
              return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20"><ShieldAlert size={14} /> Crítico</span>;
            }
            if (row.statusCobertura === 'excesso') {
              return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"><Shield size={14} /> Excesso</span>;
            }
            return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><ShieldCheck size={14} /> Saudável</span>;
          }
        }
      ]}
      data={coverageData}
    />
  );
}
