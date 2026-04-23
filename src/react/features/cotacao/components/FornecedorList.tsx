import { StatusBadge } from '../../../shared/ui';
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
  return (
    <div className="card-shell">
      <div className="rf-ui-section-header">
        <span className="table-cell-strong">Fornecedores</span>
        <button type="button" className="btn btn-p btn-sm" onClick={onNovo}>
          + Novo fornecedor
        </button>
      </div>

      {!fornecedores.length ? (
        <div className="rf-ui-empty">
          <p>Nenhum fornecedor cadastrado.</p>
          <p className="table-cell-muted table-cell-caption">
            Cadastre o primeiro fornecedor para começar as comparações de compra.
          </p>
        </div>
      ) : (
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Prazo</th>
                <th>Produtos cotados</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((f) => {
                const cotados = produtos.filter((p) => {
                  const v = precos[p.id]?.[f.id];
                  return v !== undefined && v > 0;
                }).length;
                return (
                  <tr key={f.id}>
                    <td className="table-cell-strong">{f.nome}</td>
                    <td className="table-cell-muted">{f.contato || '—'}</td>
                    <td>{f.prazo || '—'}</td>
                    <td>
                      <StatusBadge tone={cotados > 0 ? 'success' : 'neutral'}>
                        {cotados}/{produtos.length}
                      </StatusBadge>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onRemover(f.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
