import { DataTable, EmptyState, StatusBadge, Button } from '../../../shared/ui';
import type { EstoqueHistoryRow } from '../types';

type EstoqueHistoryTableProps = {
  rows: EstoqueHistoryRow[];
  onDelete: (row: EstoqueHistoryRow) => void;
  deletingId?: string | null;
};

function toneByType(tipo: EstoqueHistoryRow['tipo']) {
  if (tipo === 'entrada') return 'success';
  if (tipo === 'saida') return 'danger';
  if (tipo === 'transf') return 'info';
  return 'warning';
}

export function EstoqueHistoryTable({
  rows,
  onDelete,
  deletingId = null
}: EstoqueHistoryTableProps) {
  if (!rows.length) {
    return (
      <EmptyState
        title="Nenhuma movimentação encontrada."
        description="Ajuste os filtros ou registre uma movimentação para visualizar o histórico do estoque."
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
        { key: 'obs', header: 'Obs', render: (row) => row.observacao || '-' },
        {
          key: 'acoes',
          header: '',
          align: 'right',
          render: (row) => (
            <Button
              size="sm"
              onClick={() => onDelete(row)}
              loading={deletingId === row.id}
              disabled={deletingId === row.id}
            >
              Excluir registro
            </Button>
          )
        }
      ]}
      rows={rows}
      rowKey={(row) => row.id}
    />
  );
}
