import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PedidosPilotPage } from '../components/PedidosPilotPage';
import { usePedidoData } from '../hooks/usePedidoData';

export function PedidosRoutePage() {
  usePedidoData();
  const [searchParams] = useSearchParams();

  const routeIntent = useMemo(() => {
    const pedidoId = searchParams.get('pedido');
    const view = searchParams.get('view');
    return {
      pedidoId,
      view: view === 'detail' || view === 'edit' || view === 'new' ? view : null
    };
  }, [searchParams]);

  return <PedidosPilotPage routeIntent={routeIntent} />;
}
