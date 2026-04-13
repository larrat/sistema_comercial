import { useShallow } from 'zustand/shallow';
import { selectPedidosForTab, usePedidoStore } from '../store/usePedidoStore';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import { PedidoRow } from './PedidoRow';
import type { PedidoTab } from '../types';

const TABS: { id: PedidoTab; label: string }[] = [
  { id: 'emaberto', label: 'Em Aberto' },
  { id: 'entregues', label: 'Entregues' },
  { id: 'cancelados', label: 'Cancelados' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'em_separacao', label: 'Em separação' }
];

export function PedidoListView() {
  const activeTab = usePedidoStore((s) => s.activeTab);
  const setActiveTab = usePedidoStore((s) => s.setActiveTab);
  const filtro = usePedidoStore((s) => s.filtro);
  const setFiltro = usePedidoStore((s) => s.setFiltro);
  const storeStatus = usePedidoStore((s) => s.status);
  const storeError = usePedidoStore((s) => s.error);
  const pedidos = usePedidoStore(useShallow(selectPedidosForTab));
  const { avancarStatus, cancelarPedido, reabrirPedido, inFlight } = usePedidoMutations();

  return (
    <div className="screen-content" data-testid="pedido-list-view">
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tb${activeTab === tab.id ? ' on' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card card-shell">
        <div className="toolbar toolbar-shell toolbar-shell--section">
          <div className="toolbar-main">
            <input
              className="inp input-w-sm"
              placeholder="Cliente ou número..."
              value={filtro.q}
              onChange={(e) => setFiltro({ q: e.target.value })}
              data-testid="pedido-busca"
            />
            {activeTab === 'emaberto' && (
              <select
                className="inp sel select-w-sm"
                value={filtro.status}
                onChange={(e) => setFiltro({ status: e.target.value })}
                data-testid="pedido-filtro-status"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {storeStatus === 'loading' && (
          <div className="empty" data-testid="pedido-loading">
            <p>Carregando pedidos...</p>
          </div>
        )}

        {storeStatus === 'error' && (
          <div className="empty" data-testid="pedido-error">
            <p>{storeError}</p>
          </div>
        )}

        {storeStatus === 'ready' && pedidos.length === 0 && (
          <div className="empty" data-testid="pedido-empty">
            <p>Nenhum pedido encontrado.</p>
          </div>
        )}

        {storeStatus === 'ready' && pedidos.length > 0 && (
          <div className="list" data-testid="pedido-list">
            {pedidos.map((pedido) => (
              <PedidoRow
                key={pedido.id}
                pedido={pedido}
                inFlight={inFlight.has(pedido.id)}
                onAvancar={() => void avancarStatus(pedido)}
                onCancelar={() => void cancelarPedido(pedido)}
                onReabrir={() => void reabrirPedido(pedido)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
