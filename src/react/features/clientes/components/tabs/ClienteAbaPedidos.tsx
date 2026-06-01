import { LoadingState, ErrorState } from '../../../../shared/ui';
import { buildPedidosRoute } from '../../../../app/router/wave1Navigation';
import { PedidosTable } from '../ClienteProfileHelpers';

export function ClienteAbaPedidos({
  pedidosLoading,
  pedidosError,
  pedidosAbertos,
  pedidosFechados,
  navigate
}: any) {
  return (
    <section className="flex flex-col gap-6 animate-in fade-in duration-200">
      {pedidosLoading ? (
        <LoadingState title="Carregando pedidos…" />
      ) : pedidosError ? (
        <ErrorState title={pedidosError} />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <section className="flex-1 bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white tracking-tight">Pedidos em aberto</h3>
            </div>
            <PedidosTable
              pedidos={pedidosAbertos}
              emptyTitle="Nenhum pedido em aberto para este cliente."
              onOpenPedido={(pedidoId) => navigate(buildPedidosRoute({ pedidoId, view: 'detail' }))}
            />
          </section>
          <section className="flex-1 bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white tracking-tight">Histórico de pedidos</h3>
            </div>
            <PedidosTable
              pedidos={pedidosFechados}
              emptyTitle="Nenhum pedido fechado para este cliente."
              onOpenPedido={(pedidoId) => navigate(buildPedidosRoute({ pedidoId, view: 'detail' }))}
            />
          </section>
        </div>
      )}
    </section>
  );
}
