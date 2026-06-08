import { Database } from 'lucide-react';
import type { Produto } from '../../../../types/domain';
import { Button } from '../../../shared/ui';
import { ProdutoInfoTable } from './ProdutoUtils';

type ProdutoCadastroTabProps = {
  produto: Produto;
  startEdit: () => void;
};

export function ProdutoCadastroTab({ produto, startEdit }: ProdutoCadastroTabProps) {
  return (
    <article className="rf-dash-card">
      <div className="rf-dash-card__header flex-row items-center !mb-6">
        <div className="flex-1">
          <span className="rf-stat-label !mb-1 text-slate-500">Informações</span>
          <h2 className="rf-dash-card__title text-base">Detalhes Cadastrais</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={startEdit}>Editar</Button>
      </div>
      <div className="mt-2">
        <ProdutoInfoTable
          rows={[
            { label: 'Nome Completo', value: produto.nome },
            { label: 'SKU / Código', value: produto.sku },
            { label: 'Unidade Padrão', value: produto.un },
            { label: 'Categoria Master', value: produto.cat },
            { label: 'Descrição Pública', value: produto.descricao_padrao || '—' }
          ]}
        />
      </div>
    </article>
  );
}
