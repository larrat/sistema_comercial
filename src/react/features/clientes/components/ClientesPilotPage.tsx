import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import {
  ActionMenu,
  DataTable,
  Drawer,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  StatusBadge
} from '../../../shared/ui';
import { useKeyboardShortcuts } from '../../../shared/hooks/useKeyboardShortcuts';
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import type { ClienteProfileTab } from '../../../app/router/wave1Navigation';
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
import { ClienteDeleteConfirmModal } from './ClienteDeleteConfirmModal';
import { ClienteSegmentView } from './ClienteSegmentView';

const MESSAGE_SOURCE = 'clientes-react-pilot';
const COMMAND_SOURCE = 'clientes-legacy-shell';
type SurfaceTab = 'lista' | 'segmentos';

const STATUS_BADGE: Record<string, { label: string; tone: 'success' | 'neutral' | 'info' }> = {
  ativo: { label: 'Ativo', tone: 'success' },
  inativo: { label: 'Inativo', tone: 'neutral' },
  prospecto: { label: 'Prospecto', tone: 'info' }
};

type ClientesPilotPageProps = {
  onOpenCliente?: (clienteId: string, options?: { tab?: ClienteProfileTab; origin?: string }) => void;
  onRetryLoad?: () => void;
  onLoadFilteredAll?: () => Promise<Cliente[]>;
  onLoadSegmentClientes?: () => Promise<Cliente[]>;
};

export function ClientesPilotPage({
  onOpenCliente,
  onRetryLoad,
  onLoadFilteredAll,
  onLoadSegmentClientes
}: ClientesPilotPageProps) {
  const clientes = useClienteStore(useShallow((s) => s.clientes));
  const page = useClienteStore((s) => s.page);
  const pageSize = useClienteStore((s) => s.pageSize);
  const total = useClienteStore((s) => s.total);
  const pageCount = useClienteStore((s) => s.pageCount);
  const storeStatus = useClienteStore((s) => s.status);
  const storeError = useClienteStore((s) => s.error);
  const segmentStatus = useClienteStore((s) => s.segmentStatus);
  const segmentError = useClienteStore((s) => s.segmentError);
  const setStatus = useClienteStore((s) => s.setStatus);
  const filtro = useClienteStore((s) => s.filtro);
  const setFiltro = useClienteStore((s) => s.setFiltro);
  const clearFiltro = useClienteStore((s) => s.clearFiltro);
  const setPage = useClienteStore((s) => s.setPage);
  const setPageSize = useClienteStore((s) => s.setPageSize);
  const segmentos = useClienteStore(useShallow(selectSegmentos));
  const filteredSegmentClientes = useClienteStore(useShallow(selectFilteredClientes));

  const [surfaceTab, setSurfaceTab] = useState<SurfaceTab>('lista');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editorOrigin, setEditorOrigin] = useState<string>('unknown');
  const { deleteClienteById, deletingId, error } = useClienteMutations();
  const { trackEvent } = useAnalytics({ module: 'clientes' });
  const lastSearchKeyRef = useRef<string>('');

  const editingCliente = useMemo<Cliente | null>(
    () => clientes.find((cliente) => cliente.id === editingId) ?? null,
    [clientes, editingId]
  );
  const deleteTarget = useMemo<Cliente | null>(
    () => clientes.find((cliente) => cliente.id === deleteTargetId) ?? null,
    [clientes, deleteTargetId]
  );
  const temFiltro = !!(filtro.q || filtro.seg || filtro.status);

  useEffect(() => {
    if (storeStatus === 'idle') setStatus('loading');
  }, [storeStatus, setStatus]);

  useEffect(() => {
    if (surfaceTab !== 'segmentos' || !onLoadSegmentClientes) return;
    void onLoadSegmentClientes();
  }, [surfaceTab, filtro.q, filtro.seg, filtro.status, onLoadSegmentClientes]);

  useEffect(() => {
    if (surfaceTab !== 'lista') return;
    const term = String(filtro.q || '').trim();
    if (!term) {
      lastSearchKeyRef.current = '';
      return;
    }

    const filtersActive = buildActiveFilterKeys(filtro.seg, filtro.status);
    const searchKey = [term, filtro.seg || '', filtro.status || ''].join('|');
    if (searchKey === lastSearchKeyRef.current) return;

    const timeoutId = window.setTimeout(() => {
      trackEvent('cliente_buscado', {
        metadata: {
          origin: 'list_filter_bar',
          term_length: term.length,
          filters_active: filtersActive,
          filters_count: filtersActive.length
        },
        result: 'success'
      });
      lastSearchKeyRef.current = searchKey;
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [filtro.q, filtro.seg, filtro.status, surfaceTab, trackEvent]);

  async function handleExcluir(id: string) {
    await deleteClienteById(id);
    if (editingId === id) setEditingId(null);
    setDeleteTargetId(null);
    if (page > 1 && clientes.length === 1) {
      setPage(page - 1);
      return;
    }
    onRetryLoad?.();
  }

  async function exportarCsvAtual() {
    const exportRows = onLoadFilteredAll ? await onLoadFilteredAll() : clientes;
    const rows = [
      ['Nome', 'E-mail', 'Telefone', 'WhatsApp', 'Segmento', 'Status', 'Cidade', 'Vendedor'],
      ...exportRows.map((cliente) => [
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
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'clientes-react.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  function trackDrawerOpen(mode: 'create' | 'edit', origin: string) {
    trackEvent('drawer_aberto', {
      metadata: { mode, origin },
      result: 'success'
    });
  }

  function openDetail(clienteId: string, tab: ClienteProfileTab = 'resumo', origin = 'list_row') {
    setSurfaceTab('lista');
    setEditingId(null);
    trackEvent('cliente_aberto', {
      metadata: { origin },
      result: 'success'
    });
    onOpenCliente?.(clienteId, { tab, origin });
  }

  function openNewCliente(origin = 'header_button') {
    setSurfaceTab('lista');
    setEditingId('new');
    setEditorOrigin(origin);
    trackDrawerOpen('create', origin);
  }

  function openEditCliente(clienteId: string, origin = 'row_menu') {
    setSurfaceTab('lista');
    setEditingId(clienteId);
    setEditorOrigin(origin);
    trackDrawerOpen('edit', origin);
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
      handler: () => openNewCliente('keyboard_shortcut')
    },
    {
      key: 'Escape',
      enabled: Boolean(editingId),
      handler: () => {
        if (editingId) setEditingId(null);
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

  useEffect(() => {
    return subscribeLegacyBridgeMessages(COMMAND_SOURCE, (data) => {
      if (data.type === 'clientes:novo') {
        openNewCliente('legacy_bridge');
        return;
      }

      if (data.type === 'clientes:abrir-segmentos') {
        setEditingId(null);
        setSurfaceTab('segmentos');
        return;
      }

      if (data.type === 'clientes:abrir-detalhe' && data.id) {
        openDetail(String(data.id), normalizeClienteProfileTab(data.tab), 'legacy_bridge');
        return;
      }

      if (data.type === 'clientes:editar' && data.id) {
        openEditCliente(String(data.id), 'legacy_bridge');
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

      if (data.type === 'clientes:abrir-lista') {
        setEditingId(null);
        setSurfaceTab('lista');
        return;
      }

      if (data.type === 'clientes:exportar-csv') {
        void exportarCsvAtual();
        return;
      }

      if (data.type === 'clientes:abrir-resumo' && data.id) {
        openDetail(String(data.id), 'resumo', 'legacy_bridge');
        return;
      }

      if ((data.type === 'clientes:abrir-abertas' || data.type === 'clientes:abrir-fechadas') && data.id) {
        openDetail(String(data.id), 'pedidos', 'legacy_bridge');
        return;
      }

      if (data.type === 'clientes:abrir-notas' && data.id) {
        openDetail(String(data.id), 'notas', 'legacy_bridge');
        return;
      }

      if (data.type === 'clientes:abrir-fidelidade' && data.id) {
        openDetail(String(data.id), 'cadastro', 'legacy_bridge');
      }
    });
  }, [clearFiltro, onOpenCliente]);

  useEffect(() => {
    postLegacyBridgeMessage({
      source: MESSAGE_SOURCE,
      type: 'clientes:state',
      state: {
        view: editingId ? 'form' : 'list',
        status: deletingId ? 'deleting' : error ? 'error' : 'ready',
        count: total,
        filtersActive: [filtro.q, filtro.seg, filtro.status].filter(Boolean).length,
        selectedId: editingId === 'new' ? '' : editingId || '',
        selectedName: editingCliente?.nome || '',
        surfaceTab
      }
    });
  }, [
    deletingId,
    editingId,
    error,
    filtro.q,
    filtro.seg,
    filtro.status,
    editingCliente?.nome,
    surfaceTab,
    total
  ]);

  return (
    <main className="rf-content rf-ui-stack" data-testid="clientes-pilot-page">
      <PageHeader
        kicker="Relacionamento"
        title="Clientes"
        description="Acompanhe a base de clientes, revise segmentos e abra cadastro ou detalhe sem sair da rotina operacional."
        meta={
          <StatusBadge tone="info">
            {total} no total · página {page} de {pageCount}
          </StatusBadge>
        }
        actions={
          <button
            className="btn btn-p btn-sm"
            type="button"
            data-testid="novo-btn"
            onClick={() => openNewCliente('header_button')}
          >
            Novo cliente
          </button>
        }
      />

      {error ? <ErrorState title={error} compact data-testid="cliente-pilot-error" /> : null}

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

      <div hidden={surfaceTab !== 'lista'}>
        {storeStatus !== 'error' ? (
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
                    options: [{ value: '', label: 'Segmento' }, ...segmentos.map((seg) => ({ value: seg, label: seg }))]
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
                    {temFiltro ? (
                      <button className="btn btn-sm h-9" type="button" onClick={clearFiltro} data-testid="limpar-filtro">
                        Limpar
                      </button>
                    ) : null}
                    <button
                      className="btn btn-ghost btn-sm h-9"
                      type="button"
                      onClick={() => {
                        void exportarCsvAtual();
                      }}
                      data-testid="export-btn"
                    >
                      Exportar CSV
                    </button>
                    <button
                      className="btn btn-p btn-sm h-9"
                      type="button"
                      onClick={() => openNewCliente('inline_button')}
                      data-testid="novo-inline-btn"
                    >
                      Novo cliente
                    </button>
                  </>
                }
              />
            </div>

            <div data-testid="cliente-list">
              <DataTable
                className="clientes-data-table"
                data={clientes}
                rowKey={(cliente) => cliente.id}
                loading={storeStatus === 'loading'}
                onRetry={onRetryLoad}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                emptyTitle={temFiltro ? 'Nenhum cliente encontrado com os filtros atuais.' : 'Nenhum cliente cadastrado ainda.'}
                emptyDescription={
                  temFiltro
                    ? 'Ajuste os filtros ou limpe a busca para ampliar os resultados.'
                    : 'Cadastre o primeiro cliente para começar a operar por aqui.'
                }
                emptyAction={
                  <button className="btn btn-p btn-sm h-9" type="button" onClick={() => openNewCliente('empty_state')}>
                    Novo cliente
                  </button>
                }
                onRowClick={(cliente) => openDetail(cliente.id, 'resumo', 'list_row')}
                columns={[
                  {
                    key: 'nome',
                    label: 'Nome',
                    render: (cliente) => (
                      <div className="flex items-center gap-2" data-testid="cliente-card">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {getInitials(cliente.nome || '')}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-800">{cliente.nome}</span>
                          {cliente.apelido ? (
                            <span className="block truncate text-xs text-gray-500">{cliente.apelido}</span>
                          ) : null}
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
                      return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
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
                    render: (cliente) => <span className="text-sm text-gray-700">{cliente.seg || '—'}</span>
                  },
                  {
                    key: 'tags',
                    label: 'Tags',
                    render: (cliente) =>
                      cliente.optin_marketing ? <StatusBadge tone="success">MKT</StatusBadge> : '—'
                  }
                ]}
                renderActions={(cliente) => (
                  <ActionMenu
                    label="Ações do cliente"
                    buttonTestId="cli-menu-btn"
                    items={[
                      {
                        key: 'detalhes',
                        label: 'Ver detalhes',
                        onClick: () => openDetail(cliente.id, 'resumo', 'row_menu')
                      },
                      {
                        key: 'editar',
                        label: 'Editar',
                        onClick: () => openEditCliente(cliente.id, 'row_menu')
                      },
                      {
                        key: 'excluir',
                        label: 'Excluir',
                        danger: true,
                        onClick: () => setDeleteTargetId(cliente.id)
                      }
                    ]}
                  />
                )}
              />
            </div>
          </>
        ) : (
          <ErrorState
            title={storeError ?? 'Erro ao carregar clientes.'}
            compact
            onRetry={onRetryLoad}
            data-testid="error-state"
          />
        )}
      </div>

      {surfaceTab === 'segmentos' && !editingId ? (
        <ClienteSegmentView
          clientes={filteredSegmentClientes}
          loading={segmentStatus === 'loading'}
          error={segmentStatus === 'error' ? segmentError : null}
          onRetry={() => {
            void onLoadSegmentClientes?.();
          }}
          onDetalhe={(clienteId) => openDetail(clienteId, 'resumo', 'segmentos')}
        />
      ) : null}

      {deletingId ? <LoadingState title="Removendo cliente..." compact /> : null}

      <Drawer
        open={!!editingId}
        title={editingId === 'new' ? 'Novo cliente' : 'Editar cliente'}
        onClose={() => setEditingId(null)}
        closeOnOverlayClick={!deletingId}
      >
        <ClienteForm
          initialCliente={editingId === 'new' ? null : editingCliente}
          analyticsOrigin={editorOrigin}
          onSaved={(cliente) => {
            setSurfaceTab('lista');
            setEditingId(null);
            onRetryLoad?.();
            openDetail(cliente.id, 'resumo', 'save_success');
          }}
          onCancel={() => setEditingId(null)}
        />
      </Drawer>

      <ClienteDeleteConfirmModal
        open={!!deleteTarget}
        target={deleteTarget}
        submitting={Boolean(deletingId)}
        onClose={() => {
          if (!deletingId) setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleteTarget) void handleExcluir(deleteTarget.id);
        }}
      />
    </main>
  );
}

function buildActiveFilterKeys(segmento?: string, status?: string) {
  return [...(segmento ? ['segmento'] : []), ...(status ? ['status'] : [])];
}

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function normalizeClienteProfileTab(value: unknown): ClienteProfileTab {
  if (value === 'pedidos' || value === 'financeiro' || value === 'notas' || value === 'cadastro') {
    return value;
  }
  if (value === 'abertas' || value === 'fechadas') return 'pedidos';
  if (value === 'fidelidade') return 'cadastro';
  return 'resumo';
}
