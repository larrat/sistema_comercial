import { useCallback, startTransition, addTransitionType, ViewTransition } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildClienteRoute, type ClienteProfileTab } from '../../../app/router/wave1Navigation';
import { ClientesPilotPage } from '../components/ClientesPilotPage';
import { useClienteData } from '../hooks/useClienteData';

export function ClientesRoutePage() {
  const { reload, loadFilteredAll, ensureSegmentClientes } = useClienteData();
  const navigate = useNavigate();

  const handleOpenCliente = useCallback(
    (clienteId: string, options?: { tab?: ClienteProfileTab; origin?: string }) => {
      startTransition(() => {
        if (typeof addTransitionType === 'function') addTransitionType('nav-forward');
        navigate(buildClienteRoute(clienteId, { tab: options?.tab ?? null }));
      });
    },
    [navigate]
  );

  const handleNewCliente = useCallback(() => {
    startTransition(() => {
      if (typeof addTransitionType === 'function') addTransitionType('nav-forward');
      navigate('/app/clientes/novo');
    });
  }, [navigate]);

  return (
    <ViewTransition 
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      <ClientesPilotPage
        onOpenCliente={handleOpenCliente}
        onNewCliente={handleNewCliente}
      />
    </ViewTransition>
  );
}
