export type AppRouteId =
  | 'login'
  | 'setup'
  | 'app'
  | 'dashboard'
  | 'clientes'
  | 'pedidos'
  | 'receber'
  | 'produtos';

export type AppRoute = {
  id: AppRouteId;
  path: string;
  label: string;
};

export const APP_ROUTES: AppRoute[] = [
  { id: 'login', path: '/login', label: 'Login' },
  { id: 'setup', path: '/setup', label: 'Setup' },
  { id: 'app', path: '/app', label: 'App' },
  { id: 'dashboard', path: '/app/dashboard', label: 'Dashboard' },
  { id: 'clientes', path: '/app/clientes', label: 'Clientes' },
  { id: 'pedidos', path: '/app/pedidos', label: 'Pedidos' },
  { id: 'receber', path: '/app/receber', label: 'Contas a receber' },
  { id: 'produtos', path: '/app/produtos', label: 'Produtos' }
];

export const APP_ROUTE_BY_ID: Record<AppRouteId, AppRoute> = APP_ROUTES.reduce(
  (acc, route) => {
    acc[route.id] = route;
    return acc;
  },
  {} as Record<AppRouteId, AppRoute>
);

export const APP_NAV_ROUTES: AppRoute[] = APP_ROUTES.filter((route) =>
  ['dashboard', 'clientes', 'pedidos', 'receber', 'produtos'].includes(route.id)
);

export function getDefaultAppPath() {
  return APP_ROUTE_BY_ID.dashboard.path;
}
