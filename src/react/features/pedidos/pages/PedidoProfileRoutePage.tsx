import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PedidoProfilePage } from '../components/PedidoProfilePage';
import { usePedidoProfile } from '../hooks/usePedidoProfile';
import { Button, ErrorState, EmptyState, LoadingState } from '../../../shared/ui';

export function PedidoProfileRoutePage() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const { pedido, financeiro, loading, error, reload, reloadFinanceiro, setPedido } =
    usePedidoProfile(pedidoId);

  const handleBack = useCallback(() => {
    navigate('/app/pedidos');
  }, [navigate]);

  if (!pedidoId) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100">
          <EmptyState
            title="Pedido não informado."
            description="Você precisa fornecer um ID de pedido válido para visualizar os detalhes."
            action={
              <Button size="sm" onClick={handleBack}>
                Voltar para pedidos
              </Button>
            }
          />
        </div>
      </main>
    );
  }

  if (!pedido && error) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100">
          <ErrorState
            title={error ?? 'Erro ao carregar pedido.'}
            description="Não foi possível recuperar os dados deste pedido no momento."
            onRetry={() => void reload()}
            action={
              <div className="flex items-center gap-3 mt-4">
                <Button variant="secondary" size="sm" onClick={handleBack}>
                  Voltar para pedidos
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

  if (!pedido) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <LoadingState
          title="Carregando pedido..."
          description="Estamos recuperando as informações detalhadas e o financeiro deste pedido."
        />
      </main>
    );
  }

  return (
    <PedidoProfilePage
      pedido={pedido}
      financeiro={financeiro}
      loadingPedido={loading}
      _error={error}
      onPedidoChanged={setPedido}
      _onReload={reload}
      onReloadFinanceiro={reloadFinanceiro}
    />
  );
}
