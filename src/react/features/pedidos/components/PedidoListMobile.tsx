import type { Pedido } from '../../../../types/domain';
import { Button, StatusBadge, ActionMenu, EmptyState } from '../../../shared/ui';
import { ViewTransition } from 'react';
import {
  ACAO_LABEL,
  NEXT_STATUS,
  PEDIDO_STATUS_LABEL,
  PEDIDO_STATUS_TONE,
  normalizePedStatus,
  type PedidoTab
} from '../types';
import { Calendar, Package } from 'lucide-react';
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

interface PedidoListMobileProps {
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
  onCancelPedido: (id: string) => void;
  onEntregaPedido: (id: string) => void;
}

export function PedidoListMobile({
  pedidos,
  hasAnyFilter,
  activeTab,
  onNovoPedido,
  onDetalhe,
  page,
  pageSize,
  total,
  onPageChange,
  onCancelPedido,
  onEntregaPedido,
  onRetry
}: PedidoListMobileProps) {
  const { updateStatus, confirmarEntrega } = usePedidoMutations();

  if (pedidos.length === 0) {
    return (
      <EmptyState
        title={hasAnyFilter ? 'Nenhum resultado encontrado.' : 'Sem pedidos nesta aba.'}
        description={
          hasAnyFilter
            ? 'Nenhum pedido corresponde aos filtros ativos. Tente ajustar a busca ou limpar os filtros.'
            : activeTab === 'emaberto'
              ? 'Nenhum pedido em aberto. Crie um novo para começar.'
              : activeTab === 'entregues'
                ? 'Pedidos concluídos aparecerão aqui.'
                : 'Pedidos cancelados aparecerão aqui.'
        }
        action={
          hasAnyFilter ? (
            <Button onClick={onRetry}>Limpar filtros</Button>
          ) : activeTab === 'emaberto' ? (
            <Button variant="primary" onClick={onNovoPedido}>Novo pedido</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="rf-ui-stack">
      {pedidos.map((pedido) => {
        const pgtoLabel = pedido.pgto ? (PGTO_LABEL[pedido.pgto] ?? pedido.pgto) : null;
        const itemCount = getItemCount(pedido.itens);
        const status = normalizePedStatus(pedido.status);
        const badgeTone = PEDIDO_STATUS_TONE[status] ?? 'neutral';
        const statusLabel = PEDIDO_STATUS_LABEL[status] || status || '—';
        
        const nextStatus = NEXT_STATUS[status];
        const acaoLabel = ACAO_LABEL[status];
        const isDeliveryAction = nextStatus === 'entregue_aguardando_pagamento' || nextStatus === 'concluido';
        const isTerminal = status === 'concluido' || status === 'cancelado';
        const isBusy = updateStatus.isPending || confirmarEntrega.isPending;

        return (
          <div
            key={pedido.id}
            className="rf-card-premium rf-glass p-5 flex flex-col gap-4 transition-all active:scale-[0.98] cursor-pointer"
            onClick={() => onDetalhe(pedido.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <ViewTransition name={`pedido-hero-${pedido.id}`} share="morph">
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white">#{pedido.num}</span>
                  <span className="text-sm font-bold text-teal-400 mt-0.5">{fmtCurrency(pedido.total ?? 0)}</span>
                </div>
              </ViewTransition>
              <StatusBadge tone={badgeTone}>{statusLabel}</StatusBadge>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[15px] font-black text-slate-200">{pedido.cli || 'Cliente não informado'}</span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {pedido.tipo === 'atacado' && <StatusBadge tone="info">Atacado</StatusBadge>}
                {pedido.rca_nome && <span className="text-xs text-slate-400 font-medium">{pedido.rca_nome}</span>}
                {pgtoLabel && <span className="text-xs text-slate-400 font-medium border-l border-white/10 pl-2">{pgtoLabel}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar size={14} className="text-slate-500" />
                <span className="text-sm font-medium">{formatDate(pedido.data)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Package size={14} className="text-slate-500" />
                <span className="text-sm font-medium">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-white/5" onClick={e => e.stopPropagation()}>
              {nextStatus && acaoLabel ? (
                <Button
                  variant="primary"
                  loading={isBusy}
                  className="w-full justify-center !py-3 !text-[15px] shadow-lg shadow-teal-500/20"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isDeliveryAction) {
                      onEntregaPedido(pedido.id);
                      return;
                    }
                    updateStatus.mutate({ id: pedido.id, status: nextStatus });
                  }}
                >
                  {acaoLabel}
                </Button>
              ) : null}

              <div className="flex items-center justify-between w-full">
                <Button size="sm" onClick={() => onDetalhe(pedido.id)}>
                  Detalhes
                </Button>

                <ActionMenu
                  label="Opções"
                  align="right"
                  items={[
                    ...(!isTerminal ? [{ key: 'cancelar', label: 'Cancelar', danger: true, onClick: () => onCancelPedido(pedido.id) }] : []),
                    ...(status === 'cancelado' ? [{ key: 'reabrir', label: 'Reabrir', onClick: () => updateStatus.mutate({ id: pedido.id, status: 'orcamento' }) }] : [])
                  ]}
                />
              </div>
            </div>
          </div>
        );
      })}

      {total > pedidos.length ? (
        <div className="rf-glass border border-white/5 rounded-2xl flex items-center justify-between p-4">
          <div className="text-xs text-slate-400 font-medium">
            Página {page} · {pedidos.length} de {total}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Ant</Button>
            <Button size="sm" disabled={page * pageSize >= total} onClick={() => onPageChange(page + 1)}>Próx</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
