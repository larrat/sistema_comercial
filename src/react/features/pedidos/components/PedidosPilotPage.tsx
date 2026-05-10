import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import {
  postLegacyBridgeMessage,
  subscribeLegacyBridgeMessages
} from '../../../app/legacy/bridgeMessaging';
import { Drawer } from '../../../shared/ui';
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
import { PedidoListView } from './PedidoListView';
import { PedidoForm } from './PedidoForm';
import type { Pedido } from '../../../../types/domain';
import type { PedidoTab } from '../types';

const MESSAGE_SOURCE = 'pedidos-react-pilot';
const COMMAND_SOURCE = 'pedidos-legacy-shell';

type PedidosRouteIntent = {
  pedidoId?: string | null;
  clienteId?: string | null;
  view?: 'detail' | 'edit' | 'new' | null;
};

type PedidosPilotPageProps = {
  routeIntent?: PedidosRouteIntent;
  onRetryLoad?: () => void;
};

export function PedidosPilotPage({ routeIntent, onRetryLoad }: PedidosPilotPageProps) {
  const navigate = useNavigate();
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
  const [formOrigin, setFormOrigin] = useState<string>('unknown');
  const [prefillClienteId, setPrefillClienteId] = useState<string | null>(null);

  const editingPedido = useMemo<Pedido | null>(
    () =>
      editingId && editingId !== 'new' ? (pedidos.find((p) => p.id === editingId) ?? null) : null,
    [pedidos, editingId]
  );

  function openNewPedido(origin = 'list_button', clienteId: string | null = null) {
    setEditingId('new');
    setFormOrigin(origin);
    setPrefillClienteId(clienteId);
    trackEvent('pedido_iniciado', {
      metadata: {
        origin,
        has_cliente_prefill: Boolean(clienteId)
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
        setEditingId(String(data.id));
        setPrefillClienteId(null);
        return;
      }
      if (data.type === 'pedidos:detalhe' && data.id) {
        setEditingId(null);
        setPrefillClienteId(null);
        navigate(`/app/pedidos/${encodeURIComponent(String(data.id))}`);
        return;
      }
    });
  }, [setActiveTab, clearFiltro, navigate]);

  useEffect(() => {
    if (!routeIntent) return;

    if (routeIntent.view === 'new') {
      openNewPedido('route_intent', routeIntent.clienteId ?? null);
      return;
    }

    if (!routeIntent.pedidoId) return;

    if (routeIntent.view === 'edit') {
      setEditingId(routeIntent.pedidoId);
      setPrefillClienteId(null);
      return;
    }

    setEditingId(null);
    setPrefillClienteId(null);
    navigate(`/app/pedidos/${encodeURIComponent(routeIntent.pedidoId)}`);
  }, [navigate, routeIntent?.clienteId, routeIntent?.pedidoId, routeIntent?.view]);

  // Publica estado ao bridge legado
  useEffect(() => {
    const filtersActive = [filtro.q, filtro.status, filtro.pgto, filtro.periodo].filter(
      Boolean
    ).length;
    const view = editingId ? 'form' : 'list';
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
        selectedId: editingId === 'new' ? '' : editingId || '',
        selectedNum: editingPedido?.num ?? null
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
    editingPedido?.num
  ]);

  return (
    <div className="rf-content" data-testid="pedidos-pilot-page">
      <PedidoListView
        onRetry={onRetryLoad}
        onNovoPedido={() => openNewPedido('list_button')}
        onDetalhe={(id) => {
          setEditingId(null);
          navigate(`/app/pedidos/${encodeURIComponent(id)}`);
        }}
      />

      <Drawer
        open={!!editingId}
        title={
          editingId === 'new'
            ? 'Novo pedido'
            : editingPedido
              ? `Editar pedido #${editingPedido.num}`
              : 'Editar pedido'
        }
        subtitle="Defina cliente, itens e condições sem alterar as regras atuais do pedido."
        size="lg"
        closeOnOverlayClick={!editingId || editingId === 'new' || !!editingPedido}
        onClose={() => {
          setEditingId(null);
          setPrefillClienteId(null);
        }}
      >
        {editingId ? (
          <PedidoForm
            prefillClienteId={editingId === 'new' ? prefillClienteId : null}
            initialPedido={editingId === 'new' ? null : editingPedido}
            analyticsOrigin={formOrigin}
            onSaved={(pedido) => {
              setEditingId(null);
              setPrefillClienteId(null);
              navigate(`/app/pedidos/${encodeURIComponent(pedido.id)}`);
            }}
            onCancel={() => {
              setEditingId(null);
              setPrefillClienteId(null);
            }}
          />
        ) : null}
      </Drawer>
    </div>
  );
}
