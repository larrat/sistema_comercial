import type { AppUserRole } from '../hooks/useCurrentUserRole';
import type { AppRouteId } from '../router/routes';

export type NavigationItem = {
  id: AppRouteId;
  label: string;
  path: string;
  group: 'Operação' | 'Cadastros' | 'Vendas' | 'Financeiro';
  roles?: AppUserRole[];
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    group: 'Operação',
    roles: ['operador', 'gerente', 'admin']
  },
  {
    id: 'clientes',
    label: 'Clientes',
    path: '/app/clientes',
    group: 'Cadastros',
    roles: ['operador', 'gerente', 'admin']
  },
  {
    id: 'produtos',
    label: 'Produtos',
    path: '/app/produtos',
    group: 'Cadastros',
    roles: ['operador', 'gerente', 'admin']
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    path: '/app/pedidos',
    group: 'Vendas',
    roles: ['operador', 'gerente', 'admin']
  },
  {
    id: 'receber',
    label: 'Contas a receber',
    path: '/app/receber',
    group: 'Financeiro',
    roles: ['operador', 'gerente', 'admin']
  }
];
