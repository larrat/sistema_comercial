import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';


import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
import { PedidoListView } from './PedidoListView';

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

  function openNewPedido(origin: string, clienteId?: string | null) {
    if (clienteId) {
      navigate(`/app/pedidos/novo?cliente=${clienteId}`);
    } else {
      navigate('/app/pedidos/novo');
    }
  }

  useEffect(() => {
    if (!routeIntent) return;

    if (routeIntent.view === 'new') {
      openNewPedido('route_intent', routeIntent.clienteId ?? null);
      return;
    }

    if (!routeIntent.pedidoId) return;

    if (routeIntent.view === 'edit') {
      navigate(`/app/pedidos/${routeIntent.pedidoId}/editar`);
      return;
    }

    navigate(`/app/pedidos/${encodeURIComponent(routeIntent.pedidoId)}`);
  }, [navigate, routeIntent]);

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


    </motion.main>
  );
}
