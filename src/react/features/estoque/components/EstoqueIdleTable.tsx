import { useMemo } from 'react';
import { DataTable, EmptyState } from '../../../shared/ui';
import type { EstoquePositionRow } from '../types';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { Clock } from 'lucide-react';

type EstoqueIdleTableProps = {
  rows: EstoquePositionRow[];
};

export function EstoqueIdleTable({ rows }: EstoqueIdleTableProps) {
  const snapshot = useEstoqueStore((s) => s.snapshot);
  const periodo = useEstoqueStore((s) => s.periodo);

  const idleData = useMemo(() => {
    const daysMap: Record<string, number> = { semana: 7, mes: 30, ano: 365, tudo: 180 };
    const periodDays = daysMap[periodo] || 30;

    const lastMoveMap: Record<string, string> = {};
    
    if (snapshot?.movimentacoes) {
      snapshot.movimentacoes.forEach(m => {
        const mDate = (m.data || new Date().toISOString()).split('T')[0];
        const prodId = m.prodId || m.prod_id || '';
        
        if (!lastMoveMap[prodId] || mDate > lastMoveMap[prodId]) {
          lastMoveMap[prodId] = mDate;
        }
      });
    }

    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const idleProducts = rows.filter(r => {
      const lastMove = lastMoveMap[r.id];
      // Idle if it has no movements AT ALL, or last movement is older than the cutoff
      return !lastMove || lastMove < cutoffStr;
    }).map(r => {
      const lastMove = lastMoveMap[r.id];
      let diasParado = 999; // Assume never moved if no lastMove
      
      if (lastMove) {
        const lastDate = new Date(lastMove);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        diasParado = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...r,
        lastMoveLabel: lastMove ? new Intl.DateTimeFormat('pt-BR').format(new Date(lastMove)) : 'Nunca',
        diasParado
      };
    }).sort((a, b) => b.diasParado - a.diasParado); // Longest idle first

    // Se o saldo for 0 e não teve movimento, é melhor não mostrar pra não poluir, 
    // a não ser que a gente queira focar apenas em capital parado
    return idleProducts.filter(r => r.saldo > 0);
  }, [rows, snapshot, periodo]);

  function fmtCurrency(val: number) {
    return Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  if (!idleData.length) {
    return (
      <EmptyState
        title="Nenhum produto parado"
        description={`Todos os seus produtos tiveram movimentação no período (${periodo}).`}
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
          header: 'Saldo Parado',
          render: (row) => (
            <span className="font-medium">
              {row.saldo} {row.unidade}
            </span>
          )
        },
        {
          key: 'valor',
          header: 'Capital Imobilizado',
          render: (row) => (
            <span className="text-rose-500 font-medium">
              {fmtCurrency(row.valorEstoque)}
            </span>
          )
        },
        {
          key: 'lastMove',
          header: 'Última Movimentação',
          render: (row) => (
            <span className="text-muted flex items-center gap-1.5">
              <Clock size={14} /> {row.lastMoveLabel}
            </span>
          )
        },
        {
          key: 'dias',
          header: 'Tempo Parado',
          render: (row) => (
            <span className="font-bold">
              {row.diasParado === 999 ? '+1 ano' : `${row.diasParado} dias`}
            </span>
          )
        }
      ]}
      data={idleData}
    />
  );
}
