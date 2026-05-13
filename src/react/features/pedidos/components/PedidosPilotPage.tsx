import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Drawer } from '../../../shared/ui';
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
import { PedidoListView } from './PedidoListView';
import { PedidoForm } from './PedidoForm';
import type { Pedido } from '../../../../types/domain';
import { motion, type Variants } from 'framer-motion';

const pageContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const pageItem: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 25 }
  }
};

type PedidosRouteIntent = {
  pedidoId?: string | null;
  clienteId?: string | null;
  view?: 'detail' | 'edit' | 'new' | null;
};

type PedidosPilotPageProps = {
  routeIntent?: PedidosRouteIntent;
  onRetryLoad?: () => void;
};

export function PedidosPilotPage({ routeIntent }: PedidosPilotPageProps) {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics({ module: 'pedidos' });

  const [editingId, setEditingId] = useState<string | null>(null); // 'new' | pedidoId | null
  const [formOrigin, setFormOrigin] = useState<string>('unknown');
  const [prefillClienteId, setPrefillClienteId] = useState<string | null>(null);

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
    <motion.main 
      className="flex-1 w-full flex flex-col gap-8" 
      data-testid="pedidos-pilot-page"
      variants={pageContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={pageItem}>
        <PedidoListView
          onNovoPedido={() => openNewPedido('list_button')}
          onDetalhe={(id) => {
            setEditingId(null);
            navigate(`/app/pedidos/${encodeURIComponent(id)}`);
          }}
        />
      </motion.div>

      <Drawer
        open={!!editingId}
        title={
          editingId === 'new'
            ? 'Novo pedido'
            : 'Editar pedido'
        }
        subtitle="Defina cliente, itens e condições sem alterar as regras atuais do pedido."
        size="lg"
        onClose={() => {
          setEditingId(null);
          setPrefillClienteId(null);
        }}
      >
        {editingId ? (
          <PedidoForm
            prefillClienteId={editingId === 'new' ? prefillClienteId : null}
            initialPedido={null} // O form carregará se necessário ou usaremos query no form
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
    </motion.main>
  );
}
