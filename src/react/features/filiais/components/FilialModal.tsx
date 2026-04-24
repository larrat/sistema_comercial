import { useFiliaisStore } from '../store/useFiliaisStore';
import { useFilialMutations } from '../hooks/useFilialMutations';

export function FilialModal() {
  const modalOpen = useFiliaisStore((s) => s.modalOpen);
  const modalEditId = useFiliaisStore((s) => s.modalEditId);
  const form = useFiliaisStore((s) => s.form);
  const saving = useFiliaisStore((s) => s.saving);
  const setForm = useFiliaisStore((s) => s.setForm);
  const closeModal = useFiliaisStore((s) => s.closeModal);
  const { salvar } = useFilialMutations();

  if (!modalOpen) return null;

  return (
    <div className="modal-wrap" style={{ display: 'flex' }}>
      <div className="modal-bg" onClick={closeModal} />
      <div className="modal-box">
        <div className="modal-shell">
          <div className="modal-shell-head">
            <div className="mt">{modalEditId ? 'Editar filial' : 'Nova filial'}</div>
          </div>

          <div className="modal-shell-body">
            <div className="fg">
              <div>
                <div className="fl">Nome *</div>
                <input
                  className="inp"
                  autoFocus
                  placeholder="Ex: Filial Centro"
                  value={form.nome}
                  onChange={(e) => setForm({ nome: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void salvar();
                    if (e.key === 'Escape') closeModal();
                  }}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="fg c2">
              <div>
                <div className="fl">Cidade</div>
                <input
                  className="inp"
                  placeholder="Ex: São Paulo"
                  value={form.cidade}
                  onChange={(e) => setForm({ cidade: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <div className="fl">Estado</div>
                <input
                  className="inp"
                  placeholder="Ex: SP"
                  maxLength={2}
                  value={form.estado}
                  onChange={(e) => setForm({ estado: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="fg">
              <div>
                <div className="fl">Endereço</div>
                <input
                  className="inp"
                  placeholder="Ex: Rua das Flores, 123"
                  value={form.endereco}
                  onChange={(e) => setForm({ endereco: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="fg">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <div className="fl">Cor</div>
                  <input
                    type="color"
                    className="inp"
                    style={{ width: 56, height: 40, padding: '2px 4px', cursor: 'pointer' }}
                    value={form.cor}
                    onChange={(e) => setForm({ cor: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: form.cor,
                    border: '1px solid var(--line)',
                    marginTop: 20,
                    flexShrink: 0
                  }}
                />
              </div>
            </div>
          </div>

          <div className="modal-shell-foot">
            <div className="modal-actions">
              <button className="btn" type="button" onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button
                className="btn btn-p"
                type="button"
                onClick={() => void salvar()}
                disabled={saving}
              >
                {saving ? 'Salvando…' : modalEditId ? 'Atualizar filial' : 'Criar filial'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
