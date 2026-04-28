import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import {
  ActionMenu,
  DataTable,
  Drawer,
  EmptyState,
  FilterBar,
  PageHeader
} from '../../../shared/ui';
import { useKeyboardShortcuts } from '../../../shared/hooks/useKeyboardShortcuts';
import {
  postLegacyBridgeMessage,
  subscribeLegacyBridgeMessages
} from '../../../app/legacy/bridgeMessaging';
import type { Cliente } from '../../../../types/domain';
import {
  selectFilteredClientes,
  selectSegmentos,
  useClienteStore
} from '../store/useClienteStore';
import { useClienteMutations } from '../hooks/useClienteMutations';
import { ClienteForm } from './ClienteForm';
import { ClienteDetailPanel, type DetailTab } from './ClienteDetailPanel';
import { ClienteSegmentView } from './ClienteSegmentView';

const MESSAGE_SOURCE = 'clientes-react-pilot';
const COMMAND_SOURCE = 'clientes-legacy-shell';
type SurfaceTab = 'lista' | 'segmentos';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ativo: { label: 'Ativo', className: 'bg-emerald-50 text-emerald-700' },
  inativo: { label: 'Inativo', className: 'bg-gray-100 text-gray-600' },
  prospecto: { label: 'Prospecto', className: 'bg-blue-50 text-blue-700' }
};

type ClientesPilotPageProps = {
  onPedidoAction?: (action: 'ver' | 'editar', pedidoId: string, clienteId: string) => void;
};

export function ClientesPilotPage({ onPedidoAction }: ClientesPilotPageProps) {
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const storeStatus = useClienteStore((s) => s.status);
  const storeError = useClienteStore((s) => s.error);
  const setStatus = useClienteStore((s) => s.setStatus);
  const filtro = useClienteStore((s) => s.filtro);
  const setFiltro = useClienteStore((s) => s.setFiltro);
  const clearFiltro = useClienteStore((s) => s.clearFiltro);
  const segmentos = useClienteStore(useShallow(selectSegmentos));
  const filteredClientes = useClienteStore(useShallow(selectFilteredClientes));

  const [surfaceTab, setSurfaceTab] = useState<SurfaceTab>('lista');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('resumo');
  const { deleteClienteById, deletingId, error } = useClienteMutations();

  const editingCliente = useMemo<Cliente | null>(
    () => clientes.find((c) => c.id === editingId) ?? null,
    [clientes, editingId]
  );
  const detailCliente = useMemo<Cliente | null>(
    () => clientes.find((c) => c.id === detailId) ?? null,
    [clientes, detailId]
  );
  const temFiltro = !!(filtro.q || filtro.seg || filtro.status);

  useEffect(() => {
    if (storeStatus === 'idle') setStatus('loading');
  }, [storeStatus, setStatus]);

  async function handleExcluir(id: string) {
    await deleteClienteById(id);
    if (editingId === id) setEditingId(null);
    if (detailId === id) setDetailId(null);
  }

  function exportarCsvAtual() {
    const rows = [
      ['Nome', 'E-mail', 'Telefone', 'WhatsApp', 'Segmento', 'Status', 'Cidade', 'Vendedor'],
      ...filteredClientes.map((c) => [
        c.nome || '',
        c.email || '',
        c.tel || '',
        c.whatsapp || '',
        c.seg || '',
        c.status || '',
        c.cidade || '',
        c.rca_nome || ''
      ])
    ];
    const csv = rows
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'clientes-react.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  function openDetail(id: string, tab: DetailTab = 'resumo') {
    setSurfaceTab('lista');
    setEditingId(null);
    setDetailId(id);
    setDetailTab(tab);
  }

  function openNewCliente() {
    setSurfaceTab('lista');
    setDetailId(null);
    setEditingId('new');
    setDetailTab('resumo');
  }

  useKeyboardShortcuts([
    {
      key: '/',
      preventDefault: true,
      enabled: surfaceTab === 'lista' && !editingId,
      handler: () => {
        const input = document.querySelector('[data-testid="busca-input"]') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      }
    },
    {
      key: 'n',
      enabled: surfaceTab === 'lista' && !editingId,
      handler: () => {
        openNewCliente();
      }
    },
    {
      key: 'Escape',
      enabled: Boolean(editingId || detailId),
      handler: () => {
        if (editingId) {
          setEditingId(null);
          return;
        }
        if (detailId) {
          setDetailId(null);
          setDetailTab('resumo');
        }
      }
    },
    {
      key: 'Enter',
      enabled: Boolean(editingId),
      handler: () => {
        const active = document.activeElement as HTMLElement | null;
        if (active?.tagName.toLowerCase() === 'textarea') return;
        const submitBtn = document.querySelector('[data-testid="salvar-btn"]') as HTMLButtonElement | null;
        if (submitBtn && !submitBtn.disabled) submitBtn.click();
      }
    }
  ]);

  function getInitials(nome: string) {
    const parts = nome.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  useEffect(() => {
    return subscribeLegacyBridgeMessages(COMMAND_SOURCE, (data) => {
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
    });
  }, [clearFiltro, detailId, filteredClientes]);

  useEffect(() => {
    postLegacyBridgeMessage({
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
    });
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
    <main className="rf-content rf-ui-stack py-2" data-testid="clientes-pilot-page">
      <PageHeader
        title="Clientes"
        description="Cadastre e gerencie seus clientes."
        actions={
          <button
            className="btn btn-p btn-sm"
            type="button"
            data-testid="novo-btn"
            onClick={openNewCliente}
          >
            Novo cliente
          </button>
        }
      />

      {error && (
        <div className="rf-error-banner" data-testid="cliente-pilot-error">
          {error}
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

      {/* ── TABELA OPERACIONAL ─────────────────────────────────────────── */}
      <div hidden={surfaceTab !== 'lista'}>
        {storeStatus === 'loading' && (
          <div className="sk-card" data-testid="skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="sk-line" />
            ))}
          </div>
        )}

        {storeStatus === 'error' && (
          <EmptyState
            title={storeError ?? 'Erro ao carregar clientes.'}
            compact
            data-testid="error-state"
          />
        )}

        {storeStatus === 'ready' && (
          <>
            <div className="mb-2" data-testid="clientes-toolbar">
              <FilterBar
                search={{
                  value: filtro.q ?? '',
                  onChange: (value) => setFiltro({ q: value }),
                  placeholder: 'Buscar cliente...',
                  ariaLabel: 'Buscar clientes',
                  testId: 'busca-input',
                  className:
                    'h-9 w-[280px] rounded-md border border-gray-300 px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none'
                }}
                filters={[
                  {
                    key: 'segmento',
                    value: filtro.seg ?? '',
                    onChange: (value) => setFiltro({ seg: value }),
                    ariaLabel: 'Filtrar por segmento',
                    testId: 'seg-select',
                    options: [
                      { value: '', label: 'Segmento' },
                      ...segmentos.map((seg) => ({ value: seg, label: seg }))
                    ]
                  },
                  {
                    key: 'status',
                    value: filtro.status ?? '',
                    onChange: (value) => setFiltro({ status: value }),
                    ariaLabel: 'Filtrar por status',
                    testId: 'status-select',
                    options: [
                      { value: '', label: 'Status' },
                      { value: 'ativo', label: 'Ativo' },
                      { value: 'inativo', label: 'Inativo' },
                      { value: 'prospecto', label: 'Prospecto' }
                    ]
                  }
                ]}
                actions={
                  <>
                    {temFiltro && (
                      <button
                        className="btn btn-sm h-9"
                        type="button"
                        onClick={clearFiltro}
                        data-testid="limpar-filtro"
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm h-9"
                      type="button"
                      onClick={exportarCsvAtual}
                      data-testid="export-btn"
                    >
                      Exportar
                    </button>
                    <button
                      className="btn btn-p btn-sm h-9"
                      type="button"
                      onClick={openNewCliente}
                      data-testid="novo-inline-btn"
                    >
                      + Novo cliente
                    </button>
                  </>
                }
              />
            </div>

            {filteredClientes.length === 0 && (
              <div
                className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-gray-200 bg-white text-center"
                data-testid="empty-state"
              >
                <p className="text-sm text-gray-600">Nenhum cliente encontrado</p>
                <button
                  className="btn btn-p btn-sm h-9"
                  type="button"
                  onClick={openNewCliente}
                >
                  + Novo cliente
                </button>
              </div>
            )}

            {filteredClientes.length > 0 && (
              <DataTable
                className="clientes-data-table"
                data={filteredClientes}
                rowKey={(cliente) => cliente.id}
                onRowClick={(cliente) => openDetail(cliente.id)}
                columns={[
                  {
                    key: 'nome',
                    label: 'Nome',
                    render: (cliente) => (
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {getInitials(cliente.nome || '')}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-800">{cliente.nome}</span>
                          {cliente.apelido && (
                            <span className="block truncate text-xs text-gray-500">{cliente.apelido}</span>
                          )}
                        </div>
                      </div>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (cliente) => {
                      const badge = STATUS_BADGE[cliente.status ?? ''];
                      if (!badge) return '—';
                      return (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                          {badge.label}
                        </span>
                      );
                    }
                  },
                  {
                    key: 'whatsapp',
                    label: 'WhatsApp',
                    render: (cliente) => (
                      <span className="text-sm text-gray-600">{cliente.whatsapp || cliente.tel || '—'}</span>
                    )
                  },
                  {
                    key: 'segmento',
                    label: 'Segmento',
                    render: (cliente) => (
                      <span className="text-sm text-gray-700">{cliente.seg || '—'}</span>
                    )
                  },
                  {
                    key: 'tags',
                    label: 'Tags',
                    render: (cliente) =>
                      cliente.optin_marketing ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          MKT
                        </span>
                      ) : (
                        '—'
                      )
                  }
                ]}
                renderActions={(cliente) => {
                  return (
                    <ActionMenu
                      label="Ações do cliente"
                      buttonTestId="cli-menu-btn"
                      items={[
                        {
                          key: 'detalhes',
                          label: 'Ver detalhes',
                          onClick: () => openDetail(cliente.id)
                        },
                        {
                          key: 'editar',
                          label: 'Editar',
                          onClick: () => {
                            setSurfaceTab('lista');
                            setDetailId(null);
                            setEditingId(cliente.id);
                          }
                        },
                        {
                          key: 'excluir',
                          label: 'Excluir',
                          danger: true,
                          onClick: () => {
                            void handleExcluir(cliente.id);
                          }
                        }
                      ]}
                    />
                  );
                }}
              />
            )}
          </>
        )}
      </div>

      {surfaceTab === 'segmentos' && !detailCliente && !editingId && (
        <ClienteSegmentView
          onDetalhe={(id) => openDetail(id)}
        />
      )}

      <Drawer
        open={!!detailCliente && !editingId && surfaceTab === 'lista'}
        title={detailCliente?.nome ?? 'Cliente'}
        subtitle={[detailCliente?.seg, detailCliente?.cidade, detailCliente?.status]
          .filter(Boolean)
          .join(' · ')}
        action={
          detailCliente ? (
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() => {
                setDetailId(null);
                setEditingId(detailCliente.id);
                setDetailTab('resumo');
              }}
            >
              Editar
            </button>
          ) : undefined
        }
        onClose={() => {
          setDetailId(null);
          setDetailTab('resumo');
        }}
      >
        {detailCliente && (
          <ClienteDetailPanel
            cliente={detailCliente}
            activeTab={detailTab}
            onTabChange={setDetailTab}
            onPedidoAction={onPedidoAction}
          />
        )}
      </Drawer>

      {deletingId && <EmptyState title="Removendo cliente..." compact />}

      <Drawer
        open={!!editingId}
        title={editingId === 'new' ? 'Novo cliente' : 'Editar cliente'}
        onClose={() => setEditingId(null)}
      >
        <ClienteForm
          initialCliente={editingId === 'new' ? null : editingCliente}
          onSaved={(cliente) => {
            setSurfaceTab('lista');
            setEditingId(null);
            setDetailId(cliente.id);
            setDetailTab('resumo');
          }}
          onCancel={() => setEditingId(null)}
        />
      </Drawer>
    </main>
  );
}
