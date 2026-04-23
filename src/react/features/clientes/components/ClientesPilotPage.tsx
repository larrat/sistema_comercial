import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import type { Cliente } from '../../../../types/domain';
import { selectFilteredClientes, useClienteStore } from '../store/useClienteStore';
import { useClienteMutations } from '../hooks/useClienteMutations';
import { ClienteListView } from './ClienteListView';
import { ClienteForm } from './ClienteForm';
import { ClienteDetailPanel, type DetailTab } from './ClienteDetailPanel';
import { ClienteSegmentView } from './ClienteSegmentView';

const MESSAGE_SOURCE = 'clientes-react-pilot';
const COMMAND_SOURCE = 'clientes-legacy-shell';
type SurfaceTab = 'lista' | 'segmentos';

export function ClientesPilotPage() {
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const filtro = useClienteStore((s) => s.filtro);
  const clearFiltro = useClienteStore((s) => s.clearFiltro);
  const [surfaceTab, setSurfaceTab] = useState<SurfaceTab>('lista');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('resumo');
  const { deleteClienteById, deletingId, error } = useClienteMutations();

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
    function handleParentCommand(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;

      const data = event.data;
      if (!data || data.source !== COMMAND_SOURCE) return;

      if (data.type === 'clientes:novo') {
        setSurfaceTab('lista');
        setDetailId(null);
        setEditingId('new');
        setDetailTab('resumo');
        return;
      }

      if (data.type === 'clientes:abrir-segmentos') {
        setEditingId(null);
        setDetailId(null);
        setDetailTab('resumo');
        setSurfaceTab('segmentos');
        return;
      }

      if (data.type === 'clientes:abrir-detalhe' && data.id) {
        setSurfaceTab('lista');
        setEditingId(null);
        setDetailId(String(data.id));
        setDetailTab((data.tab as DetailTab) || 'resumo');
        return;
      }

      if (data.type === 'clientes:editar' && data.id) {
        setSurfaceTab('lista');
        setDetailId(null);
        setEditingId(String(data.id));
        setDetailTab('resumo');
        return;
      }

      if (data.type === 'clientes:excluir' && data.id) {
        void handleExcluir(String(data.id));
        return;
      }

      if (data.type === 'clientes:limpar-filtros') {
        clearFiltro();
        return;
      }

      if (data.type === 'clientes:editar-atual' && detailId) {
        setEditingId(detailId);
        setDetailId(null);
        setDetailTab('resumo');
        return;
      }

      if (data.type === 'clientes:abrir-lista') {
        setEditingId(null);
        setDetailId(null);
        setDetailTab('resumo');
        setSurfaceTab('lista');
        return;
      }

      if (data.type === 'clientes:exportar-csv') {
        exportarCsvAtual();
        return;
      }

      if (data.type === 'clientes:abrir-resumo') {
        if (!detailId && data.id) setDetailId(String(data.id));
        setDetailTab('resumo');
        return;
      }

      if (data.type === 'clientes:abrir-abertas') {
        if (!detailId && data.id) setDetailId(String(data.id));
        if (detailId || data.id) setDetailTab('abertas');
        return;
      }

      if (data.type === 'clientes:abrir-fechadas') {
        if (!detailId && data.id) setDetailId(String(data.id));
        if (detailId || data.id) setDetailTab('fechadas');
        return;
      }

      if (data.type === 'clientes:abrir-notas') {
        if (!detailId && data.id) setDetailId(String(data.id));
        if (detailId || data.id) setDetailTab('notas');
        return;
      }

      if (data.type === 'clientes:abrir-fidelidade') {
        if (!detailId && data.id) setDetailId(String(data.id));
        if (detailId || data.id) setDetailTab('fidelidade');
      }
    }

    window.addEventListener('message', handleParentCommand);
    return () => {
      window.removeEventListener('message', handleParentCommand);
    };
  }, [clearFiltro, detailId, filteredClientes]);

  useEffect(() => {
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: 'clientes:state',
        state: {
          view: editingId ? 'form' : detailId ? 'detail' : 'list',
          status: deletingId ? 'deleting' : error ? 'error' : 'ready',
          count: clientes.length,
          filtersActive: [filtro.q, filtro.seg, filtro.status].filter(Boolean).length,
          selectedId: editingId === 'new' ? '' : editingId || detailId || '',
          selectedName: editingCliente?.nome || detailCliente?.nome || '',
          detailTab,
          surfaceTab
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
    detailCliente?.nome,
    detailTab,
    surfaceTab
  ]);

  return (
    <div className="screen-content form-gap-lg" data-testid="clientes-pilot-page">
      {error && (
        <div className="empty" data-testid="cliente-pilot-error">
          <p>{error}</p>
        </div>
      )}

      <div className="tabs" data-testid="cliente-surface-tabs">
        <button
          className={`tb ${surfaceTab === 'lista' ? 'on' : ''}`}
          type="button"
          onClick={() => setSurfaceTab('lista')}
        >
          Lista
        </button>
        <button
          className={`tb ${surfaceTab === 'segmentos' ? 'on' : ''}`}
          type="button"
          onClick={() => setSurfaceTab('segmentos')}
        >
          Segmentos
        </button>
      </div>

      <ClienteListView
        hidden={surfaceTab !== 'lista'}
        onNovoCliente={() => {
          setSurfaceTab('lista');
          setDetailId(null);
          setEditingId('new');
          setDetailTab('resumo');
        }}
        onExportar={exportarCsvAtual}
        onEditar={(id) => {
          setSurfaceTab('lista');
          setDetailId(null);
          setEditingId(id);
          setDetailTab('resumo');
        }}
        onDetalhe={(id) => {
          setSurfaceTab('lista');
          setEditingId(null);
          setDetailId(id);
          setDetailTab('resumo');
        }}
        onExcluir={handleExcluir}
      />

      {surfaceTab === 'segmentos' && !detailCliente && !editingId && (
        <ClienteSegmentView
          onDetalhe={(id) => {
            setSurfaceTab('lista');
            setEditingId(null);
            setDetailId(id);
            setDetailTab('resumo');
          }}
        />
      )}

      {detailCliente && !editingId && surfaceTab === 'lista' && (
        <ClienteDetailPanel
          cliente={detailCliente}
          activeTab={detailTab}
          onTabChange={setDetailTab}
          onEditar={(id) => {
            setDetailId(null);
            setEditingId(id);
            setDetailTab('resumo');
          }}
          onClose={() => {
            setDetailId(null);
            setDetailTab('resumo');
          }}
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
            setSurfaceTab('lista');
            setEditingId(null);
            setDetailId(cliente.id);
            setDetailTab('resumo');
          }}
          onCancel={() => {
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
