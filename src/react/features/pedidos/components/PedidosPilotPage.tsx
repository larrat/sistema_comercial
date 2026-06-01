import { useEffect, startTransition, addTransitionType } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
import { PedidoListView } from './PedidoListView';
import { PedidoKanbanView } from './PedidoKanbanView';
import { PageHeader, Button, SegmentedControl } from '../../../shared/ui';
import { useQueryState, parseAsString } from 'nuqs';

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

  const [viewMode, setViewMode] = useQueryState('viewMode', parseAsString.withDefault('list'));

  function openNewPedido(origin: string, clienteId?: string | null) {
    startTransition(() => {
      if (typeof addTransitionType === 'function') addTransitionType('nav-forward');
      if (clienteId) {
        navigate(`/app/pedidos/novo?cliente=${clienteId}`);
      } else {
        navigate('/app/pedidos/novo');
      }
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
      startTransition(() => {
        if (typeof addTransitionType === 'function') addTransitionType('nav-forward');
        navigate(`/app/pedidos/${routeIntent.pedidoId}/editar`);
      });
      return;
    }

    startTransition(() => {
      if (typeof addTransitionType === 'function') addTransitionType('nav-forward');
      navigate(`/app/pedidos/${encodeURIComponent(routeIntent.pedidoId!)}`);
    });
  }, [navigate, routeIntent]);

  return (
    <motion.main 
      className="flex-1 w-full flex flex-col gap-8" 
      data-testid="pedidos-pilot-page"
      variants={pageContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Kanban tem header próprio aqui pois PedidoListView já tem o seu */}
      {viewMode === 'kanban' && (
        <motion.div variants={pageItem}>
          <PageHeader
            kicker="Vendas"
            title="Pedidos — Kanban"
            description="Visualize e mova pedidos entre status arrastando os cards."
            actions={
              <div className="flex items-center gap-3">
                <Button variant="primary" onClick={() => openNewPedido('kanban_button')}>
                  Novo pedido
                </Button>
                <SegmentedControl
                  options={[
                    { id: 'list', label: 'Lista' },
                    { id: 'kanban', label: 'Kanban' }
                  ]}
                  activeId={viewMode}
                  onChange={(id) => setViewMode(id)}
                />
              </div>
            }
          />
        </motion.div>
      )}

      <motion.div variants={pageItem}>
        {viewMode === 'kanban' ? (
          <PedidoKanbanView />
        ) : (
          <PedidoListView
            onNovoPedido={() => openNewPedido('list_button')}
            onDetalhe={(id) => {
              startTransition(() => {
                if (typeof addTransitionType === 'function') addTransitionType('nav-forward');
                navigate(`/app/pedidos/${encodeURIComponent(id)}`);
              });
            }}
            onSwitchToKanban={() => setViewMode('kanban')}
          />
        )}
      </motion.div>


    </motion.main>
  );
}
