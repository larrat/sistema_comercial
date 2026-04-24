import { DataTable, EmptyState, StatusBadge } from '../../../shared/ui';
import { useCotacaoStore } from '../store/useCotacaoStore';

function fmtCurrency(value: number) {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

export function CotacaoTotalsByFornecedor() {
  const fornecedores = useCotacaoStore((s) => s.fornecedoresRows);

  const rows = [...fornecedores]
    .filter((fornecedor) => fornecedor.totalCotado > 0)
    .sort((a, b) => a.totalCotado - b.totalCotado);

  const bestId = rows[0]?.id || null;

  if (!rows.length) {
    return (
      <EmptyState
        title="Totais por fornecedor ainda indisponíveis."
        description="Os totais aparecem aqui assim que houver preços válidos carregados na cotação."
        compact
      />
    );
  }

  return (
    <DataTable
      columns={[
        {
          key: 'fornecedor',
          header: 'Fornecedor',
          render: (row) => (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="table-cell-strong">{row.nome}</span>
              {row.id === bestId ? <StatusBadge tone="success">Melhor total</StatusBadge> : null}
            </div>
          )
        },
        {
          key: 'produtos',
          header: 'Produtos cotados',
          render: (row) => row.produtosCotados,
          align: 'right',
          width: '140px'
        },
        {
          key: 'total',
          header: 'Total',
          render: (row) => fmtCurrency(row.totalCotado),
          align: 'right',
          width: '160px'
        }
      ]}
      rows={rows}
      rowKey={(row) => row.id}
      emptyTitle="Nenhum total disponível."
    />
  );
}
