import { useEffect, useMemo, useRef, useState } from 'react';

import type { Pedido } from '../../../../types/domain';
import {
  FilterBar,
  PageHeader,
  PillGroup,
  SegmentedControl,
  StatusBadge,
  Button
} from '../../../shared/ui';
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
import {
  type PedidoTab
} from '../types';
import { usePedidosQuery, usePedidosSummaryQuery, usePedidoMutations } from '../hooks/usePedidosQuery';
import { PedidoCancelConfirmModal } from './PedidoCancelConfirmModal';
import { PedidoEntregaConfirmModal } from './PedidoEntregaConfirmModal';
import { motion, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import { exportToCSV } from '../../../shared/lib/exportUtils';
import { useKeyboardShortcuts } from '../../../shared/hooks/useKeyboardShortcuts';
import { PedidoKpiGrid } from './PedidoKpiGrid';
import { PedidoTable } from './PedidoTable';

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

type Props = {
  onNovoPedido: () => void;
  onDetalhe: (id: string) => void;
  onRetry?: () => void;
  onSwitchToKanban?: () => void;
};

export function PedidoListView({ onNovoPedido, onDetalhe, onSwitchToKanban }: Props) {
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

  const handleExport = () => {
    if (!pedidos.length) {
      toast.warning('Nenhum pedido para exportar nesta página.');
      return;
    }
    exportToCSV(
      pedidos,
      [
        { key: 'id', label: 'ID' },
        { key: 'data', label: 'Data' },
        { key: (row: Pedido) => row.cli || '', label: 'Cliente' },
        { key: 'status', label: 'Status' },
        { key: 'total', label: 'Total' }
      ],
      'pedidos'
    );
    toast.success('Arquivo exportado com sucesso.');
  };

  useKeyboardShortcuts([
    {
      key: 'e',
      metaKey: true,
      preventDefault: true,
      handler: handleExport
    },
    {
      key: 'n',
      metaKey: true,
      preventDefault: true,
      handler: onNovoPedido
    }
  ]);

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
                variant="secondary"
                onClick={handleExport}
                title="Exportar Pedidos (Cmd+E)"
                className="!rounded-xl"
              >
                CSV
              </Button>
              <Button
                variant="primary"
                onClick={onNovoPedido}
                data-testid="novo-pedido"
                title="Novo Pedido (Cmd+N)"
              >
                <span className="hidden sm:inline">Novo pedido</span>
                <span className="sm:hidden">Novo</span>
              </Button>
              {onSwitchToKanban && (
                <SegmentedControl
                  options={[
                    { id: 'list', label: 'Lista' },
                    { id: 'kanban', label: 'Kanban' }
                  ]}
                  activeId="list"
                  onChange={(id) => { if (id === 'kanban') onSwitchToKanban(); }}
                />
              )}
            </div>
          }
        />

      {/* KPI Grid */}
      <PedidoKpiGrid summary={summary} total={total} />

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
      <PedidoTable
        pedidos={pedidos}
        loading={isLoadingPedidos || isLoadingSummary}
        error={isErrorPedidos ? (errorPedidos instanceof Error ? errorPedidos.message : 'Erro ao carregar pedidos.') : undefined}
        onRetry={refetchPedidos}
        hasAnyFilter={hasAnyFilter}
        activeTab={activeTab}
        onNovoPedido={onNovoPedido}
        onDetalhe={onDetalhe}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onCancelPedido={(id) => setCancelTargetId(id)}
        onEntregaPedido={(id) => setEntregaTargetId(id)}
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
