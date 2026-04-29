import { useMemo, useState } from 'react';
import { postLegacyBridgeMessage } from '../../../app/legacy/bridgeMessaging';

import type { Cliente, Pedido } from '../../../../types/domain';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui';
import { useClienteNotes } from '../hooks/useClienteNotes';
import { useClientePedidos } from '../hooks/useClientePedidos';
import { ClienteContextSummary } from './ClienteContextSummary';
import { ClienteFidelidadePanel } from './ClienteFidelidadePanel';

export type DetailTab = 'resumo' | 'abertas' | 'fechadas' | 'notas' | 'fidelidade';

type Props = {
  cliente: Cliente;
  activeTab?: DetailTab;
  onTabChange?: (tab: DetailTab) => void;
  onPedidoAction?: (action: 'ver' | 'editar', pedidoId: string, clienteId: string) => void;
};

function formatCurrency(value: number): string {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function sendPedidoAction(
  action: 'ver' | 'editar',
  pedidoId: string,
  clienteId: string,
  onPedidoAction?: (action: 'ver' | 'editar', pedidoId: string, clienteId: string) => void
) {
  if (onPedidoAction) {
    onPedidoAction(action, pedidoId, clienteId);
    return;
  }
  postLegacyBridgeMessage({
    source: 'clientes-react-pilot',
    type: 'clientes:pedido-acao',
    action,
    pedidoId,
    clienteId
  });
}

function renderPedidosList(
  pedidos: Pedido[],
  kind: 'abertas' | 'fechadas',
  options: {
    loading: boolean;
    error: string | null;
    clienteNome: string;
    onFecharVenda?: (pedido: Pedido) => void;
    fechandoId?: string | null;
    onPedidoAction?: (action: 'ver' | 'editar', pedidoId: string, clienteId: string) => void;
  }
) {
  if (options.loading) {
    return <LoadingState title="Carregando pedidos..." compact data-testid={`pedidos-${kind}-loading`} />;
  }

  if (options.error) {
    return <ErrorState title={options.error} compact data-testid={`pedidos-${kind}-error`} />;
  }

  if (!pedidos.length) {
    return (
      <EmptyState
        title={
          kind === 'abertas'
            ? 'Nenhum pedido em andamento para este cliente.'
            : 'Nenhum pedido fechado para este cliente.'
        }
        compact
        data-testid={`pedidos-${kind}-empty`}
      />
    );
  }

  return (
    <div className="cli-sales-list" data-testid={`pedidos-${kind}-list`}>
      {pedidos.map((pedido) => (
        <article key={pedido.id} className="card-shell form-gap-md">
          <div className="fb">
            <div>
              <div className="table-cell-caption table-cell-muted">Pedido #{pedido.num}</div>
              <div className="table-cell-strong">{pedido.cli || options.clienteNome}</div>
            </div>
            <span className={`bdg ${pedido.venda_fechada ? 'bb' : 'ba'}`}>
              {pedido.venda_fechada ? 'Fechado' : pedido.status || 'Em andamento'}
            </span>
          </div>

          <div className="mobile-card-grid">
            <div className="mobile-card-panel">
              <div className="table-cell-caption table-cell-muted">Status</div>
              <div>{pedido.status || '-'}</div>
            </div>
            <div className="mobile-card-panel">
              <div className="table-cell-caption table-cell-muted">Pagamento</div>
              <div>{pedido.pgto || '-'}</div>
            </div>
            <div className="mobile-card-panel">
              <div className="table-cell-caption table-cell-muted">Prazo</div>
              <div>{pedido.prazo || '-'}</div>
            </div>
            <div className="mobile-card-panel">
              <div className="table-cell-caption table-cell-muted">Total</div>
              <div className="table-cell-strong">{formatCurrency(Number(pedido.total || 0))}</div>
            </div>
          </div>

          <div className="mobile-card-actions">
            <button
              className="btn btn-sm"
              type="button"
              onClick={() =>
                sendPedidoAction('ver', pedido.id, pedido.cliente_id || '', options.onPedidoAction)
              }
              data-testid={`pedido-ver-${pedido.id}`}
            >
              Ver pedido
            </button>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() =>
                sendPedidoAction(
                  'editar',
                  pedido.id,
                  pedido.cliente_id || '',
                  options.onPedidoAction
                )
              }
              data-testid={`pedido-editar-${pedido.id}`}
            >
              Editar
            </button>
            {!pedido.venda_fechada && pedido.status === 'entregue' && options.onFecharVenda && (
              <button
                className="btn btn-p btn-sm"
                type="button"
                disabled={options.fechandoId === pedido.id}
                onClick={() => options.onFecharVenda!(pedido)}
                data-testid={`pedido-fechar-${pedido.id}`}
              >
                {options.fechandoId === pedido.id ? 'Fechando…' : 'Fechar venda'}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function ClienteDetailPanel({
  cliente,
  activeTab,
  onTabChange,
  onPedidoAction
}: Props) {
  const [internalTab, setInternalTab] = useState<DetailTab>('resumo');
  const [notaDraft, setNotaDraft] = useState('');
  const { notas, loading, saving, error, submitNota } = useClienteNotes({ clienteId: cliente.id });
  const tab = activeTab ?? internalTab;
  const {
    pedidosAbertos,
    pedidosFechados,
    loading: pedidosLoading,
    error: pedidosError,
    fecharVenda,
    fechandoId
  } = useClientePedidos({
    cliente,
    skip: tab !== 'abertas' && tab !== 'fechadas'
  });

  const pedidosUi = useMemo(
    () => ({
      loading: pedidosLoading,
      error: pedidosError,
      clienteNome: cliente.nome,
      onFecharVenda: fecharVenda,
      fechandoId,
      onPedidoAction
    }),
    [cliente.nome, fechandoId, fecharVenda, onPedidoAction, pedidosError, pedidosLoading]
  );

  function setTab(nextTab: DetailTab) {
    if (onTabChange) {
      onTabChange(nextTab);
      return;
    }
    setInternalTab(nextTab);
  }

  async function handleSubmitNota() {
    await submitNota(notaDraft);
    setNotaDraft('');
  }

  return (
    <div className="rf-ui-stack" data-testid="cliente-detail-panel">
      <div className="tabs" data-testid="cliente-detail-tabs">
        <button className={`tb ${tab === 'resumo' ? 'on' : ''}`} onClick={() => setTab('resumo')}>
          Resumo
        </button>
        <button className={`tb ${tab === 'abertas' ? 'on' : ''}`} onClick={() => setTab('abertas')}>
          Pedidos abertos
        </button>
        <button
          className={`tb ${tab === 'fechadas' ? 'on' : ''}`}
          onClick={() => setTab('fechadas')}
        >
          Pedidos fechados
        </button>
        <button className={`tb ${tab === 'notas' ? 'on' : ''}`} onClick={() => setTab('notas')}>
          Notas / histórico
        </button>
        <button
          className={`tb ${tab === 'fidelidade' ? 'on' : ''}`}
          onClick={() => setTab('fidelidade')}
        >
          Fidelidade
        </button>
      </div>

      {tab === 'resumo' && <ClienteContextSummary cliente={cliente} />}

      {tab === 'abertas' && (
        <div className="form-gap-lg" data-testid="cliente-detail-pedidos-abertos">
          <div className="cli-detail-label form-gap-bottom-xs">Pedidos em andamento</div>
          {renderPedidosList(pedidosAbertos, 'abertas', pedidosUi)}
        </div>
      )}

      {tab === 'fechadas' && (
        <div className="form-gap-lg" data-testid="cliente-detail-pedidos-fechados">
          <div className="cli-detail-label form-gap-bottom-xs">Pedidos fechados</div>
          {renderPedidosList(pedidosFechados, 'fechadas', pedidosUi)}
        </div>
      )}

      {tab === 'notas' && (
        <div className="form-gap-lg" data-testid="cliente-detail-notas">
          <div className="cli-detail-label form-gap-bottom-xs">Notas / histórico</div>
          <div className="fg2 cli-detail-notes-input form-gap-bottom-xs">
            <input
              className="inp input-flex"
              placeholder="Adicionar nota..."
              value={notaDraft}
              onChange={(e) => setNotaDraft(e.target.value)}
              data-testid="nota-input"
            />
            <button
              className="btn btn-sm"
              onClick={handleSubmitNota}
              disabled={saving}
              data-testid="nota-add"
            >
              {saving ? 'Salvando...' : '+'}
            </button>
          </div>

          {error && (
            <ErrorState title={error} compact data-testid="nota-error" />
          )}

          {loading ? (
            <LoadingState title="Carregando notas..." compact data-testid="nota-loading" />
          ) : notas.length ? (
            <div className="cli-detail-notes" data-testid="nota-list">
              {notas.map((nota, index) => (
                <div key={`${nota.data}-${index}`} className="nota">
                  <p>{nota.texto}</p>
                  <div className="nota-d">{nota.data}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma nota." compact data-testid="nota-empty" />
          )}
        </div>
      )}

      {tab === 'fidelidade' && <ClienteFidelidadePanel cliente={cliente} />}
    </div>
  );
}
