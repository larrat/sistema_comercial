import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import type { AppRouteId } from '../router/routes';
import { APP_ROUTE_BY_ID } from '../router/routes';

export function useRouteState() {
  const location = useLocation();

  return useMemo<AppRouteId>(() => {
    const pathname = location.pathname;
    if (pathname.startsWith(APP_ROUTE_BY_ID.dashboard.path)) return 'dashboard';
    if (pathname.startsWith(APP_ROUTE_BY_ID.clientes.path)) return 'clientes';
    if (pathname.startsWith(APP_ROUTE_BY_ID.pedidos.path)) return 'pedidos';
    if (pathname.startsWith(APP_ROUTE_BY_ID.receber.path)) return 'receber';
    if (pathname.startsWith(APP_ROUTE_BY_ID.produtos.path)) return 'produtos';
    if (pathname.startsWith(APP_ROUTE_BY_ID.setup.path)) return 'setup';
    if (pathname.startsWith(APP_ROUTE_BY_ID.login.path)) return 'login';
    if (pathname.startsWith(APP_ROUTE_BY_ID.app.path)) return 'app';
    return 'app';
  }, [location.pathname]);
}
