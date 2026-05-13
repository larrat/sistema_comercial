import { Modal, Button, Input } from '../../../shared/ui';
import { useCotacaoStore } from '../store/useCotacaoStore';
import { useFornecedorMutations } from '../hooks/useCotacaoMutations';

export function FornecedorForm() {
  const { open, draft } = useCotacaoStore((s) => s.fornModal);
  const closeFornModal = useCotacaoStore((s) => s.closeFornModal);
  const updateFornDraft = useCotacaoStore((s) => s.updateFornDraft);
  const { saving, salvarFornecedor } = useFornecedorMutations();

  return (
    <Modal
      open={open}
      title="Novo fornecedor"
      onClose={closeFornModal}
      footer={
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={closeFornModal}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={() => void salvarFornecedor()}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nome"
          required
          value={draft.nome}
          onChange={(e) => updateFornDraft({ nome: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Contato"
            value={draft.contato}
            onChange={(e) => updateFornDraft({ contato: e.target.value })}
          />
          <Input
            label="Prazo entrega (dias)"
            type="number"
            min="0"
            value={draft.prazo}
            onChange={(e) => updateFornDraft({ prazo: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}
