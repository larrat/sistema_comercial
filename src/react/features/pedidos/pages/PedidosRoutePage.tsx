import { useMemo, ViewTransition } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PedidosPilotPage } from '../components/PedidosPilotPage';

export function PedidosRoutePage() {
  const [searchParams] = useSearchParams();

  const routeIntent = useMemo(() => {
    const pedidoId = searchParams.get('pedido');
    const clienteId = searchParams.get('cliente');
    const rawView = searchParams.get('view');
    const view: 'detail' | 'edit' | 'new' | null =
      rawView === 'detail' || rawView === 'edit' || rawView === 'new' ? rawView : null;
    return {
      pedidoId,
      clienteId,
      view
    };
  }, [searchParams]);

  return (
    <ViewTransition 
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      <PedidosPilotPage routeIntent={routeIntent} />
    </ViewTransition>
  );
}
