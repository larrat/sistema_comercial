export type AppRouteId =
  | 'login'
  | 'setup'
  | 'app'
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
  | 'campanhas'
  | 'analytics'
  | 'filiais'
  | 'acessos'
  | 'compras'
  | 'caixa';

export type AppRoute = {
  id: AppRouteId;
  path: string;
  label: string;
};

export const APP_ROUTES: AppRoute[] = [
  { id: 'login', path: '/login', label: 'Login' },
  { id: 'setup', path: '/setup', label: 'Setup' },
  { id: 'app', path: '/app', label: 'App' },
  { id: 'pdv', path: '/app/pdv', label: 'PDV' },
  { id: 'dashboard', path: '/app/dashboard', label: 'Dashboard' },
  { id: 'clientes', path: '/app/clientes', label: 'Clientes' },
  { id: 'estoque', path: '/app/estoque', label: 'Estoque' },
  { id: 'cotacao', path: '/app/cotacao', label: 'Cotação' },
  { id: 'pedidos', path: '/app/pedidos', label: 'Pedidos' },
  { id: 'receber', path: '/app/receber', label: 'Contas a receber' },
  { id: 'produtos', path: '/app/produtos', label: 'Produtos' },
  { id: 'rcas', path: '/app/rcas', label: 'Vendedores' },
  { id: 'relatorios', path: '/app/relatorios', label: 'Relatórios' },
  { id: 'campanhas', path: '/app/campanhas', label: 'Campanhas' },
  { id: 'analytics', path: '/app/analytics', label: 'Analytics' },
  { id: 'filiais', path: '/app/filiais', label: 'Filiais' },
  { id: 'acessos', path: '/app/acessos', label: 'Acessos' },
  { id: 'compras', path: '/app/compras', label: 'Compras' },
  { id: 'caixa', path: '/app/caixa', label: 'Caixa' }
];

export const APP_ROUTE_BY_ID: Record<AppRouteId, AppRoute> = APP_ROUTES.reduce(
  (acc, route) => {
    acc[route.id] = route;
    return acc;
  },
  {} as Record<AppRouteId, AppRoute>
);

export function getDefaultAppPath() {
  return APP_ROUTE_BY_ID.dashboard.path;
}
