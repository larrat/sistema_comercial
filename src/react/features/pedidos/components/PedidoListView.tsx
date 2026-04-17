import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { selectPedidosForTab, usePedidoStore } from '../store/usePedidoStore';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import { PedidoRow } from './PedidoRow';
import type { Pedido } from '../../../../types/domain';
import type { PedidoTab } from '../types';

const EXIT_DURATION = 400;

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

type Props = {
  onNovoPedido: () => void;
  onDetalhe: (id: string) => void;
};

export function PedidoListView({ onNovoPedido, onDetalhe }: Props) {
  const activeTab = usePedidoStore((s) => s.activeTab);
  const setActiveTab = usePedidoStore((s) => s.setActiveTab);
  const filtro = usePedidoStore((s) => s.filtro);
  const setFiltro = usePedidoStore((s) => s.setFiltro);
  const storeStatus = usePedidoStore((s) => s.status);
  const storeError = usePedidoStore((s) => s.error);
  const pedidos = usePedidoStore(useShallow(selectPedidosForTab));
  const { avancarStatus, cancelarPedido, reabrirPedido, inFlight } = usePedidoMutations();

  // Animação de saída: guarda os pedidos que sumiram da tab atual
  const snapshotRef = useRef<Map<string, Pedido>>(new Map());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Atualiza o snapshot com os pedidos visíveis
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
          <div className="toolbar-actions">
            <button
              className="btn btn-sm btn-p"
              onClick={onNovoPedido}
              data-testid="pedido-novo-btn"
            >
              + Novo pedido
            </button>
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

        {storeStatus === 'ready' && pedidos.length === 0 && exitingIds.size === 0 && (
          <div className="empty" data-testid="pedido-empty">
            <p>Nenhum pedido encontrado.</p>
          </div>
        )}

        {storeStatus === 'ready' && (pedidos.length > 0 || exitingIds.size > 0) && (
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
