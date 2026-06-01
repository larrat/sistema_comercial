import { useMemo, ViewTransition } from 'react';
import type { Pedido } from '../../../../types/domain';
import {
  ActionMenu,
  DataTable,
  StatusBadge,
  Button
} from '../../../shared/ui';
import {
  ACAO_LABEL,
  NEXT_STATUS,
  PEDIDO_STATUS_LABEL,
  PEDIDO_STATUS_TONE,
  normalizePedStatus,
  type PedidoTab
} from '../types';
import { usePedidoMutations } from '../hooks/usePedidosQuery';

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

interface PedidoTableProps {
  pedidos: Pedido[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  hasAnyFilter: boolean;
  activeTab: PedidoTab;
  onNovoPedido: () => void;
  onDetalhe: (id: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onCancelPedido: (id: string) => void;
  onEntregaPedido: (id: string) => void;
}

export function PedidoTable({
  pedidos,
  loading,
  error,
  onRetry,
  hasAnyFilter,
  activeTab,
  onNovoPedido,
  onDetalhe,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  onCancelPedido,
  onEntregaPedido
}: PedidoTableProps) {
  const { updateStatus, confirmarEntrega } = usePedidoMutations();

  return (
    <DataTable
      className="pedidos-data-table"
      data={pedidos}
      rowKey={(pedido) => pedido.id}
      loading={loading}
      error={error}
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
          <Button onClick={onRetry}>
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
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={(pedido) => onDetalhe(pedido.id)}
      columns={[
        {
          key: 'pedido',
          label: 'Pedido',
          render: (pedido) => {
            const pgtoLabel = pedido.pgto ? (PGTO_LABEL[pedido.pgto] ?? pedido.pgto) : null;
            return (
              <ViewTransition name={`pedido-hero-${pedido.id}`} share="morph">
                <div className="rf-ui-stack" style={{ gap: 2 }}>
                  <span className="table-cell-strong">#{pedido.num}</span>
                  {pgtoLabel ? (
                    <span className="table-cell-caption table-cell-muted">{pgtoLabel}</span>
                  ) : null}
                </div>
              </ViewTransition>
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
                    onEntregaPedido(pedido.id);
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
                        onClick: () => onCancelPedido(pedido.id)
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
  );
}
