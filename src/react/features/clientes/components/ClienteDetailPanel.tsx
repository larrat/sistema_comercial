import { useMemo, useState } from 'react';

import type { Cliente, Pedido } from '../../../../types/domain';
import { useClienteNotes } from '../hooks/useClienteNotes';
import { useClientePedidos } from '../hooks/useClientePedidos';
import { ClienteContextSummary } from './ClienteContextSummary';
import { ClienteFidelidadePanel } from './ClienteFidelidadePanel';

export type DetailTab = 'resumo' | 'abertas' | 'fechadas' | 'notas' | 'fidelidade';

type Props = {
  cliente: Cliente;
  onEditar?: (id: string) => void;
  onClose?: () => void;
  activeTab?: DetailTab;
  onTabChange?: (tab: DetailTab) => void;
};

function formatCurrency(value: number): string {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function sendPedidoAction(
  action: 'ver' | 'editar' | 'fechar-venda',
  pedidoId: string,
  clienteId: string
) {
  if (window.parent === window) return;
  window.parent.postMessage(
    {
      source: 'clientes-react-pilot',
      type: 'clientes:pedido-acao',
      action,
      pedidoId,
      clienteId
    },
    window.location.origin
  );
}

function renderPedidosList(
  pedidos: Pedido[],
  kind: 'abertas' | 'fechadas',
  options: { loading: boolean; error: string | null; clienteNome: string }
) {
  if (options.loading) {
    return (
      <div className="sk-card" data-testid={`pedidos-${kind}-loading`}>
        <div className="sk-line" />
        <div className="sk-line" />
      </div>
    );
  }

  if (options.error) {
    return (
      <div className="empty" data-testid={`pedidos-${kind}-error`}>
        <p>{options.error}</p>
      </div>
    );
  }

  if (!pedidos.length) {
    return (
      <div className="empty-inline table-cell-muted" data-testid={`pedidos-${kind}-empty`}>
        {kind === 'abertas'
          ? 'Nenhum pedido em andamento para este cliente.'
          : 'Nenhum pedido fechado para este cliente.'}
      </div>
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
              onClick={() => sendPedidoAction('ver', pedido.id, pedido.cliente_id || '')}
              data-testid={`pedido-ver-${pedido.id}`}
            >
              Ver pedido
            </button>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => sendPedidoAction('editar', pedido.id, pedido.cliente_id || '')}
              data-testid={`pedido-editar-${pedido.id}`}
            >
              Editar
            </button>
            {!pedido.venda_fechada && pedido.status === 'entregue' && (
              <button
                className="btn btn-p btn-sm"
                type="button"
                onClick={() => sendPedidoAction('fechar-venda', pedido.id, pedido.cliente_id || '')}
                data-testid={`pedido-fechar-${pedido.id}`}
              >
                Fechar venda
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function ClienteDetailPanel({ cliente, onEditar, onClose, activeTab, onTabChange }: Props) {
  const [internalTab, setInternalTab] = useState<DetailTab>('resumo');
  const [notaDraft, setNotaDraft] = useState('');
  const { notas, loading, saving, error, submitNota } = useClienteNotes({ clienteId: cliente.id });
  const tab = activeTab ?? internalTab;
  const {
    pedidosAbertos,
    pedidosFechados,
    loading: pedidosLoading,
    error: pedidosError
  } = useClientePedidos({
    cliente,
    skip: tab !== 'abertas' && tab !== 'fechadas'
  });

  const pedidosUi = useMemo(
    () => ({
      loading: pedidosLoading,
      error: pedidosError,
      clienteNome: cliente.nome
    }),
    [cliente.nome, pedidosError, pedidosLoading]
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
    <div className="card-shell form-gap-lg" data-testid="cliente-detail-panel">
      <div className="fb form-gap-bottom-xs">
        <div>
          <div className="table-cell-caption table-cell-muted">Detalhe do cliente</div>
          <h3 className="table-cell-strong">{cliente.nome}</h3>
          <div className="table-cell-caption table-cell-muted">
            {cliente.seg || 'Sem segmento'} - {cliente.cidade || 'Cidade nao informada'}
          </div>
        </div>
        <div className="mobile-card-actions">
          {onEditar && (
            <button
              className="btn btn-p btn-sm"
              onClick={() => onEditar(cliente.id)}
              data-testid="detalhe-editar"
            >
              Editar
            </button>
          )}
          {onClose && (
            <button className="btn btn-sm" onClick={onClose} data-testid="detalhe-fechar">
              Fechar
            </button>
          )}
        </div>
      </div>

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
          Notas / historico
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
          <div className="cli-detail-label form-gap-bottom-xs">Notas / historico</div>
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
            <div className="empty" data-testid="nota-error">
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="sk-card" data-testid="nota-loading">
              <div className="sk-line" />
              <div className="sk-line" />
            </div>
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
            <div className="empty-inline table-cell-muted" data-testid="nota-empty">
              Nenhuma nota.
            </div>
          )}
        </div>
      )}

      {tab === 'fidelidade' && <ClienteFidelidadePanel cliente={cliente} />}
    </div>
  );
}
