import { useState } from 'react';
import { EmptyState, FormSection, Modal, Button } from '../../../shared/ui';
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
        <Button variant="primary" size="sm" onClick={openFornModal}>
          Novo fornecedor
        </Button>
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
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setConfirmarRemocaoId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmarRemocaoId) void removerFornecedor(confirmarRemocaoId);
                setConfirmarRemocaoId(null);
              }}
            >
              Remover
            </Button>
          </div>
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
