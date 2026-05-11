import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import type { Pedido } from '../../../../types/domain';
import {
  ActionMenu,
  DataTable,
  FilterBar,
  PageHeader,
  StatCard,
  StatusBadge
} from '../../../shared/ui';
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
import {
  ACAO_LABEL,
  NEXT_STATUS,
  PEDIDO_STATUS_LABEL,
  PEDIDO_STATUS_TONE,
  normalizePedStatus,
  type PedidoTab
} from '../types';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import { PedidoCancelConfirmModal } from './PedidoCancelConfirmModal';
import { PedidoEntregaConfirmModal } from './PedidoEntregaConfirmModal';

const TABS: { id: PedidoTab; label: string }[] = [
  { id: 'emaberto', label: 'Em Aberto' },
  { id: 'entregues', label: 'Concluídos' },
  { id: 'cancelados', label: 'Cancelados' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'Status' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'em_separacao', label: 'Em separação' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'entregue_aguardando_pagamento', label: 'Entregue · aguardando pagamento' },
  { value: 'pago_aguardando_entrega', label: 'Pago · aguardando entrega' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' }
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
  const { avancarStatus, confirmarEntrega, cancelarPedido, reabrirPedido, inFlight } =
    usePedidoMutations();
  const { trackEvent } = useAnalytics({ module: 'pedidos' });

  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [entregaTargetId, setEntregaTargetId] = useState<string | null>(null);
  const lastFilterKeyRef = useRef<string>('');

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
  const entregaTarget = useMemo(
    () => pedidos.find((pedido) => pedido.id === entregaTargetId) ?? null,
    [pedidos, entregaTargetId]
  );

  const hasAnyFilter = !!(filtro.q || filtro.status || filtro.pgto || filtro.periodo);
  const activeFilterCount = [filtro.q, filtro.status, filtro.pgto, filtro.periodo].filter(
    Boolean
  ).length;

  function handleClearFilters() {
    clearFiltro();
  }

  useEffect(() => {
    const activeFilters = [
      ...(filtro.q ? ['busca'] : []),
      ...(filtro.status ? ['status'] : []),
      ...(filtro.pgto ? ['pagamento'] : []),
      ...(filtro.periodo ? ['periodo'] : []),
      ...(filtro.sort && filtro.sort !== 'data_desc' ? ['ordenacao'] : [])
    ];

    if (!activeFilters.length) {
      lastFilterKeyRef.current = '';
      return;
    }

    const filterKey = [
      activeTab,
      filtro.q || '',
      filtro.status || '',
      filtro.pgto || '',
      filtro.periodo || '',
      filtro.sort || ''
    ].join('|');

    if (filterKey === lastFilterKeyRef.current) return;

    const timeoutId = window.setTimeout(() => {
      trackEvent('filtro_aplicado', {
        metadata: {
          origin: 'pedido_list',
          active_tab: activeTab,
          filters_active: activeFilters,
          filters_count: activeFilters.length,
          term_length: filtro.q ? String(filtro.q).trim().length : 0
        },
        result: 'success'
      });
      lastFilterKeyRef.current = filterKey;
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, filtro.pgto, filtro.periodo, filtro.q, filtro.sort, filtro.status, trackEvent]);

  return (
    <div className="flex flex-col gap-6" data-testid="pedido-list-view">
      <PageHeader
        kicker="Comercial"
        title="Pedidos"
        description="Acompanhe os pedidos por etapa operacional, revise a carteira e abra detalhes sem sair da listagem."
        actions={
          <button className="btn btn-p btn-sm" onClick={onNovoPedido} data-testid="pedido-novo-btn">
            Novo pedido
          </button>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="info">
              {TABS.find((tab) => tab.id === activeTab)?.label ?? 'Pedidos'}
            </StatusBadge>
            <StatusBadge tone="neutral">
              {total} filtrados · página {page}
            </StatusBadge>
          </div>
        }
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Resumo de pedidos">
        <StatCard
          label="Pedidos"
          value={stats.total}
          description={`${total} resultado(s) no filtro atual`}
        />
        <StatCard
          label="Em aberto"
          value={stats.emAbertoCount}
          description={fmtCurrency(stats.valorEmAberto)}
          tone={stats.emAbertoCount > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Concluídos" value={stats.entreguesCount} tone="success" />
        <StatCard label="Cancelados" value={stats.canceladosCount} tone="danger" />
      </section>

      <div className="inline-flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 shadow-inner w-full md:w-auto self-start overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`
                relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap
                ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/50 text-slate-500'
                }`}
              >
                {tabCounts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      <FilterBar
        className="pedidos-filter-bar"
        search={{
          value: filtro.q,
          onChange: (value) => setFiltro({ q: value }),
          placeholder: 'N.º ou cliente...',
          ariaLabel: 'Buscar pedidos',
          testId: 'pedido-busca'
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
                  testId: 'pedido-filtro-status'
                }
              ]
            : []),
          {
            key: 'pagamento',
            value: filtro.pgto,
            onChange: (value: string) => setFiltro({ pgto: value }),
            options: PGTO_OPTIONS,
            ariaLabel: 'Filtrar por forma de pagamento'
          },
          {
            key: 'periodo',
            value: filtro.periodo,
            onChange: (value: string) => setFiltro({ periodo: value }),
            options: PERIODO_OPTIONS,
            ariaLabel: 'Filtrar por período'
          }
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={hasAnyFilter ? handleClearFilters : undefined}
        actions={
          <div className="pedidos-filter-bar__sort">
            <select
              className="inp sel"
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
          </div>
        }
      />

      <DataTable
        className="pedidos-data-table"
        data={pedidos}
        rowKey={(pedido) => pedido.id}
        loading={storeStatus === 'loading' || storeStatus === 'idle'}
        error={storeStatus === 'error' ? (storeError ?? 'Erro ao carregar pedidos.') : undefined}
        onRetry={onRetry}
        emptyTitle={hasAnyFilter ? 'Nenhum resultado encontrado.' : 'Sem pedidos nesta aba.'}
        emptyDescription={
          hasAnyFilter
            ? 'Nenhum pedido corresponde aos filtros ativos. Tente ajustar a busca ou limpar os filtros.'
            : activeTab === 'emaberto'
              ? 'Nenhum pedido em aberto. Crie um novo para começar.'
              : activeTab === 'entregues'
                ? 'Pedidos concluídos aparecerão aqui.'
                : 'Pedidos cancelados aparecerão aqui.'
        }
        emptyAction={
          hasAnyFilter ? (
            <button className="btn btn-sm" onClick={handleClearFilters}>
              Limpar filtros
            </button>
          ) : activeTab === 'emaberto' ? (
            <button className="btn btn-sm btn-p" onClick={onNovoPedido}>
              Novo pedido
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
                  {pgtoLabel ? (
                    <span className="table-cell-caption table-cell-muted">{pgtoLabel}</span>
                  ) : null}
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
                    {pedido.tipo === 'atacado' ? (
                      <StatusBadge tone="info">Atacado</StatusBadge>
                    ) : null}
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
              const badgeTone = PEDIDO_STATUS_TONE[status] ?? 'neutral';
              const statusLabel = PEDIDO_STATUS_LABEL[status] || status || '—';
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
            render: (pedido) => (
              <span className="table-cell-strong">{fmtCurrency(pedido.total ?? 0)}</span>
            )
          }
        ]}
        renderActions={(pedido) => {
          const status = normalizePedStatus(pedido.status);
          const nextStatus = NEXT_STATUS[status];
          const acaoLabel = ACAO_LABEL[status];
          const isDeliveryAction =
            nextStatus === 'entregue_aguardando_pagamento' || nextStatus === 'concluido';
          const isTerminal = status === 'concluido' || status === 'cancelado';
          const isBusy = inFlight.has(pedido.id);

          return (
            <div className="flex items-center justify-end gap-2">
              {nextStatus && acaoLabel ? (
                <button
                  className="btn btn-p btn-sm"
                  disabled={isBusy}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isDeliveryAction) {
                      setEntregaTargetId(pedido.id);
                      return;
                    }
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
      <PedidoEntregaConfirmModal
        open={!!entregaTarget}
        pedido={entregaTarget}
        submitting={entregaTarget ? inFlight.has(entregaTarget.id) : false}
        onClose={() => {
          if (!entregaTarget || !inFlight.has(entregaTarget.id)) setEntregaTargetId(null);
        }}
        onConfirm={() => {
          if (!entregaTarget) return;
          void confirmarEntrega(entregaTarget).then(() => setEntregaTargetId(null));
        }}
      />
    </div>
  );
}
