import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildClienteRoute, type ClienteProfileTab } from '../../../app/router/wave1Navigation';
import { ClientesPilotPage } from '../components/ClientesPilotPage';
import { useClienteData } from '../hooks/useClienteData';

export function ClientesRoutePage() {
  const { reload, loadFilteredAll, ensureSegmentClientes } = useClienteData();
  const navigate = useNavigate();

  const handleOpenCliente = useCallback(
    (clienteId: string, options?: { tab?: ClienteProfileTab; origin?: string }) => {
      navigate(buildClienteRoute(clienteId, { tab: options?.tab ?? null }));
    },
    [navigate]
  );

  const handleNewCliente = useCallback(() => {
    navigate('/app/clientes/novo');
  }, [navigate]);

  return (
    <ClientesPilotPage
      onOpenCliente={handleOpenCliente}
      onNewCliente={handleNewCliente}
      onRetryLoad={reload}
      onLoadFilteredAll={loadFilteredAll}
      onLoadSegmentClientes={ensureSegmentClientes}
    />
  );
}
