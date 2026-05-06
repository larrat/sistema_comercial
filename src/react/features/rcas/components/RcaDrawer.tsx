import { Drawer } from '../../../shared/ui';
import { useRcasStore } from '../store/useRcasStore';
import { useRcasMutations } from '../hooks/useRcasMutations';

export function RcaDrawer() {
  const drawerOpen = useRcasStore((s) => s.drawerOpen);
  const drawerNome = useRcasStore((s) => s.drawerNome);
  const drawerEditId = useRcasStore((s) => s.drawerEditId);
  const saving = useRcasStore((s) => s.saving);
  const setDrawerNome = useRcasStore((s) => s.setDrawerNome);
  const closeDrawer = useRcasStore((s) => s.closeDrawer);
  const { salvar } = useRcasMutations();

  return (
    <Drawer
      open={drawerOpen}
      title={drawerEditId ? 'Editar vendedor' : 'Novo vendedor'}
      size="sm"
      closeOnOverlayClick={!saving}
      onClose={closeDrawer}
      footer={
        <>
          <button className="btn btn-sm" type="button" onClick={closeDrawer} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn btn-p btn-sm"
            type="button"
            onClick={() => void salvar()}
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Salvar'}
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
            value={drawerNome}
            onChange={(e) => setDrawerNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void salvar();
            }}
            disabled={saving}
          />
        </div>
      </div>
    </Drawer>
  );
}
