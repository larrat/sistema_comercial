import { DataTable, EmptyState, StatusBadge } from '../../../shared/ui';
import type { EstoquePositionRow } from '../types';

type EstoquePositionTableProps = {
  rows: EstoquePositionRow[];
  totalProdutos: number;
  onMoveProduct: (row: EstoquePositionRow) => void;
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

function labelByStatus(status: EstoquePositionRow['status']) {
  if (status === 'zerado') return 'Zerado';
  if (status === 'baixo') return 'Baixo';
  return 'OK';
}

function fmtQuantity(value: number) {
  return Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export function EstoquePositionTable({
  rows,
  totalProdutos,
  onMoveProduct
}: EstoquePositionTableProps) {
  if (!rows.length) {
    return (
      <EmptyState
        title={
          totalProdutos
            ? 'Nenhum item combina com os filtros atuais.'
            : 'Ainda não há produtos para acompanhar no estoque.'
        }
        description={
          totalProdutos
            ? 'Limpe a busca ou ajuste o status para voltar a ver a posição do estoque.'
            : 'Cadastre produtos primeiro para começar a movimentar e monitorar saldo.'
        }
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
          render: (row) => (
            <div>
              <div className="table-cell-strong">
                {fmtQuantity(row.saldo)} {row.unidade || ''}
              </div>
              <div className="table-cell-caption table-cell-muted">
                {row.minimo > 0 ? `Mín. ${fmtQuantity(row.minimo)} ${row.unidade || ''}` : 'Sem mínimo'}
              </div>
            </div>
          )
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
          render: (row) => (
            <StatusBadge tone={toneByStatus(row.status)}>{labelByStatus(row.status)}</StatusBadge>
          )
        },
        {
          key: 'acoes',
          header: '',
          align: 'right',
          render: (row) => (
            <button className="btn btn-sm" type="button" onClick={() => onMoveProduct(row)}>
              Movimentar
            </button>
          )
        }
      ]}
      rows={rows}
      rowKey={(row) => row.id}
    />
  );
}
