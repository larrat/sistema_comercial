import { DataTable, EmptyState, StatusBadge } from '../../../shared/ui';
import type { EstoquePositionRow } from '../types';

type EstoquePositionTableProps = {
  rows: EstoquePositionRow[];
};

function fmtCurrency(value: number) {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function toneByStatus(status: EstoquePositionRow['status']) {
  if (status === 'zerado') return 'danger';
  if (status === 'baixo') return 'warning';
  return 'success';
}

export function EstoquePositionTable({ rows }: EstoquePositionTableProps) {
  if (!rows.length) {
    return (
      <EmptyState
        title="Posição de estoque ainda não migrada."
        description="A base React do módulo já existe. A próxima rodada porta cálculo, listagem e alertas reais."
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
              <div className="table-cell-strong">{row.nome}</div>
              <div className="table-cell-caption table-cell-muted">{row.sku || '-'}</div>
            </div>
          )
        },
        {
          key: 'saldo',
          header: 'Saldo',
          render: (row) => `${row.saldo} ${row.unidade || ''}`
        },
        {
          key: 'custo',
          header: 'Custo médio',
          render: (row) => fmtCurrency(row.custoMedio)
        },
        {
          key: 'valor',
          header: 'Valor em estoque',
          render: (row) => fmtCurrency(row.valorEstoque)
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => <StatusBadge tone={toneByStatus(row.status)}>{row.status || 'ok'}</StatusBadge>
        }
      ]}
      rows={rows}
      rowKey={(row) => row.id}
    />
  );
}
