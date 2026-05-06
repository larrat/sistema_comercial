import { useState } from 'react';
import { EmptyState, FormSection, Modal } from '../../../shared/ui';
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

  const [confirmarRemocaoId, setConfirmarRemocaoId] = useState<string | null>(null);
  const fornecedorParaRemover = fornecedores.find((f) => f.id === confirmarRemocaoId);

  return (
    <FormSection
      title="Fornecedores"
      description="Gerencie os fornecedores participantes da cotação."
      aside={
        <button type="button" className="btn btn-p btn-sm" onClick={openFornModal}>
          Novo fornecedor
        </button>
      }
    >
      {!fornecedores.length ? (
        <EmptyState
          title="Nenhum fornecedor cadastrado."
          description="Cadastre o primeiro fornecedor para iniciar as comparações de compra."
        />
      ) : (
        <FornecedorList
          fornecedores={fornecedores}
          produtos={produtos}
          precos={precos}
          onNovo={openFornModal}
          onRemover={(id) => setConfirmarRemocaoId(id)}
        />
      )}

      <FornecedorForm />

      <Modal
        open={confirmarRemocaoId !== null}
        title="Remover fornecedor"
        onClose={() => setConfirmarRemocaoId(null)}
        footer={
          <>
            <button className="btn btn-sm" type="button" onClick={() => setConfirmarRemocaoId(null)}>
              Cancelar
            </button>
            <button
              className="btn btn-r btn-sm"
              type="button"
              onClick={() => {
                if (confirmarRemocaoId) void removerFornecedor(confirmarRemocaoId);
                setConfirmarRemocaoId(null);
              }}
            >
              Remover
            </button>
          </>
        }
      >
        <p>
          Tem certeza que deseja remover o fornecedor{' '}
          <strong>"{fornecedorParaRemover?.nome ?? ''}"</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </FormSection>
  );
}
