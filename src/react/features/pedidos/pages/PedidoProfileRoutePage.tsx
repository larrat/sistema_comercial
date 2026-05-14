import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PedidoProfilePage } from '../components/PedidoProfilePage';
import { usePedidoQuery, usePedidoFinanceiroQuery } from '../hooks/usePedidosQuery';
import { Button, ErrorState, EmptyState, LoadingState } from '../../../shared/ui';

export function PedidoProfileRoutePage() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  
  const { data: pedido, isLoading: isLoadingPedido, isError: isErrorPedido, error: errorPedido, refetch: refetchPedido } = usePedidoQuery(pedidoId);
  const { data: financeiro, isLoading: isLoadingFinanceiro, refetch: refetchFinanceiro } = usePedidoFinanceiroQuery(pedidoId);

  const handleBack = useCallback(() => {
    navigate('/app/pedidos');
  }, [navigate]);

  if (!pedidoId) {
    return (
      <div className="w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
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
      </div>
    );
  }

  if (isErrorPedido) {
    return (
      <div className="w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
          <ErrorState
            title={errorPedido instanceof Error ? errorPedido.message : 'Erro ao carregar pedido.'}
            description="Não foi possível recuperar os dados deste pedido no momento."
            onRetry={() => void refetchPedido()}
            action={
              <div className="flex items-center gap-3 mt-4">
                <Button variant="secondary" size="sm" onClick={handleBack}>
                  Voltar para pedidos
                </Button>
                <Button size="sm" onClick={() => void refetchPedido()}>
                  Tentar novamente
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  if (isLoadingPedido || !pedido) {
    return (
      <div className="w-full flex flex-col gap-8">
        <LoadingState
          title="Carregando pedido..."
          description="Estamos recuperando as informações detalhadas e o financeiro deste pedido."
        />
      </div>
    );
  }

  return (
    <PedidoProfilePage
      pedido={pedido}
      financeiro={{
        conta: financeiro?.conta ?? null,
        baixas: financeiro?.baixas ?? [],
        loading: isLoadingFinanceiro,
        error: null
      }}
      onReloadFinanceiro={async () => { await refetchFinanceiro(); }}
    />
  );
}
