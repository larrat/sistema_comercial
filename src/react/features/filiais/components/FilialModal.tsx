import { Modal, Button, Input } from '../../../shared/ui';
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

  return (
    <Modal
      open={modalOpen}
      title={modalEditId ? 'Editar filial' : 'Nova filial'}
      onClose={closeModal}
      closeOnOverlay={!saving}
      footer={
        <>
          <Button onClick={closeModal} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => void salvar()}
            loading={saving}
          >
            {modalEditId ? 'Atualizar filial' : 'Criar filial'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <Input
          label="Nome da Filial"
          required
          autoFocus
          placeholder="Ex: Filial Centro"
          value={form.nome}
          onChange={(e) => setForm({ nome: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void salvar();
          }}
          disabled={saving}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cidade"
            placeholder="Ex: São Paulo"
            value={form.cidade}
            onChange={(e) => setForm({ cidade: e.target.value })}
            disabled={saving}
          />
          <Input
            label="Estado"
            placeholder="Ex: SP"
            maxLength={2}
            value={form.estado}
            onChange={(e) => setForm({ estado: e.target.value })}
            disabled={saving}
          />
        </div>

        <Input
          label="Endereço Completo"
          placeholder="Ex: Rua das Flores, 123"
          value={form.endereco}
          onChange={(e) => setForm({ endereco: e.target.value })}
          disabled={saving}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-end gap-4">
            <Input
              label="Cor Identificadora"
              type="color"
              className="!w-14 !h-10 !p-1 cursor-pointer"
              value={form.cor}
              onChange={(e) => setForm({ cor: e.target.value })}
              disabled={saving}
            />
            <div
              className="w-10 h-10 rounded-xl border border-white/10"
              style={{ background: form.cor }}
            />
          </div>
          <Input
            label="Meta Mensal (R$)"
            type="number"
            placeholder="Ex: 50000"
            value={form.meta_mensal}
            onChange={(e) => setForm({ meta_mensal: e.target.value })}
            disabled={saving}
          />
        </div>
      </div>
    </Modal>
  );
}
