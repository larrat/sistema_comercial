import { useCallback, startTransition, addTransitionType, ViewTransition } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ClienteProfilePage } from '../components/ClienteProfilePage';
import { useClienteProfile } from '../hooks/useClienteProfile';
import { Button, ErrorState, EmptyState, LoadingState } from '../../../shared/ui';

export function ClienteProfileRoutePage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const { cliente, loading, error, reload, setCliente } = useClienteProfile(clienteId);

  const handleBack = useCallback(() => {
    startTransition(() => {
      if (typeof addTransitionType === 'function') addTransitionType('nav-back');
      navigate('/app/clientes');
    });
  }, [navigate]);

  if (!clienteId) {
    return (
      <div className="w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
          <EmptyState
            title="Cliente não informado."
            description="Você precisa fornecer um ID de cliente válido para visualizar os detalhes."
            action={
              <Button size="sm" onClick={handleBack}>
                Voltar para clientes
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!cliente && error) {
    return (
      <div className="w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
          <ErrorState
            title={error ?? 'Erro ao carregar cliente.'}
            description="Não foi possível recuperar os dados deste cliente no momento."
            onRetry={() => void reload()}
            action={
              <div className="flex items-center gap-3 mt-4">
                <Button variant="secondary" size="sm" onClick={handleBack}>
                  Voltar para clientes
                </Button>
                <Button size="sm" onClick={() => void reload()}>
                  Tentar novamente
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="w-full flex flex-col gap-8">
        <LoadingState
          title="Carregando cliente…"
          description="Estamos recuperando as informações detalhadas e o histórico deste cliente."
        />
      </div>
    );
  }

  return (
    <ViewTransition 
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      <ClienteProfilePage
        cliente={cliente}
        loadingCliente={loading}
        onClienteSaved={setCliente}
        onReload={reload}
      />
    </ViewTransition>
  );
}
