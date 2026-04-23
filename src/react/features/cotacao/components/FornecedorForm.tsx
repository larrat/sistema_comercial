import { Modal } from '../../../shared/ui';
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
        <>
          <button type="button" className="btn btn-sm" onClick={closeFornModal}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-p btn-sm"
            disabled={saving}
            onClick={() => void salvarFornecedor()}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <label className="rf-ui-field">
          <span className="rf-ui-field__label">Nome *</span>
          <input
            className="inp"
            value={draft.nome}
            onChange={(e) => updateFornDraft({ nome: e.target.value })}
          />
        </label>
        <div className="rf-ui-form-grid">
          <label className="rf-ui-field">
            <span className="rf-ui-field__label">Contato</span>
            <input
              className="inp"
              value={draft.contato}
              onChange={(e) => updateFornDraft({ contato: e.target.value })}
            />
          </label>
          <label className="rf-ui-field">
            <span className="rf-ui-field__label">Prazo entrega (dias)</span>
            <input
              className="inp"
              type="number"
              min="0"
              value={draft.prazo}
              onChange={(e) => updateFornDraft({ prazo: e.target.value })}
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}
