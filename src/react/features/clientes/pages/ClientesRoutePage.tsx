import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildPedidosRoute } from '../../../app/router/wave1Navigation';
import { ClientesPilotPage } from '../components/ClientesPilotPage';
import { useClienteData } from '../hooks/useClienteData';

export function ClientesRoutePage() {
  useClienteData();
  const navigate = useNavigate();

  const handlePedidoAction = useCallback(
    (action: 'ver' | 'editar', pedidoId: string) => {
      navigate(
        buildPedidosRoute({
          pedidoId,
          view: action === 'editar' ? 'edit' : 'detail'
        })
      );
    },
    [navigate]
  );

  return <ClientesPilotPage onPedidoAction={handlePedidoAction} />;
}
