import { DataTable, EmptyState, StatusBadge } from '../../../shared/ui';
import { useCotacaoStore } from '../store/useCotacaoStore';

function fmtCurrency(value: number | null) {
  if (value == null || value <= 0) return '—';
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value));
}

export function CotacaoGrid() {
  const tabela = useCotacaoStore((s) => s.tabela);

  if (!tabela.length) {
    return (
      <EmptyState
        title="Ainda faltam dados para iniciar a cotação."
        description="Cadastre produtos e fornecedores para começar a comparar preços no shell React."
      />
    );
  }

  return (
    <DataTable
      columns={[
        {
          key: 'produto',
          header: 'Produto',
          render: (row) => <span className="table-cell-strong">{row.produto}</span>
        },
        {
          key: 'unidade',
          header: 'Un',
          render: (row) => <span className="table-cell-muted">{row.unidade || '—'}</span>,
          width: '90px'
        },
        {
          key: 'melhor-preco',
          header: 'Melhor preço',
          render: (row) =>
            row.melhorPreco != null ? (
              <StatusBadge tone="success">{fmtCurrency(row.melhorPreco)}</StatusBadge>
            ) : (
              '—'
            )
        },
        {
          key: 'pior-preco',
          header: 'Pior preço',
          render: (row) =>
            row.piorPreco != null ? (
              <StatusBadge tone="warning">{fmtCurrency(row.piorPreco)}</StatusBadge>
            ) : (
              '—'
            )
        },
        {
          key: 'melhor-fornecedor',
          header: 'Melhor fornecedor',
          render: (row) => row.melhorFornecedor || '—'
        }
      ]}
      rows={tabela}
      rowKey={(row) => row.id}
      emptyTitle="Nenhum comparativo disponível."
      emptyDescription="Os preços vão aparecer aqui assim que houver produtos e fornecedores com cotação."
    />
  );
}
