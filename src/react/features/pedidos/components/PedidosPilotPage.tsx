import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { postLegacyBridgeMessage, subscribeLegacyBridgeMessages } from '../../../app/legacy/bridgeMessaging';
import { Drawer } from '../../../shared/ui';
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
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
  onRetryLoad?: () => void;
};

export function PedidosPilotPage({ routeIntent, onRetryLoad }: PedidosPilotPageProps) {
  const pedidos = usePedidoStore(useShallow((s) => s.pedidos));
  const summary = usePedidoStore((s) => s.summary);
  const activeTab = usePedidoStore((s) => s.activeTab);
  const setActiveTab = usePedidoStore((s) => s.setActiveTab);
  const filtro = usePedidoStore((s) => s.filtro);
  const clearFiltro = usePedidoStore((s) => s.clearFiltro);
  const storeStatus = usePedidoStore((s) => s.status);
  const storeError = usePedidoStore((s) => s.error);
  const visiblePedidos = pedidos;
  const page = usePedidoStore((s) => s.page);
  const total = usePedidoStore((s) => s.total);
  const { trackEvent } = useAnalytics({ module: 'pedidos' });

  const [editingId, setEditingId] = useState<string | null>(null); // 'new' | pedidoId | null
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOrigin, setFormOrigin] = useState<string>('unknown');

  const editingPedido = useMemo<Pedido | null>(
    () =>
      editingId && editingId !== 'new' ? (pedidos.find((p) => p.id === editingId) ?? null) : null,
    [pedidos, editingId]
  );

  const detailPedido = useMemo<Pedido | null>(
    () => (detailId ? (pedidos.find((p) => p.id === detailId) ?? null) : null),
    [pedidos, detailId]
  );

  function openNewPedido(origin = 'list_button') {
    setDetailId(null);
    setEditingId('new');
    setFormOrigin(origin);
    trackEvent('pedido_iniciado', {
      metadata: {
        origin
      },
      result: 'success'
    });
  }

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
        openNewPedido('legacy_bridge');
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
      openNewPedido('route_intent');
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
    const filtersActive = [filtro.q, filtro.status, filtro.pgto, filtro.periodo].filter(Boolean)
      .length;
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
        totalPedidos: summary.total,
        page,
        totalFiltrados: total,
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
    filtro.pgto,
    filtro.periodo,
    visiblePedidos.length,
    summary.total,
    page,
    total,
    editingId,
    detailId,
    editingPedido?.num,
    detailPedido?.num
  ]);

  return (
    <div className="rf-content" data-testid="pedidos-pilot-page">
      <PedidoListView
        onRetry={onRetryLoad}
        onNovoPedido={() => openNewPedido('list_button')}
        onDetalhe={(id) => {
          setEditingId(null);
          setDetailId(id);
        }}
      />

      <Drawer
        open={!!detailPedido && !editingId}
        title={detailPedido ? `Pedido #${detailPedido.num}` : ''}
        size="lg"
        action={
          detailPedido ? (
            <button
              className="btn btn-sm"
              type="button"
              data-testid="pedido-detail-editar"
              onClick={() => {
                setDetailId(null);
                setEditingId(detailPedido.id);
              }}
            >
              Editar
            </button>
          ) : undefined
        }
        onClose={() => setDetailId(null)}
      >
        {detailPedido && <PedidoDetailPanel pedido={detailPedido} />}
      </Drawer>

      {editingId && (
        <PedidoForm
          initialPedido={editingId === 'new' ? null : editingPedido}
          analyticsOrigin={formOrigin}
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
