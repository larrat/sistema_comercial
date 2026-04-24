import { EmptyState, FormSection } from '../../../shared/ui';
import { useFornecedorMutations } from '../hooks/useCotacaoMutations';
import { useCotacaoStore } from '../store/useCotacaoStore';
import { FornecedorForm } from './FornecedorForm';
import { FornecedorList } from './FornecedorList';

export function CotacaoFornecedoresPage() {
  const fornecedores = useCotacaoStore((s) => s.fornecedores);
  const produtos = useCotacaoStore((s) => s.produtos);
  const precos = useCotacaoStore((s) => s.precos);
  const openFornModal = useCotacaoStore((s) => s.openFornModal);
  const { removerFornecedor } = useFornecedorMutations();

  return (
    <FormSection
      title="Fornecedores"
      description="CRUD principal de fornecedores já roda no shell React, com contagem de produtos cotados e remoção com confirmação."
      aside={
        <button type="button" className="btn btn-p btn-sm" onClick={openFornModal}>
          Novo fornecedor
        </button>
      }
    >
      {!fornecedores.length ? (
        <EmptyState
          title="Nenhum fornecedor cadastrado."
          description="Cadastre o primeiro fornecedor para começar as comparações de compra no shell React."
        />
      ) : (
        <FornecedorList
          fornecedores={fornecedores}
          produtos={produtos}
          precos={precos}
          onNovo={openFornModal}
          onRemover={(id) => void removerFornecedor(id)}
        />
      )}

      <FornecedorForm />
    </FormSection>
  );
}
