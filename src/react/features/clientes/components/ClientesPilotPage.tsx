import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { toast } from 'sonner';

import {
  ActionMenu,
  DataTable,
  Drawer,
  ErrorState,
  FilterBar,
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
  useClienteStore
} from '../store/useClienteStore';
import { useClientesQuery, useSegmentosQuery, useClienteMutations } from '../hooks/useClientesQuery';
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
};

export function ClientesPilotPage({
  onOpenCliente,
  onNewCliente
}: ClientesPilotPageProps) {
  const page = useClienteStore((s) => s.page);
  const pageSize = useClienteStore((s) => s.pageSize);
  const filtro = useClienteStore((s) => s.filtro);
  const setFiltro = useClienteStore((s) => s.setFiltro);
  const clearFiltro = useClienteStore((s) => s.clearFiltro);
  const setPage = useClienteStore((s) => s.setPage);
  const setPageSize = useClienteStore((s) => s.setPageSize);

  // TanStack Queries
  const { 
    data: clientesData, 
    isLoading: isLoadingClientes, 
    isError: isErrorClientes, 
    error: errorClientes,
    refetch: refetchClientes 
  } = useClientesQuery(filtro, page, pageSize);

  const { data: segmentos = [] } = useSegmentosQuery();
  const { remove: deleteMutation } = useClienteMutations();

  const [surfaceTab, setSurfaceTab] = useState<SurfaceTab>('lista');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editorOrigin, setEditorOrigin] = useState<string>('unknown');
  
  const { trackEvent } = useAnalytics({ module: 'clientes' });
  const lastSearchKeyRef = useRef<string>('');

  const clientes = useMemo(() => clientesData?.rows ?? [], [clientesData]);
  const total = clientesData?.total ?? 0;
  const pageCount = clientesData?.pageCount ?? 1;

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
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (editingId === id) setEditingId(null);
        setDeleteTargetId(null);
        if (page > 1 && clientes.length === 1) {
          setPage(page - 1);
        }
      }
    });
  }

  async function exportarCsvAtual() {
    // Para exportar tudo filtrado, em um sistema real, teríamos uma query que busca tudo sem paginação.
    // Aqui usaremos os clientes da página atual como demonstração ou poderíamos disparar um fetch manual.
    const exportRows = clientes; 
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
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'clientes-modernos.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    toast.success('CSV exportado com sucesso!');
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
    onNewCliente?.();
  }

  function openEditCliente(clienteId: string, origin = 'row_menu') {
    setSurfaceTab('lista');
    setEditingId(clienteId);
    setEditorOrigin(origin);
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

            <button
              className="rf-btn-premium rf-btn-premium--primary rf-glow-cyan"
              data-testid="novo-btn"
              onClick={() => openNewCliente('header_button')}
            >
              Novo cliente
            </button>
          </div>
        }
      />

      <div hidden={surfaceTab !== 'lista'}>
        {!isErrorClientes ? (
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
                      onClick={exportarCsvAtual}
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
                loading={isLoadingClientes}
                onRetry={refetchClientes}
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
                    sortable: true,
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
            title={errorClientes instanceof Error ? errorClientes.message : 'Erro ao carregar clientes.'}
            compact
            onRetry={refetchClientes}
            data-testid="error-state"
          />
        )}
      </div>

      {surfaceTab === 'segmentos' && !editingId ? (
        <ClienteSegmentView
          // Aqui poderíamos criar uma query específica para agrupamento se necessário
          clientes={clientes} 
          loading={isLoadingClientes}
          onRetry={refetchClientes}
          onDetalhe={(clienteId) => openDetail(clienteId, 'resumo', 'segmentos')}
        />
      ) : null}

      <Drawer
        open={!!editingId && editingId !== 'new'}
        title="Editar cliente"
        onClose={() => setEditingId(null)}
        closeOnOverlayClick={!deleteMutation.isPending}
      >
        <ClienteForm
          initialCliente={editingCliente}
          analyticsOrigin={editorOrigin}
          onSaved={() => {
            setSurfaceTab('lista');
            setEditingId(null);
            refetchClientes();
          }}
          onCancel={() => setEditingId(null)}
        />
      </Drawer>

      <ClienteDeleteConfirmModal
        open={!!deleteTarget}
        target={deleteTarget}
        submitting={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleteTarget) handleExcluir(deleteTarget.id);
        }}
      />
    </main>
  );
}

function normalizeClienteProfileTab(value: unknown): ClienteProfileTab {
  if (value === 'pedidos' || value === 'financeiro' || value === 'notas' || value === 'cadastro') {
    return value;
  }
  if (value === 'abertas' || value === 'fechadas') return 'pedidos';
  if (value === 'fidelidade') return 'cadastro';
  return 'resumo';
}

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildActiveFilterKeys(seg?: string, status?: string): string {
  return [seg || '', status || ''].join('|');
}
