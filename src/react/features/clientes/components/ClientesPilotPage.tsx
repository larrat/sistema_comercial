import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import type { Cliente } from '../../../../types/domain';
import { useClienteStore } from '../store/useClienteStore';
import { useClienteMutations } from '../hooks/useClienteMutations';
import { ClienteListView } from './ClienteListView';
import { ClienteForm } from './ClienteForm';

export function ClientesPilotPage() {
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const [editingId, setEditingId] = useState<string | null>(null);
  const { deleteClienteById, deletingId, error } = useClienteMutations();

  const editingCliente = useMemo<Cliente | null>(
    () => clientes.find((cliente) => cliente.id === editingId) ?? null,
    [clientes, editingId]
  );

  async function handleExcluir(id: string) {
    await deleteClienteById(id);
    if (editingId === id) {
      setEditingId(null);
    }
  }

  return (
    <div className="screen-content form-gap-lg" data-testid="clientes-pilot-page">
      {error && (
        <div className="empty" data-testid="cliente-pilot-error">
          <p>{error}</p>
        </div>
      )}

      <ClienteListView
        onNovoCliente={() => setEditingId('new')}
        onEditar={(id) => setEditingId(id)}
        onDetalhe={(id) => setEditingId(id)}
        onExcluir={handleExcluir}
      />

      {deletingId && (
        <div className="empty-inline" data-testid="cliente-pilot-deleting">
          Removendo cliente...
        </div>
      )}

      {editingId && (
        <ClienteForm
          initialCliente={editingId === 'new' ? null : editingCliente}
          onSaved={() => setEditingId(null)}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
