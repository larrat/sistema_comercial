import { DataTable, EmptyState, StatusBadge } from '../../../shared/ui';
import type { Fornecedor, PrecosMap } from '../types';
import type { Produto } from '../../../../types/domain';

type Props = {
  fornecedores: Fornecedor[];
  produtos: Produto[];
  precos: PrecosMap;
  onNovo: () => void;
  onRemover: (id: string) => void;
};

export function FornecedorList({ fornecedores, produtos, precos, onNovo, onRemover }: Props) {
  const rows = fornecedores.map((f) => {
    const cotados = produtos.filter((p) => {
      const v = precos[p.id]?.[f.id];
      return v !== undefined && v > 0;
    }).length;

    return {
      id: f.id,
      nome: f.nome,
      contato: f.contato || '—',
      prazo: f.prazo || '—',
      cotados
    };
  });

  return (
    <div className="card-shell">
      <div className="rf-ui-section-header">
        <span className="table-cell-strong">Fornecedores</span>
        <button type="button" className="btn btn-p btn-sm" onClick={onNovo}>
          + Novo fornecedor
        </button>
      </div>

      {!fornecedores.length ? (
        <EmptyState
          title="Nenhum fornecedor cadastrado."
          description="Cadastre o primeiro fornecedor para começar as comparações de compra."
          compact
        />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          columns={[
            {
              key: 'nome',
              header: 'Nome',
              render: (row) => <span className="table-cell-strong">{row.nome}</span>
            },
            {
              key: 'contato',
              header: 'Contato',
              render: (row) => <span className="table-cell-muted">{row.contato}</span>
            },
            {
              key: 'prazo',
              header: 'Prazo',
              render: (row) => row.prazo
            },
            {
              key: 'cotados',
              header: 'Produtos cotados',
              render: (row) => (
                <StatusBadge tone={row.cotados > 0 ? 'success' : 'neutral'}>
                  {row.cotados}/{produtos.length}
                </StatusBadge>
              )
            },
            {
              key: 'acoes',
              header: '',
              align: 'right',
              render: (row) => (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onRemover(row.id)}
                >
                  Excluir
                </button>
              )
            }
          ]}
        />
      )}
    </div>
  );
}
