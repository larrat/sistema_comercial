import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { selectPedidosForTab, usePedidoStore } from '../store/usePedidoStore';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import { PedidoRow } from './PedidoRow';
import type { Pedido } from '../../../../types/domain';
import { TAB_STATUSES, normalizePedStatus, type PedidoTab } from '../types';

const EXIT_DURATION = 400;

const TABS: { id: PedidoTab; label: string }[] = [
  { id: 'emaberto', label: 'Em Aberto' },
  { id: 'entregues', label: 'Entregues' },
  { id: 'cancelados', label: 'Cancelados' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'Status' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'em_separacao', label: 'Em separação' }
];

const PGTO_OPTIONS = [
  { value: '', label: 'Pagamento' },
  { value: 'a_vista', label: 'À vista' },
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'cheque', label: 'Cheque' }
];

const PERIODO_OPTIONS = [
  { value: '', label: 'Período' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Últimos 7 dias' },
  { value: 'mes', label: 'Últimos 30 dias' }
];

const SORT_OPTIONS = [
  { value: 'data_desc', label: 'Mais recentes' },
  { value: 'data_asc', label: 'Mais antigos' },
  { value: 'valor_desc', label: 'Maior valor' },
  { value: 'valor_asc', label: 'Menor valor' },
  { value: 'cli_asc', label: 'Cliente A–Z' }
];

function isInPeriodo(pedidoData: string | undefined, periodo: string): boolean {
  if (!periodo || !pedidoData) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ped = new Date(pedidoData + 'T00:00:00');
  if (periodo === 'hoje') return pedidoData === today.toISOString().split('T')[0];
  if (periodo === 'semana') {
    const limit = new Date(today);
    limit.setDate(today.getDate() - 7);
    return ped >= limit;
  }
  if (periodo === 'mes') {
    const limit = new Date(today);
    limit.setDate(today.getDate() - 30);
    return ped >= limit;
  }
  return true;
}

function sortPedidos(list: Pedido[], sort: string): Pedido[] {
  const sorted = [...list];
  switch (sort) {
    case 'data_asc':
      return sorted.sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''));
    case 'valor_desc':
      return sorted.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
    case 'valor_asc':
      return sorted.sort((a, b) => (a.total ?? 0) - (b.total ?? 0));
    case 'cli_asc':
      return sorted.sort((a, b) => (a.cli ?? '').localeCompare(b.cli ?? ''));
    default:
      return sorted.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
  }
}

function fmtCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Props = {
  onNovoPedido: () => void;
  onDetalhe: (id: string) => void;
};

export function PedidoListView({ onNovoPedido, onDetalhe }: Props) {
  const allPedidos = usePedidoStore(useShallow((s) => s.pedidos));
  const activeTab = usePedidoStore((s) => s.activeTab);
  const setActiveTab = usePedidoStore((s) => s.setActiveTab);
  const filtro = usePedidoStore((s) => s.filtro);
  const setFiltro = usePedidoStore((s) => s.setFiltro);
  const clearFiltro = usePedidoStore((s) => s.clearFiltro);
  const storeStatus = usePedidoStore((s) => s.status);
  const storeError = usePedidoStore((s) => s.error);
  const basePedidos = usePedidoStore(useShallow(selectPedidosForTab));
  const { avancarStatus, cancelarPedido, reabrirPedido, inFlight } = usePedidoMutations();

  const [sortBy, setSortBy] = useState('data_desc');
  const [filterPgto, setFilterPgto] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('');

  const snapshotRef = useRef<Map<string, Pedido>>(new Map());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  // Apply local filters + sort on top of store-filtered list
  const pedidos = useMemo(() => {
    let list = basePedidos;
    if (filterPgto) list = list.filter((p) => p.pgto === filterPgto);
    if (filterPeriodo) list = list.filter((p) => isInPeriodo(p.data, filterPeriodo));
    return sortPedidos(list, sortBy);
  }, [basePedidos, filterPgto, filterPeriodo, sortBy]);

  // Stats from all pedidos (no active filter applied)
  const stats = useMemo(() => {
    const emAberto = allPedidos.filter((p) =>
      TAB_STATUSES.emaberto.includes(normalizePedStatus(p.status))
    );
    return {
      emAbertoCount: emAberto.length,
      valorEmAberto: emAberto.reduce((s, p) => s + (p.total ?? 0), 0),
      entreguesCount: allPedidos.filter((p) =>
        TAB_STATUSES.entregues.includes(normalizePedStatus(p.status))
      ).length,
      canceladosCount: allPedidos.filter((p) =>
        TAB_STATUSES.cancelados.includes(normalizePedStatus(p.status))
      ).length
    };
  }, [allPedidos]);

  // Tab counts (total per tab, ignoring any active filter)
  const tabCounts = useMemo(
    () => ({
      emaberto: allPedidos.filter((p) =>
        TAB_STATUSES.emaberto.includes(normalizePedStatus(p.status))
      ).length,
      entregues: allPedidos.filter((p) =>
        TAB_STATUSES.entregues.includes(normalizePedStatus(p.status))
      ).length,
      cancelados: allPedidos.filter((p) =>
        TAB_STATUSES.cancelados.includes(normalizePedStatus(p.status))
      ).length
    }),
    [allPedidos]
  );

  // Reset local filters on tab change
  useEffect(() => {
    setFilterPgto('');
    setFilterPeriodo('');
  }, [activeTab]);

  // Exit animation
  useEffect(() => {
    pedidos.forEach((p) => snapshotRef.current.set(p.id, p));
    const currentIds = new Set(pedidos.map((p) => p.id));
    const removed = [...prevIdsRef.current].filter((id) => !currentIds.has(id));
    if (removed.length > 0) {
      setExitingIds((prev) => new Set([...prev, ...removed]));
      setTimeout(() => {
        setExitingIds((prev) => {
          const next = new Set(prev);
          removed.forEach((id) => {
            next.delete(id);
            snapshotRef.current.delete(id);
          });
          return next;
        });
      }, EXIT_DURATION);
    }
    prevIdsRef.current = currentIds;
  }, [pedidos]);

  const hasLocalFilters = filterPgto !== '' || filterPeriodo !== '';
  const hasAnyFilter = !!(filtro.q || filtro.status || hasLocalFilters);

  function handleClearFilters() {
    clearFiltro();
    setFilterPgto('');
    setFilterPeriodo('');
  }

  const isListVisible = storeStatus === 'ready' && (pedidos.length > 0 || exitingIds.size > 0);
  const isEmptyVisible =
    storeStatus === 'ready' && pedidos.length === 0 && exitingIds.size === 0;

  return (
    <div className="screen-content" data-testid="pedido-list-view">
      {/* Stats bar */}
      <div className="ped-stats-bar">
        <div className="ped-stat">
          <span className="ped-stat-value">{stats.emAbertoCount}</span>
          <span className="ped-stat-label">Em aberto</span>
        </div>
        <div className="ped-stat-divider" />
        <div className="ped-stat">
          <span className="ped-stat-value">{fmtCurrency(stats.valorEmAberto)}</span>
          <span className="ped-stat-label">Valor em aberto</span>
        </div>
        <div className="ped-stat-divider" />
        <div className="ped-stat">
          <span className="ped-stat-value">{stats.entreguesCount}</span>
          <span className="ped-stat-label">Entregues</span>
        </div>
        <div className="ped-stat-divider" />
        <div className="ped-stat">
          <span className="ped-stat-value">{stats.canceladosCount}</span>
          <span className="ped-stat-label">Cancelados</span>
        </div>
        <div className="ped-stats-spacer" />
        <button
          className="btn btn-p btn-sm"
          onClick={onNovoPedido}
          data-testid="pedido-novo-btn"
        >
          + Novo pedido
        </button>
      </div>

      {/* Tabs with counts */}
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tb${activeTab === tab.id ? ' on' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="tab-count">{tabCounts[tab.id]}</span>
          </button>
        ))}
      </div>

      <div className="card card-shell">
        {/* Toolbar */}
        <div className="ped-toolbar">
          <div className="ped-toolbar-filters">
            <input
              className="inp ped-search"
              placeholder="N.º ou cliente..."
              value={filtro.q}
              onChange={(e) => setFiltro({ q: e.target.value })}
              data-testid="pedido-busca"
            />
            <select
              className="inp sel ped-filter-sel"
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
              aria-label="Filtrar por período"
            >
              {PERIODO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {activeTab === 'emaberto' && (
              <select
                className="inp sel ped-filter-sel"
                value={filtro.status}
                onChange={(e) => setFiltro({ status: e.target.value })}
                data-testid="pedido-filtro-status"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            <select
              className="inp sel ped-filter-sel"
              value={filterPgto}
              onChange={(e) => setFilterPgto(e.target.value)}
              aria-label="Filtrar por forma de pagamento"
            >
              {PGTO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {hasAnyFilter && (
              <button className="btn btn-sm" onClick={handleClearFilters}>
                Limpar filtros
              </button>
            )}
          </div>
          <div className="ped-toolbar-end">
            <select
              className="inp sel ped-filter-sel"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Ordenar pedidos"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Column headers */}
        {isListVisible && (
          <div className="ped-list-header" aria-hidden="true">
            <div className="ped-list-header-col">Pedido</div>
            <div className="ped-list-header-col">Cliente</div>
            <div className="ped-list-header-col">Status</div>
            <div className="ped-list-header-col">Data</div>
            <div className="ped-list-header-col align-right">Valor</div>
            <div className="ped-list-header-col align-right">Ações</div>
          </div>
        )}

        {/* Loading */}
        {(storeStatus === 'loading' || storeStatus === 'idle') && (
          <div className="ped-empty" data-testid="pedido-loading">
            <div className="ped-empty-title">Carregando pedidos...</div>
          </div>
        )}

        {/* Error */}
        {storeStatus === 'error' && (
          <div className="ped-empty" data-testid="pedido-error">
            <div className="ped-empty-title">Erro ao carregar</div>
            <div className="ped-empty-sub">{storeError}</div>
          </div>
        )}

        {/* Empty state */}
        {isEmptyVisible && (
          <div className="ped-empty" data-testid="pedido-empty">
            <div className="ped-empty-icon">📋</div>
            <div className="ped-empty-title">
              {hasAnyFilter ? 'Nenhum resultado encontrado' : 'Sem pedidos nesta aba'}
            </div>
            <div className="ped-empty-sub">
              {hasAnyFilter
                ? 'Nenhum pedido corresponde aos filtros ativos. Tente ajustar a busca ou limpar os filtros.'
                : activeTab === 'emaberto'
                  ? 'Nenhum pedido em aberto. Crie um novo para começar.'
                  : activeTab === 'entregues'
                    ? 'Pedidos entregues aparecerão aqui.'
                    : 'Pedidos cancelados aparecerão aqui.'}
            </div>
            <div className="ped-empty-actions">
              {hasAnyFilter && (
                <button className="btn btn-sm" onClick={handleClearFilters}>
                  Limpar filtros
                </button>
              )}
              {!hasAnyFilter && activeTab === 'emaberto' && (
                <button className="btn btn-sm btn-p" onClick={onNovoPedido}>
                  + Novo pedido
                </button>
              )}
            </div>
          </div>
        )}

        {/* List */}
        {isListVisible && (
          <div className="list" data-testid="pedido-list">
            {pedidos.map((pedido) => (
              <PedidoRow
                key={pedido.id}
                pedido={pedido}
                inFlight={inFlight.has(pedido.id)}
                onAvancar={() => void avancarStatus(pedido)}
                onCancelar={() => void cancelarPedido(pedido)}
                onReabrir={() => void reabrirPedido(pedido)}
                onDetalhe={onDetalhe}
              />
            ))}
            {[...exitingIds].map((id) => {
              const pedido = snapshotRef.current.get(id);
              if (!pedido) return null;
              return (
                <div key={id} className="list-row--exiting">
                  <PedidoRow
                    pedido={pedido}
                    inFlight={false}
                    onAvancar={() => undefined}
                    onCancelar={() => undefined}
                    onReabrir={() => undefined}
                    onDetalhe={() => undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
