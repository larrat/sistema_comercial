import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import type { Cliente } from '../../../../types/domain';
import { useClienteStore } from '../store/useClienteStore';
import { useClienteMutations } from '../hooks/useClienteMutations';
import { ClienteListView } from './ClienteListView';
import { ClienteForm } from './ClienteForm';
import { ClienteDetailPanel } from './ClienteDetailPanel';

const MESSAGE_SOURCE = 'clientes-react-pilot';

export function ClientesPilotPage() {
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { deleteClienteById, deletingId, error } = useClienteMutations();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const editingCliente = useMemo<Cliente | null>(
    () => clientes.find((cliente) => cliente.id === editingId) ?? null,
    [clientes, editingId]
  );
  const detailCliente = useMemo<Cliente | null>(
    () => clientes.find((cliente) => cliente.id === detailId) ?? null,
    [clientes, detailId]
  );

  async function handleExcluir(id: string) {
    await deleteClienteById(id);
    if (editingId === id) {
      setEditingId(null);
    }
    if (detailId === id) {
      setDetailId(null);
    }
  }

  useEffect(() => {
    if (window.parent === window) return;

    const container = containerRef.current;
    if (!container) return;
    const element: HTMLDivElement = container;

    function postHeight() {
      window.parent.postMessage(
        {
          source: MESSAGE_SOURCE,
          type: 'clientes:height',
          height: element.scrollHeight + 24
        },
        window.location.origin
      );
    }

    postHeight();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      postHeight();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [clientes.length, deletingId, detailId, editingId, error]);

  useEffect(() => {
    if (window.parent === window) return;

    window.parent.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: 'clientes:state',
        state: {
          view: editingId ? 'form' : detailId ? 'detail' : 'list',
          status: deletingId ? 'deleting' : error ? 'error' : 'ready',
          count: clientes.length
        }
      },
      window.location.origin
    );
  }, [clientes.length, deletingId, detailId, editingId, error]);

  return (
    <div
      ref={containerRef}
      className="screen-content form-gap-lg"
      data-testid="clientes-pilot-page"
    >
      {error && (
        <div className="empty" data-testid="cliente-pilot-error">
          <p>{error}</p>
        </div>
      )}

      <ClienteListView
        onNovoCliente={() => {
          setDetailId(null);
          setEditingId('new');
        }}
        onEditar={(id) => {
          setDetailId(null);
          setEditingId(id);
        }}
        onDetalhe={(id) => {
          setEditingId(null);
          setDetailId(id);
        }}
        onExcluir={handleExcluir}
      />

      {detailCliente && !editingId && (
        <ClienteDetailPanel
          cliente={detailCliente}
          onEditar={(id) => {
            setDetailId(null);
            setEditingId(id);
          }}
          onClose={() => setDetailId(null)}
        />
      )}

      {deletingId && (
        <div className="empty-inline" data-testid="cliente-pilot-deleting">
          Removendo cliente...
        </div>
      )}

      {editingId && (
        <ClienteForm
          initialCliente={editingId === 'new' ? null : editingCliente}
          onSaved={(cliente) => {
            setEditingId(null);
            setDetailId(cliente.id);
          }}
          onCancel={() => {
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
