import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import type { Pedido } from '../../../../types/domain';
import {
  ActionMenu,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge
} from '../../../shared/ui';
import { usePedidoStore } from '../store/usePedidoStore';
import { ACAO_LABEL, NEXT_STATUS, normalizePedStatus, type PedidoTab } from '../types';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import { PedidoCancelConfirmModal } from './PedidoCancelConfirmModal';

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
  { value: 'data_asc', label: 'Mais antigos' }
];

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  orcamento: 'neutral',
  confirmado: 'info',
  em_separacao: 'warning',
  entregue: 'success',
  cancelado: 'danger'
};

const STATUS_LABEL: Record<string, string> = {
  orcamento: 'Orçamento',
  confirmado: 'Confirmado',
  em_separacao: 'Em separação',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

const PGTO_LABEL: Record<string, string> = {
  a_vista: 'À vista',
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cheque: 'Cheque'
};

function fmtCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getItemCount(itens: Pedido['itens']): number {
  if (Array.isArray(itens)) return itens.length;
  if (typeof itens === 'string') {
    try {
      return (JSON.parse(itens) as unknown[]).length;
    } catch {
      return 0;
    }
  }
  return 0;
}

type Props = {
  onNovoPedido: () => void;
  onDetalhe: (id: string) => void;
  onRetry?: () => void;
};

export function PedidoListView({ onNovoPedido, onDetalhe, onRetry }: Props) {
  const summary = usePedidoStore((s) => s.summary);
  const activeTab = usePedidoStore((s) => s.activeTab);
  const setActiveTab = usePedidoStore((s) => s.setActiveTab);
  const filtro = usePedidoStore((s) => s.filtro);
  const setFiltro = usePedidoStore((s) => s.setFiltro);
  const clearFiltro = usePedidoStore((s) => s.clearFiltro);
  const page = usePedidoStore((s) => s.page);
  const pageSize = usePedidoStore((s) => s.pageSize);
  const total = usePedidoStore((s) => s.total);
  const setPage = usePedidoStore((s) => s.setPage);
  const setPageSize = usePedidoStore((s) => s.setPageSize);
  const storeStatus = usePedidoStore((s) => s.status);
  const storeError = usePedidoStore((s) => s.error);
  const pedidos = usePedidoStore(useShallow((s) => s.pedidos));
  const { avancarStatus, cancelarPedido, reabrirPedido, inFlight } = usePedidoMutations();

  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const stats = summary;

  const tabCounts = useMemo(
    () => ({
      emaberto: summary.emAbertoCount,
      entregues: summary.entreguesCount,
      cancelados: summary.canceladosCount
    }),
    [summary.canceladosCount, summary.emAbertoCount, summary.entreguesCount]
  );

  const cancelTarget = useMemo(
    () => pedidos.find((pedido) => pedido.id === cancelTargetId) ?? null,
    [pedidos, cancelTargetId]
  );

  const hasAnyFilter = !!(filtro.q || filtro.status || filtro.pgto || filtro.periodo);

  function handleClearFilters() {
    clearFiltro();
  }

  return (
    <div className="screen-content" data-testid="pedido-list-view">
      <PageHeader
        title="Pedidos"
        description="Acompanhe os pedidos por etapa operacional, revise a carteira e abra detalhes sem sair da listagem."
        actions={
          <button
            className="btn btn-p btn-sm"
            onClick={onNovoPedido}
            data-testid="pedido-novo-btn"
          >
            + Novo pedido
          </button>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="info">{stats.emAbertoCount} em aberto</StatusBadge>
            <StatusBadge tone="success">{stats.entreguesCount} entregues</StatusBadge>
            <StatusBadge tone="danger">{stats.canceladosCount} cancelados</StatusBadge>
            <StatusBadge tone="neutral">{total} filtrados · página {page}</StatusBadge>
          </div>
        }
      />

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
      </div>

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

      <FilterBar
        search={{
          value: filtro.q,
          onChange: (value) => setFiltro({ q: value }),
          placeholder: 'N.º ou cliente...',
          ariaLabel: 'Buscar pedidos',
          testId: 'pedido-busca',
          className: 'inp ped-search'
        }}
        filters={[
          ...(activeTab === 'emaberto'
            ? [
                {
                  key: 'status',
                  value: filtro.status,
                  onChange: (value: string) => setFiltro({ status: value }),
                  options: STATUS_OPTIONS,
                  ariaLabel: 'Filtrar por status',
                  testId: 'pedido-filtro-status',
                  className: 'inp sel ped-filter-sel'
                }
              ]
            : []),
          {
            key: 'pagamento',
            value: filtro.pgto,
            onChange: (value: string) => setFiltro({ pgto: value }),
            options: PGTO_OPTIONS,
            ariaLabel: 'Filtrar por forma de pagamento',
            className: 'inp sel ped-filter-sel'
          },
          {
            key: 'periodo',
            value: filtro.periodo,
            onChange: (value: string) => setFiltro({ periodo: value }),
            options: PERIODO_OPTIONS,
            ariaLabel: 'Filtrar por período',
            className: 'inp sel ped-filter-sel'
          }
        ]}
        actions={
          <>
            <select
              className="inp sel ped-filter-sel"
              value={filtro.sort}
              onChange={(e) => setFiltro({ sort: e.target.value as 'data_desc' | 'data_asc' })}
              aria-label="Ordenar pedidos"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {hasAnyFilter ? (
              <button className="btn btn-sm" onClick={handleClearFilters}>
                Limpar filtros
              </button>
            ) : null}
          </>
        }
      />

      <DataTable
        className="pedidos-data-table"
        data={pedidos}
        rowKey={(pedido) => pedido.id}
        loading={storeStatus === 'loading' || storeStatus === 'idle'}
        error={storeStatus === 'error' ? storeError ?? 'Erro ao carregar pedidos.' : undefined}
        onRetry={onRetry}
        emptyTitle={hasAnyFilter ? 'Nenhum resultado encontrado.' : 'Sem pedidos nesta aba.'}
        emptyDescription={
          hasAnyFilter
            ? 'Nenhum pedido corresponde aos filtros ativos. Tente ajustar a busca ou limpar os filtros.'
            : activeTab === 'emaberto'
              ? 'Nenhum pedido em aberto. Crie um novo para começar.'
              : activeTab === 'entregues'
                ? 'Pedidos entregues aparecerão aqui.'
                : 'Pedidos cancelados aparecerão aqui.'
        }
        emptyAction={
          hasAnyFilter ? (
            <button className="btn btn-sm" onClick={handleClearFilters}>
              Limpar filtros
            </button>
          ) : activeTab === 'emaberto' ? (
            <button className="btn btn-sm btn-p" onClick={onNovoPedido}>
              + Novo pedido
            </button>
          ) : undefined
        }
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={(pedido) => onDetalhe(pedido.id)}
        columns={[
          {
            key: 'pedido',
            label: 'Pedido',
            render: (pedido) => {
              const pgtoLabel = pedido.pgto ? (PGTO_LABEL[pedido.pgto] ?? pedido.pgto) : null;
              return (
                <div className="rf-ui-stack" style={{ gap: 2 }}>
                  <span className="table-cell-strong">#{pedido.num}</span>
                  {pgtoLabel ? <span className="table-cell-caption table-cell-muted">{pgtoLabel}</span> : null}
                </div>
              );
            }
          },
          {
            key: 'cliente',
            label: 'Cliente',
            render: (pedido) => {
              const itemCount = getItemCount(pedido.itens);
              return (
                <div className="rf-ui-stack" style={{ gap: 2 }}>
                  <span className="table-cell-strong">{pedido.cli || '—'}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {pedido.tipo === 'atacado' ? <StatusBadge tone="info">Atacado</StatusBadge> : null}
                    {pedido.rca_nome ? (
                      <span className="table-cell-caption table-cell-muted">{pedido.rca_nome}</span>
                    ) : null}
                    {itemCount > 0 ? (
                      <span className="table-cell-caption table-cell-muted">
                        {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            }
          },
          {
            key: 'status',
            label: 'Status',
            render: (pedido) => {
              const status = normalizePedStatus(pedido.status);
              const badgeTone = STATUS_TONE[status] ?? 'neutral';
              const statusLabel = STATUS_LABEL[status] || status || '—';
              return <StatusBadge tone={badgeTone}>{statusLabel}</StatusBadge>;
            }
          },
          {
            key: 'data',
            label: 'Data',
            render: (pedido) => formatDate(pedido.data)
          },
          {
            key: 'valor',
            label: 'Valor',
            align: 'right',
            render: (pedido) => <span className="table-cell-strong">{fmtCurrency(pedido.total ?? 0)}</span>
          }
        ]}
        renderActions={(pedido) => {
          const status = normalizePedStatus(pedido.status);
          const nextStatus = NEXT_STATUS[status];
          const acaoLabel = ACAO_LABEL[status];
          const isTerminal = status === 'entregue' || status === 'cancelado';
          const isBusy = inFlight.has(pedido.id);

          return (
            <div className="flex items-center justify-end gap-2">
              {nextStatus && acaoLabel ? (
                <button
                  className="btn btn-p btn-sm"
                  disabled={isBusy}
                  onClick={(event) => {
                    event.stopPropagation();
                    void avancarStatus(pedido);
                  }}
                  data-testid={`pedido-acao-avancar-${pedido.id}`}
                >
                  {isBusy ? 'Aguarde…' : acaoLabel}
                </button>
              ) : null}
              <ActionMenu
                label="Ações do pedido"
                items={[
                  {
                    key: 'detalhes',
                    label: 'Ver detalhes',
                    onClick: () => onDetalhe(pedido.id)
                  },
                  ...(!isTerminal
                    ? [
                        {
                          key: 'cancelar',
                          label: 'Cancelar',
                          danger: true,
                          onClick: () => setCancelTargetId(pedido.id)
                        }
                      ]
                    : []),
                  ...(status === 'cancelado'
                    ? [
                        {
                          key: 'reabrir',
                          label: 'Reabrir',
                          onClick: () => void reabrirPedido(pedido)
                        }
                      ]
                    : [])
                ]}
                buttonTestId={`pedido-acao-menu-${pedido.id}`}
              />
            </div>
          );
        }}
      />

      <PedidoCancelConfirmModal
        open={!!cancelTarget}
        pedido={cancelTarget}
        submitting={cancelTarget ? inFlight.has(cancelTarget.id) : false}
        onClose={() => {
          if (!cancelTarget || !inFlight.has(cancelTarget.id)) setCancelTargetId(null);
        }}
        onConfirm={() => {
          if (!cancelTarget) return;
          void cancelarPedido(cancelTarget).then(() => setCancelTargetId(null));
        }}
      />
    </div>
  );
}
