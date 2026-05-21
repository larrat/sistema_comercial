import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PedidoForm } from '../components/PedidoForm';
import { usePedidoQuery } from '../hooks/usePedidosQuery';
import { Button, ErrorState, EmptyState, LoadingState } from '../../../shared/ui';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export function PedidoEditRoutePage() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const { data: pedido, isLoading, error } = usePedidoQuery(pedidoId);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (!pedidoId) {
    return (
      <div className="w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
          <EmptyState
            title="Pedido não informado."
            description="Você precisa fornecer um ID de pedido válido para editar."
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

  if (!pedido && isError) {
    return (
      <div className="w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
          <ErrorState
            title={error instanceof Error ? error.message : 'Erro ao carregar pedido.'}
            description="Não foi possível recuperar os dados deste pedido no momento."
            onRetry={() => void refetch()}
            action={
              <div className="flex items-center gap-3 mt-4">
                <Button variant="secondary" size="sm" onClick={handleBack}>
                  Voltar
                </Button>
                <Button size="sm" onClick={() => void refetch()}>
                  Tentar novamente
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-8">
        <LoadingState
          title="Carregando pedido..."
          description="Estamos recuperando as informações para edição."
        />
      </div>
    );
  }

  if (!pedido) return null;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6" data-testid="pedido-edit-page">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          aria-label="Voltar"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">Editar Pedido</h1>
          <p className="text-sm text-slate-400">Pedido #{pedido.num}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-xl border border-white/5 p-6">
        <PedidoForm
          prefillClienteId={null}
          initialPedido={pedido}
          analyticsOrigin="route_page"
          onSaved={(pedido) => {
            toast.success('Pedido atualizado com sucesso!');
            navigate(`/app/pedidos/${encodeURIComponent(pedido.id)}`);
          }}
          onCancel={() => handleBack()}
        />
      </div>
    </div>
  );
}
