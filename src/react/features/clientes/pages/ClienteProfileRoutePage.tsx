import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ClienteProfilePage } from '../components/ClienteProfilePage';
import { useClienteProfile } from '../hooks/useClienteProfile';
import { Button, ErrorState, EmptyState, LoadingState } from '../../../shared/ui';

export function ClienteProfileRoutePage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const { cliente, loading, error, reload, setCliente } = useClienteProfile(clienteId);

  const handleBack = useCallback(() => {
    navigate('/app/clientes');
  }, [navigate]);

  if (!clienteId) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100">
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
      </main>
    );
  }

  if (!cliente && error) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100">
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
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <LoadingState
          title="Carregando cliente..."
          description="Estamos recuperando as informações detalhadas e o histórico deste cliente."
        />
      </main>
    );
  }

  return (
    <ClienteProfilePage
      cliente={cliente}
      loadingCliente={loading}
      onClienteSaved={setCliente}
      onReload={reload}
    />
  );
}
