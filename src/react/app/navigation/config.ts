import type { AppUserRole } from '../hooks/useCurrentUserRole';
import type { AppRouteId } from '../router/routes';

export type NavigationItem = {
  id: AppRouteId;
  label: string;
  path: string;
  group: 'Operação' | 'Cadastros' | 'Vendas' | 'Financeiro' | 'Administração';
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
    id: 'estoque',
    label: 'Estoque',
    path: '/app/estoque',
    group: 'Operação',
    roles: ['operador', 'gerente', 'admin']
  },
  {
    id: 'cotacao',
    label: 'Cotação',
    path: '/app/cotacao',
    group: 'Operação',
    roles: ['gerente', 'admin']
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
  },
  {
    id: 'rcas',
    label: 'Vendedores',
    path: '/app/rcas',
    group: 'Cadastros',
    roles: ['gerente', 'admin']
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    path: '/app/relatorios',
    group: 'Operação',
    roles: ['operador', 'gerente', 'admin']
  },
  {
    id: 'campanhas',
    label: 'Campanhas',
    path: '/app/campanhas',
    group: 'Operação',
    roles: ['gerente', 'admin']
  },
  {
    id: 'filiais',
    label: 'Filiais',
    path: '/app/filiais',
    group: 'Administração',
    roles: ['admin']
  },
  {
    id: 'acessos',
    label: 'Acessos',
    path: '/app/acessos',
    group: 'Administração',
    roles: ['admin']
  }
];
