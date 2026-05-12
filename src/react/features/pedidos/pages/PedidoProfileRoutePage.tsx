import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PedidoProfilePage } from '../components/PedidoProfilePage';
import { usePedidoProfile } from '../hooks/usePedidoProfile';

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
        <div className="card-shell">
          <p>Pedido não informado.</p>
          <button className="btn btn-sm" type="button" onClick={handleBack}>
            Voltar para pedidos
          </button>
        </div>
      </main>
    );
  }

  if (!pedido && error) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <div className="card-shell rf-ui-stack">
          <p>{error}</p>
          <div className="fg2">
            <button className="btn btn-sm" type="button" onClick={() => void reload()}>
              Tentar novamente
            </button>
            <button className="btn btn-sm" type="button" onClick={handleBack}>
              Voltar para pedidos
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!pedido) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <div className="card-shell">
          <p>Carregando pedido...</p>
        </div>
      </main>
    );
  }

  return (
    <PedidoProfilePage
      pedido={pedido}
      financeiro={financeiro}
      loadingPedido={loading}
      error={error}
      onPedidoChanged={setPedido}
      onReload={reload}
      onReloadFinanceiro={reloadFinanceiro}
    />
  );
}
