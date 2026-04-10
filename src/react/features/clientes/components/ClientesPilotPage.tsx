import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import type { Cliente } from '../../../../types/domain';
import { useClienteStore } from '../store/useClienteStore';
import { ClienteListView } from './ClienteListView';
import { ClienteForm } from './ClienteForm';

export function ClientesPilotPage() {
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingCliente = useMemo<Cliente | null>(
    () => clientes.find((cliente) => cliente.id === editingId) ?? null,
    [clientes, editingId]
  );

  return (
    <div className="screen-content form-gap-lg" data-testid="clientes-pilot-page">
      <ClienteListView
        onNovoCliente={() => setEditingId('new')}
        onEditar={(id) => setEditingId(id)}
        onDetalhe={(id) => setEditingId(id)}
      />

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
