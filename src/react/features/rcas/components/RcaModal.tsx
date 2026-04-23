import { useRcasStore } from '../store/useRcasStore';
import { useRcasMutations } from '../hooks/useRcasMutations';

export function RcaModal() {
  const modalOpen = useRcasStore((s) => s.modalOpen);
  const modalNome = useRcasStore((s) => s.modalNome);
  const saving = useRcasStore((s) => s.saving);
  const setModalNome = useRcasStore((s) => s.setModalNome);
  const closeModal = useRcasStore((s) => s.closeModal);
  const { salvar } = useRcasMutations();

  if (!modalOpen) return null;

  return (
    <div className="modal-wrap" style={{ display: 'flex' }}>
      <div className="modal-bg" onClick={closeModal} />
      <div className="modal-box">
        <div className="modal-shell">
          <div className="modal-shell-head">
            <div className="mt">Vendedor</div>
          </div>
          <div className="modal-shell-body">
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
                    if (e.key === 'Escape') closeModal();
                  }}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
          <div className="modal-shell-foot">
            <div className="modal-actions">
              <button className="btn" type="button" onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-p" type="button" onClick={() => void salvar()} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar vendedor'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
