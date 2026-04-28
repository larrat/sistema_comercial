import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useShallow } from 'zustand/shallow';

import {
  Drawer,
  EmptyState,
  FilterBar,
  PageHeader,
  StatusBadge
} from '../../../shared/ui';
import type { StatusBadgeTone } from '../../../shared/ui';
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

const STATUS_BADGE: Record<string, { label: string; tone: StatusBadgeTone }> = {
  ativo: { label: 'Ativo', tone: 'success' },
  inativo: { label: 'Inativo', tone: 'neutral' },
  prospecto: { label: 'Prospecto', tone: 'info' }
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!openMenuId) return;
    function handleClose() {
      setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, [openMenuId]);

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
    <main className="rf-content rf-ui-stack" data-testid="clientes-pilot-page">
      <PageHeader
        title="Clientes"
        description="Cadastre e gerencie seus clientes."
        actions={
          <button
            className="btn btn-p btn-sm"
            type="button"
            data-testid="novo-btn"
            onClick={() => {
              setSurfaceTab('lista');
              setDetailId(null);
              setEditingId('new');
              setDetailTab('resumo');
            }}
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
            <FilterBar
              actions={
                <>
                  {temFiltro && (
                    <button
                      className="btn btn-sm"
                      type="button"
                      onClick={clearFiltro}
                      data-testid="limpar-filtro"
                    >
                      Limpar filtros
                    </button>
                  )}
                  <button
                    className="btn btn-sm"
                    type="button"
                    onClick={exportarCsvAtual}
                    data-testid="export-btn"
                  >
                    Exportar CSV
                  </button>
                </>
              }
            >
              <input
                className="inp"
                type="search"
                placeholder="Buscar..."
                value={filtro.q ?? ''}
                onChange={(e) => setFiltro({ q: e.target.value })}
                aria-label="Buscar clientes"
                data-testid="busca-input"
              />
              <select
                className="inp"
                value={filtro.seg ?? ''}
                onChange={(e) => setFiltro({ seg: e.target.value })}
                aria-label="Filtrar por segmento"
                data-testid="seg-select"
              >
                <option value="">Todos os segmentos</option>
                {segmentos.map((seg) => (
                  <option key={seg} value={seg}>
                    {seg}
                  </option>
                ))}
              </select>
              <select
                className="inp"
                value={filtro.status ?? ''}
                onChange={(e) => setFiltro({ status: e.target.value })}
                aria-label="Filtrar por status"
                data-testid="status-select"
              >
                <option value="">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="prospecto">Prospecto</option>
              </select>
            </FilterBar>

            {filteredClientes.length === 0 && (
              <EmptyState
                title={
                  clientes.length > 0
                    ? 'Nenhum cliente encontrado com os filtros atuais.'
                    : 'Nenhum cliente encontrado.'
                }
                action={
                  clientes.length === 0 ? (
                    <button
                      className="btn btn-p btn-sm"
                      type="button"
                      onClick={() => {
                        setSurfaceTab('lista');
                        setDetailId(null);
                        setEditingId('new');
                        setDetailTab('resumo');
                      }}
                    >
                      + Novo cliente
                    </button>
                  ) : undefined
                }
                data-testid="empty-state"
              />
            )}

            {filteredClientes.length > 0 && (
              <div className="cli-list" data-testid="cliente-list">
                <div className="cli-list__head" aria-hidden="true">
                  <span>Nome</span>
                  <span>Status</span>
                  <span>WhatsApp</span>
                  <span>Segmento</span>
                  <span>Tags</span>
                  <span />
                </div>

                {filteredClientes.map((cliente) => {
                  const badge = STATUS_BADGE[cliente.status ?? ''];
                  const menuOpen = openMenuId === cliente.id;
                  const whatsapp = cliente.whatsapp || cliente.tel || '—';

                  return (
                    <div
                      key={cliente.id}
                      className="cli-row cli-row--clickable"
                      data-testid="cliente-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetail(cliente.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') openDetail(cliente.id);
                      }}
                    >
                      <div className="cli-row__name">
                        <span className="cli-row__title">{cliente.nome}</span>
                        {cliente.apelido && (
                          <span className="cli-row__sub">{cliente.apelido}</span>
                        )}
                      </div>

                      <div>
                        {badge && (
                          <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                        )}
                      </div>

                      <div className="cli-row__contact">
                        <span className="cli-row__contact-val">{whatsapp}</span>
                      </div>

                      <div className="cli-row__seg">
                        <span>{cliente.seg || '—'}</span>
                      </div>

                      <div className="cli-row__seg">
                        {cliente.optin_marketing && (
                          <StatusBadge tone="success">MKT</StatusBadge>
                        )}
                      </div>

                      <div
                        className="cli-row__actions"
                        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                        onMouseDown={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                      >
                        <button
                          className="cli-row__menu-btn"
                          type="button"
                          data-testid="cli-menu-btn"
                          aria-label="Ações do cliente"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(menuOpen ? null : cliente.id);
                          }}
                        >
                          ⋯
                        </button>
                        {menuOpen && (
                          <div className="cli-row__menu" role="menu">
                            <button
                              className="cli-row__menu-item"
                              type="button"
                              onClick={() => {
                                openDetail(cliente.id);
                                setOpenMenuId(null);
                              }}
                            >
                              Ver detalhes
                            </button>
                            <button
                              className="cli-row__menu-item"
                              type="button"
                              onClick={() => {
                                setSurfaceTab('lista');
                                setDetailId(null);
                                setEditingId(cliente.id);
                                setOpenMenuId(null);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="cli-row__menu-item cli-row__menu-item--danger"
                              type="button"
                              onClick={() => {
                                void handleExcluir(cliente.id);
                                setOpenMenuId(null);
                              }}
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
