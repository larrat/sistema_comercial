import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import type { Cliente } from '../../../../types/domain';
import { selectFilteredClientes, useClienteStore } from '../store/useClienteStore';
import { useClienteMutations } from '../hooks/useClienteMutations';
import { ClienteListView } from './ClienteListView';
import { ClienteForm } from './ClienteForm';
import { ClienteDetailPanel } from './ClienteDetailPanel';

const MESSAGE_SOURCE = 'clientes-react-pilot';
const COMMAND_SOURCE = 'clientes-legacy-shell';

export function ClientesPilotPage() {
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const filtro = useClienteStore((s) => s.filtro);
  const clearFiltro = useClienteStore((s) => s.clearFiltro);
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
  const filteredClientes = useClienteStore(useShallow(selectFilteredClientes));

  async function handleExcluir(id: string) {
    await deleteClienteById(id);
    if (editingId === id) {
      setEditingId(null);
    }
    if (detailId === id) {
      setDetailId(null);
    }
  }

  function exportarCsvAtual() {
    const rows = [
      ['Nome', 'E-mail', 'Telefone', 'WhatsApp', 'Segmento', 'Status', 'Cidade', 'RCA'],
      ...filteredClientes.map((cliente) => [
        cliente.nome || '',
        cliente.email || '',
        cliente.tel || '',
        cliente.whatsapp || '',
        cliente.seg || '',
        cliente.status || '',
        cliente.cidade || '',
        cliente.rca_nome || ''
      ])
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'clientes-react.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  useEffect(() => {
    if (window.parent === window) return;

    function handleParentCommand(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;

      const data = event.data;
      if (!data || data.source !== COMMAND_SOURCE) return;

      if (data.type === 'clientes:novo') {
        setDetailId(null);
        setEditingId('new');
        return;
      }

      if (data.type === 'clientes:limpar-filtros') {
        clearFiltro();
        return;
      }

      if (data.type === 'clientes:editar-atual' && detailId) {
        setEditingId(detailId);
        setDetailId(null);
        return;
      }

      if (data.type === 'clientes:abrir-lista') {
        setEditingId(null);
        setDetailId(null);
        return;
      }

      if (data.type === 'clientes:exportar-csv') {
        exportarCsvAtual();
      }
    }

    window.addEventListener('message', handleParentCommand);
    return () => {
      window.removeEventListener('message', handleParentCommand);
    };
  }, [clearFiltro, detailId, filteredClientes]);

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
          count: clientes.length,
          filtersActive: [filtro.q, filtro.seg, filtro.status].filter(Boolean).length,
          selectedId: editingId === 'new' ? '' : editingId || detailId || '',
          selectedName: editingCliente?.nome || detailCliente?.nome || ''
        }
      },
      window.location.origin
    );
  }, [
    clientes.length,
    deletingId,
    detailId,
    editingId,
    error,
    filtro.q,
    filtro.seg,
    filtro.status,
    editingCliente?.nome,
    detailCliente?.nome
  ]);

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
