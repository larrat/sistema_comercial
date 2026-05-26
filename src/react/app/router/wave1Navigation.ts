export type Wave1LegacyPage =
  | 'pdv'
  | 'dashboard'
  | 'clientes'
  | 'estoque'
  | 'cotacao'
  | 'pedidos'
  | 'receber'
  | 'produtos'
  | 'rcas'
  | 'relatorios'
  | 'campanhas';

export type ClienteProfileTab = 'resumo' | 'pedidos' | 'financeiro' | 'notas' | 'cadastro' | 'marketing';
export type ProdutoProfileTab = 'resumo' | 'precificacao' | 'estoque' | 'cadastro';

export type PedidoRouteIntent = {
  pedidoId?: string | null;
  clienteId?: string | null;
  view?: 'detail' | 'edit' | 'new' | null;
};

export type ReceberRouteIntent = {
  contaId?: string | null;
};

const WAVE1_ROUTE_BY_PAGE: Record<Wave1LegacyPage, string> = {
  pdv: '/app/pdv',
  dashboard: '/app/dashboard',
  clientes: '/app/clientes',
  estoque: '/app/estoque',
  cotacao: '/app/cotacao',
  pedidos: '/app/pedidos',
  receber: '/app/receber',
  produtos: '/app/produtos',
  rcas: '/app/rcas',
  relatorios: '/app/relatorios',
  campanhas: '/app/campanhas'
};

export function getWave1RouteByLegacyPage(page: string): string | null {
  return page in WAVE1_ROUTE_BY_PAGE ? WAVE1_ROUTE_BY_PAGE[page as Wave1LegacyPage] : null;
}

export function buildClienteRoute(
  clienteId: string,
  options: { tab?: ClienteProfileTab | null } = {}
): string {
  const params = new URLSearchParams();
  if (options.tab) params.set('tab', options.tab);
  const query = params.toString();
  return query
    ? `/app/clientes/${encodeURIComponent(clienteId)}?${query}`
    : `/app/clientes/${encodeURIComponent(clienteId)}`;
}

export function buildProdutoRoute(
  produtoId: string,
  options: { tab?: ProdutoProfileTab | null; edit?: boolean | null } = {}
): string {
  const params = new URLSearchParams();
  if (options.tab) params.set('tab', options.tab);
  if (options.edit) params.set('edit', '1');
  const query = params.toString();
  return query
    ? `/app/produtos/${encodeURIComponent(produtoId)}?${query}`
    : `/app/produtos/${encodeURIComponent(produtoId)}`;
}

export function buildPedidosRoute(intent: PedidoRouteIntent = {}): string {
  if (intent.pedidoId && intent.view === 'detail') {
    return `/app/pedidos/${encodeURIComponent(intent.pedidoId)}`;
  }

  const params = new URLSearchParams();
  if (intent.pedidoId) params.set('pedido', intent.pedidoId);
  if (intent.clienteId) params.set('cliente', intent.clienteId);
  if (intent.view) params.set('view', intent.view);
  const query = params.toString();
  return query ? `/app/pedidos?${query}` : '/app/pedidos';
}

export function buildReceberRoute(intent: ReceberRouteIntent = {}): string {
  const params = new URLSearchParams();
  if (intent.contaId) params.set('conta', intent.contaId);
  const query = params.toString();
  return query ? `/app/receber?${query}` : '/app/receber';
}
