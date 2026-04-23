import { DataTable, EmptyState, StatusBadge } from '../../../shared/ui';
import type { EstoqueHistoryRow } from '../types';

type EstoqueHistoryTableProps = {
  rows: EstoqueHistoryRow[];
};

function toneByType(tipo: EstoqueHistoryRow['tipo']) {
  if (tipo === 'entrada') return 'success';
  if (tipo === 'saida') return 'danger';
  if (tipo === 'transf') return 'info';
  return 'warning';
}

export function EstoqueHistoryTable({ rows }: EstoqueHistoryTableProps) {
  if (!rows.length) {
    return (
      <EmptyState
        title="Histórico ainda não migrado."
        description="A rota React do estoque já existe. O histórico real entra na próxima etapa da migração."
      />
    );
  }

  return (
    <DataTable
      columns={[
        { key: 'produto', header: 'Produto', render: (row) => row.produto },
        { key: 'data', header: 'Data', render: (row) => row.data },
        {
          key: 'tipo',
          header: 'Tipo',
          render: (row) => <StatusBadge tone={toneByType(row.tipo)}>{row.tipo}</StatusBadge>
        },
        { key: 'quantidade', header: 'Quantidade', render: (row) => row.quantidadeLabel },
        { key: 'custo', header: 'Custo', render: (row) => row.custoLabel },
        { key: 'obs', header: 'Obs', render: (row) => row.observacao || '-' }
      ]}
      rows={rows}
      rowKey={(row) => row.id}
    />
  );
}
