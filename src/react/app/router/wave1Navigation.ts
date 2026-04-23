export type Wave1LegacyPage = 'dashboard' | 'clientes' | 'estoque' | 'cotacao' | 'pedidos' | 'receber' | 'produtos';

export type PedidoRouteIntent = {
  pedidoId?: string | null;
  view?: 'detail' | 'edit' | 'new' | null;
};

const WAVE1_ROUTE_BY_PAGE: Record<Wave1LegacyPage, string> = {
  dashboard: '/app/dashboard',
  clientes: '/app/clientes',
  estoque: '/app/estoque',
  cotacao: '/app/cotacao',
  pedidos: '/app/pedidos',
  receber: '/app/receber',
  produtos: '/app/produtos'
};

export function getWave1RouteByLegacyPage(page: string): string | null {
  return page in WAVE1_ROUTE_BY_PAGE ? WAVE1_ROUTE_BY_PAGE[page as Wave1LegacyPage] : null;
}

export function buildPedidosRoute(intent: PedidoRouteIntent = {}): string {
  const params = new URLSearchParams();
  if (intent.pedidoId) params.set('pedido', intent.pedidoId);
  if (intent.view) params.set('view', intent.view);
  const query = params.toString();
  return query ? `/app/pedidos?${query}` : '/app/pedidos';
}
