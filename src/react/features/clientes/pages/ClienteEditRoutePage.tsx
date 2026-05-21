import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ClienteForm } from '../components/ClienteForm';
import { useClienteProfile } from '../hooks/useClienteProfile';
import { Button, ErrorState, EmptyState, LoadingState } from '../../../shared/ui';
import { ChevronLeft } from 'lucide-react';

export function ClienteEditRoutePage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const { cliente, loading, error, reload } = useClienteProfile(clienteId);

  const handleBack = useCallback(() => {
    navigate(-1);
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
                Voltar
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
                  Voltar
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

  if (!cliente && loading) {
    return (
      <div className="w-full flex flex-col gap-8">
        <LoadingState
          title="Carregando cliente..."
          description="Estamos recuperando as informações para edição."
        />
      </div>
    );
  }

  if (!cliente) return null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">Editar Cliente</h1>
          <p className="text-sm text-slate-400">{cliente.nome}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-xl border border-white/5 p-6">
        <ClienteForm
          initialCliente={cliente}
          analyticsOrigin="route_page"
          onSaved={() => handleBack()}
          onCancel={() => handleBack()}
        />
      </div>
    </div>
  );
}
