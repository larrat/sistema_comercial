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
  PillGroup,
  StatusBadge,
  Button
} from '../../../shared/ui';
import { useKeyboardShortcuts } from '../../../shared/hooks/useKeyboardShortcuts';
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import type { ClienteProfileTab } from '../../../app/router/wave1Navigation';

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

type SurfaceTab = 'lista' | 'segmentos';

const STATUS_BADGE: Record<string, { label: string; tone: 'success' | 'neutral' | 'info' }> = {
  ativo: { label: 'Ativo', tone: 'success' },
  inativo: { label: 'Inativo', tone: 'neutral' },
  prospecto: { label: 'Prospecto', tone: 'info' }
};

type ClientesPilotPageProps = {
  onOpenCliente?: (clienteId: string, options?: { tab?: ClienteProfileTab; origin?: string }) => void;
  onNewCliente?: () => void;
  onRetryLoad?: () => void;
  onLoadFilteredAll?: () => Promise<Cliente[]>;
  onLoadSegmentClientes?: () => Promise<Cliente[]>;
};

export function ClientesPilotPage({
  onOpenCliente,
  onNewCliente,
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
    trackEvent('cliente_novo_aberto', {
      metadata: { origin, surface: 'page' },
      result: 'success'
    });
    setEditingId(null);
    if (onNewCliente) {
      onNewCliente();
    }
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
        if (String(active?.tagName || '').toLowerCase() === 'textarea') return;
        const submitBtn = document.querySelector('[data-testid="salvar-btn"]') as HTMLButtonElement | null;
        if (submitBtn && !submitBtn.disabled) submitBtn.click();
      }
    }
  ]);


  return (
    <main className="flex-1 w-full flex flex-col gap-8" data-testid="clientes-pilot-page">
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
          <div className="flex items-center gap-6">
            <PillGroup
              options={[
                { id: 'lista', label: 'Lista' },
                { id: 'segmentos', label: 'Segmentos' }
              ]}
              activeId={surfaceTab}
              onChange={(id) => setSurfaceTab(id as SurfaceTab)}
            />

            <div className="h-8 w-px bg-white/10 mx-1" />

            <Button
              variant="primary"
              data-testid="novo-btn"
              onClick={() => openNewCliente('header_button')}
            >
              Novo cliente
            </Button>
          </div>
        }
      />

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
                  testId: 'busca-input'
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
                      <Button onClick={clearFiltro} data-testid="limpar-filtro">
                        Limpar
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => {
                        void exportarCsvAtual();
                      }}
                      data-testid="export-btn"
                    >
                      Exportar CSV
                    </Button>
                  </>
                }
              />
            </div>

            <div data-testid="cliente-list">
              <DataTable
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
                  <Button variant="primary" onClick={() => openNewCliente('empty_state')}>
                    Novo cliente
                  </Button>
                }
                onRowClick={(cliente) => openDetail(cliente.id, 'resumo', 'list_row')}
                columns={[
                  {
                    key: 'nome',
                    label: 'Nome',
                    render: (cliente) => (
                      <div className="flex items-center gap-2" data-testid="cliente-card">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-slate-300">
                          {getInitials(cliente.nome || '')}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-100">{cliente.nome}</span>
                          {cliente.apelido ? (
                            <span className="block truncate text-xs text-slate-400">{cliente.apelido}</span>
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
                      <span className="text-sm text-slate-400">{cliente.whatsapp || cliente.tel || '—'}</span>
                    )
                  },
                  {
                    key: 'segmento',
                    label: 'Segmento',
                    render: (cliente) => <span className="text-sm text-slate-300">{cliente.seg || '—'}</span>
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
        open={!!editingId && editingId !== 'new'}
        title="Editar cliente"
        onClose={() => setEditingId(null)}
        closeOnOverlayClick={!deletingId}
      >
        <ClienteForm
          initialCliente={editingCliente}
          analyticsOrigin={editorOrigin}
          onSaved={() => {
            setSurfaceTab('lista');
            setEditingId(null);
            onRetryLoad?.();
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
