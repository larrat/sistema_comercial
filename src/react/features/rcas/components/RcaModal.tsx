import { Modal } from '../../../shared/ui';
import { useRcasStore } from '../store/useRcasStore';
import { useRcasMutations } from '../hooks/useRcasMutations';

export function RcaModal() {
  const modalOpen = useRcasStore((s) => s.modalOpen);
  const modalNome = useRcasStore((s) => s.modalNome);
  const saving = useRcasStore((s) => s.saving);
  const setModalNome = useRcasStore((s) => s.setModalNome);
  const closeModal = useRcasStore((s) => s.closeModal);
  const { salvar } = useRcasMutations();

  return (
    <Modal
      open={modalOpen}
      title="Vendedor"
      onClose={closeModal}
      closeOnOverlay={!saving}
      footer={
        <>
          <button className="btn btn-sm" type="button" onClick={closeModal} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn btn-p btn-sm"
            type="button"
            onClick={() => void salvar()}
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Salvar vendedor'}
          </button>
        </>
      }
    >
      <div className="fg">
        <div>
          <div className="fl">Nome do vendedor *</div>
          <input
            className="inp"
            autoFocus
            placeholder="Ex: João Silva"
            value={modalNome}
            onChange={(e) => setModalNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void salvar();
            }}
            disabled={saving}
          />
        </div>
      </div>
    </Modal>
  );
}
