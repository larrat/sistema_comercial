import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { postLegacyBridgeMessage, subscribeLegacyBridgeMessages } from '../../../app/legacy/bridgeMessaging';
import { selectPedidosForTab, usePedidoStore } from '../store/usePedidoStore';
import { PedidoListView } from './PedidoListView';
import { PedidoForm } from './PedidoForm';
import { PedidoDetailPanel } from './PedidoDetailPanel';
import type { Pedido } from '../../../../types/domain';
import type { PedidoTab } from '../types';

const MESSAGE_SOURCE = 'pedidos-react-pilot';
const COMMAND_SOURCE = 'pedidos-legacy-shell';

type PedidosRouteIntent = {
  pedidoId?: string | null;
  view?: 'detail' | 'edit' | 'new' | null;
};

type PedidosPilotPageProps = {
  routeIntent?: PedidosRouteIntent;
};

export function PedidosPilotPage({ routeIntent }: PedidosPilotPageProps) {
  const pedidos = usePedidoStore(useShallow((s) => s.pedidos));
  const activeTab = usePedidoStore((s) => s.activeTab);
  const setActiveTab = usePedidoStore((s) => s.setActiveTab);
  const filtro = usePedidoStore((s) => s.filtro);
  const clearFiltro = usePedidoStore((s) => s.clearFiltro);
  const storeStatus = usePedidoStore((s) => s.status);
  const storeError = usePedidoStore((s) => s.error);
  const visiblePedidos = usePedidoStore(useShallow(selectPedidosForTab));

  const [editingId, setEditingId] = useState<string | null>(null); // 'new' | pedidoId | null
  const [detailId, setDetailId] = useState<string | null>(null);

  const editingPedido = useMemo<Pedido | null>(
    () =>
      editingId && editingId !== 'new' ? (pedidos.find((p) => p.id === editingId) ?? null) : null,
    [pedidos, editingId]
  );

  const detailPedido = useMemo<Pedido | null>(
    () => (detailId ? (pedidos.find((p) => p.id === detailId) ?? null) : null),
    [pedidos, detailId]
  );

  // Comandos do shell legado
  useEffect(() => {
    return subscribeLegacyBridgeMessages(COMMAND_SOURCE, (data) => {
      if (data.type === 'pedidos:set-tab' && data.tab) {
        setActiveTab(data.tab as PedidoTab);
        return;
      }
      if (data.type === 'pedidos:limpar-filtros') {
        clearFiltro();
        return;
      }
      if (data.type === 'pedidos:novo') {
        setDetailId(null);
        setEditingId('new');
        return;
      }
      if (data.type === 'pedidos:editar' && data.id) {
        setDetailId(null);
        setEditingId(String(data.id));
        return;
      }
      if (data.type === 'pedidos:detalhe' && data.id) {
        setEditingId(null);
        setDetailId(String(data.id));
        return;
      }
    });
  }, [setActiveTab, clearFiltro]);

  useEffect(() => {
    if (!routeIntent) return;

    if (routeIntent.view === 'new') {
      setDetailId(null);
      setEditingId('new');
      return;
    }

    if (!routeIntent.pedidoId) return;

    if (routeIntent.view === 'edit') {
      setDetailId(null);
      setEditingId(routeIntent.pedidoId);
      return;
    }

    setEditingId(null);
    setDetailId(routeIntent.pedidoId);
  }, [routeIntent?.pedidoId, routeIntent?.view]);

  // Publica estado ao bridge legado
  useEffect(() => {
    const filtersActive = [filtro.q, filtro.status].filter(Boolean).length;
    const view = editingId ? 'form' : detailId ? 'detail' : 'list';
    postLegacyBridgeMessage({
      source: MESSAGE_SOURCE,
      type: 'pedidos:state',
      state: {
        tab: activeTab,
        view,
        status: storeStatus === 'loading' ? 'loading' : storeError ? 'error' : 'ready',
        count: visiblePedidos.length,
        filtersActive,
        totalPedidos: pedidos.length,
        selectedId: editingId === 'new' ? '' : editingId || detailId || '',
        selectedNum: editingPedido?.num ?? detailPedido?.num ?? null
      }
    });
  }, [
    activeTab,
    storeStatus,
    storeError,
    filtro.q,
    filtro.status,
    visiblePedidos.length,
    pedidos.length,
    editingId,
    detailId,
    editingPedido?.num,
    detailPedido?.num
  ]);

  return (
    <div data-testid="pedidos-pilot-page">
      <PedidoListView
        onNovoPedido={() => {
          setDetailId(null);
          setEditingId('new');
        }}
        onDetalhe={(id) => {
          setEditingId(null);
          setDetailId(id);
        }}
      />

      {detailPedido && !editingId && (
        <PedidoDetailPanel
          pedido={detailPedido}
          onEditar={(id) => {
            setDetailId(null);
            setEditingId(id);
          }}
          onClose={() => setDetailId(null)}
        />
      )}

      {editingId && (
        <PedidoForm
          initialPedido={editingId === 'new' ? null : editingPedido}
          onSaved={(pedido) => {
            setEditingId(null);
            setDetailId(pedido.id);
          }}
          onCancel={() => {
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
