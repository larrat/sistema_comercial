import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';

import { Drawer } from '../../../shared/ui';
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
import { PedidoListView } from './PedidoListView';
import { PedidoForm } from './PedidoForm';
import type { Pedido } from '../../../../types/domain';
import type { PedidoTab } from '../types';


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


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6" data-testid="pedidos-pilot-page">
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
