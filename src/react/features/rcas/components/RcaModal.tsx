import { Modal, Button, Input } from '../../../shared/ui';
import { useRcasStore } from '../store/useRcasStore';
import { useRcasMutations } from '../hooks/useRcasMutations';

export function RcaModal() {
  const drawerOpen = useRcasStore((s) => s.drawerOpen);
  const drawerNome = useRcasStore((s) => s.drawerNome);
  const drawerEditId = useRcasStore((s) => s.drawerEditId);
  const saving = useRcasStore((s) => s.saving);
  const setDrawerNome = useRcasStore((s) => s.setDrawerNome);
  const closeDrawer = useRcasStore((s) => s.closeDrawer);
  const { salvar } = useRcasMutations();

  return (
    <Modal
      open={drawerOpen}
      title={drawerEditId ? 'Editar vendedor' : 'Novo vendedor'}
      size="sm"
      closeOnOverlayClick={!saving}
      onClose={closeDrawer}
      footer={
        <>
          <Button onClick={closeDrawer} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => void salvar()}
            loading={saving}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nome do vendedor *"
          id="rca-nome"
          autoFocus
          placeholder="Ex: João Silva"
          value={drawerNome}
          onChange={(e) => setDrawerNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void salvar();
          }}
          disabled={saving}
        />
      </div>
    </Modal>
  );
}
