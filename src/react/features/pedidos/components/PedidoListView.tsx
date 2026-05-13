import { useEffect, useMemo, useRef, useState } from 'react';

import type { Pedido } from '../../../../types/domain';
import {
  ActionMenu,
  DataTable,
  FilterBar,
  PageHeader,
  PillGroup,
  StatusBadge,
  Button
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
import { usePedidosQuery, usePedidosSummaryQuery, usePedidoMutations } from '../hooks/usePedidosQuery';
import { PedidoCancelConfirmModal } from './PedidoCancelConfirmModal';
import { PedidoEntregaConfirmModal } from './PedidoEntregaConfirmModal';
import { motion, type Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
};

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

export function PedidoListView({ onNovoPedido, onDetalhe }: Props) {
  const activeTab = usePedidoStore((s) => s.activeTab);
  const setActiveTab = usePedidoStore((s) => s.setActiveTab);
  const filtro = usePedidoStore((s) => s.filtro);
  const setFiltro = usePedidoStore((s) => s.setFiltro);
  const clearFiltro = usePedidoStore((s) => s.clearFiltro);
  const page = usePedidoStore((s) => s.page);
  const pageSize = usePedidoStore((s) => s.pageSize);
  const setPage = usePedidoStore((s) => s.setPage);
  const setPageSize = usePedidoStore((s) => s.setPageSize);
  
  // Queries
  const { data: summaryData, isLoading: isLoadingSummary } = usePedidosSummaryQuery();
  const { data: pedidosPage, isLoading: isLoadingPedidos, isError: isErrorPedidos, error: errorPedidos, refetch: refetchPedidos } = usePedidosQuery(
    { ...filtro, tab: activeTab },
    page,
    pageSize
  );

  const { updateStatus, confirmarEntrega } = usePedidoMutations();
  const { trackEvent } = useAnalytics({ module: 'pedidos' });

  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [entregaTargetId, setEntregaTargetId] = useState<string | null>(null);
  const lastFilterKeyRef = useRef<string>('');

  const summary = summaryData || {
    total: 0,
    emAbertoCount: 0,
    valorEmAberto: 0,
    entreguesCount: 0,
    canceladosCount: 0
  };

  const pedidos = pedidosPage?.rows || [];
  const total = pedidosPage?.total || 0;

  const tabCounts = useMemo(
    () => ({
      emaberto: summary.emAbertoCount,
      entregues: summary.entreguesCount,
      cancelados: summary.canceladosCount
    }),
    [summary]
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
        kicker="Vendas"
        title="Pedidos"
        description="Acompanhe e gerencie a carteira de vendas da filial com visão completa de status e fluxo."
        meta={
          <StatusBadge tone="info">
            {total} no total · página {page}
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-6">
            <PillGroup
              options={TABS.map(t => ({
                id: t.id,
                label: `${t.label} (${tabCounts[t.id]})`
              }))}
              activeId={activeTab}
              onChange={setActiveTab}
            />

            <div className="h-8 w-px bg-white/10 mx-1" />

            <Button
              variant="primary"
              onClick={onNovoPedido}
              data-testid="pedido-novo-btn"
            >
              Novo pedido
            </Button>
          </div>
        }
      />

      {/* KPI Grid */}
      <motion.section 
        className="rf-kpi-grid mb-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.article className="rf-kpi-card" variants={itemVariants}>
          <span className="rf-kpi-label">Total em pedidos</span>
          <span className="rf-kpi-value">{summary.total}</span>
          <span className="rf-kpi-sub muted">{total} filtrados no período</span>
        </motion.article>
        <motion.article className="rf-kpi-card" variants={itemVariants}>
          <span className="rf-kpi-label">Aguardando</span>
          <span className={`rf-kpi-value ${summary.emAbertoCount > 0 ? '!text-amber-400' : '!text-emerald-400'}`}>
            {summary.emAbertoCount}
          </span>
          <span className={`rf-kpi-sub ${summary.emAbertoCount > 0 ? 'warning' : 'success'}`}>
            {fmtCurrency(summary.valorEmAberto)} em aberto
          </span>
        </motion.article>
        <motion.article className="rf-kpi-card" variants={itemVariants}>
          <span className="rf-kpi-label">Concluídos</span>
          <span className="rf-kpi-value !text-emerald-400">{summary.entreguesCount}</span>
          <span className="rf-kpi-sub success">Operação saudável</span>
        </motion.article>
        <motion.article className="rf-kpi-card" variants={itemVariants}>
          <span className="rf-kpi-label">Cancelados</span>
          <span className="rf-kpi-value !text-rose-400">{summary.canceladosCount}</span>
          <span className="rf-kpi-sub muted">Taxa de rejeição</span>
        </motion.article>
      </motion.section>

      {/* Control Center: Filters */}
      <div className="bg-slate-900 border border-white/5 rounded-xl p-4 shadow-sm flex flex-col gap-4">
        <FilterBar
          className="pedidos-filter-bar !border-none !p-0 !bg-transparent"
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
              className="rf-input-premium !py-1.5 !text-xs"
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
    </div>

    <motion.div variants={itemVariants}>
      <DataTable
        className="pedidos-data-table"
        data={pedidos}
        rowKey={(pedido) => pedido.id}
        loading={isLoadingPedidos || isLoadingSummary}
        error={isErrorPedidos ? (errorPedidos instanceof Error ? errorPedidos.message : 'Erro ao carregar pedidos.') : undefined}
        onRetry={refetchPedidos}
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
            <Button onClick={handleClearFilters}>
              Limpar filtros
            </Button>
          ) : activeTab === 'emaberto' ? (
            <Button variant="primary" onClick={onNovoPedido}>
              Novo pedido
            </Button>
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
          const isBusy = updateStatus.isPending || confirmarEntrega.isPending;

          return (
            <div className="flex items-center justify-end gap-2">
              {nextStatus && acaoLabel ? (
                <Button
                  variant="primary"
                  size="sm"
                  loading={isBusy}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isDeliveryAction) {
                      setEntregaTargetId(pedido.id);
                      return;
                    }
                    updateStatus.mutate({ id: pedido.id, status: nextStatus });
                  }}
                  data-testid={`pedido-acao-avancar-${pedido.id}`}
                >
                  {acaoLabel}
                </Button>
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
                          onClick: () => updateStatus.mutate({ id: pedido.id, status: 'orcamento' })
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
    </motion.div>

      <PedidoCancelConfirmModal
        open={!!cancelTarget}
        pedido={cancelTarget}
        submitting={updateStatus.isPending}
        onClose={() => {
          if (!updateStatus.isPending) setCancelTargetId(null);
        }}
        onConfirm={() => {
          if (!cancelTarget) return;
          updateStatus.mutate({ id: cancelTarget.id, status: 'cancelado' }, {
            onSuccess: () => setCancelTargetId(null)
          });
        }}
      />
      <PedidoEntregaConfirmModal
        open={!!entregaTarget}
        pedido={entregaTarget}
        submitting={confirmarEntrega.isPending}
        onClose={() => {
          if (!confirmarEntrega.isPending) setEntregaTargetId(null);
        }}
        onConfirm={() => {
          if (!entregaTarget) return;
          confirmarEntrega.mutate(entregaTarget.id, {
            onSuccess: () => setEntregaTargetId(null)
          });
        }}
      />
    </div>
  );
}
