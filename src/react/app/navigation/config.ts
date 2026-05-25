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
    id: 'pdv',
    label: 'PDV',
    path: '/app/pdv',
    group: 'Operação',
    roles: ['admin', 'gerente', 'operador']
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    group: 'Operação',
    roles: ['admin', 'gerente']
  },
  {
    id: 'clientes',
    label: 'Clientes',
    path: '/app/clientes',
    group: 'Cadastros',
    roles: ['admin', 'gerente', 'operador']
  },
  {
    id: 'produtos',
    label: 'Produtos',
    path: '/app/produtos',
    group: 'Cadastros',
    roles: ['admin', 'gerente', 'operador']
  },
  {
    id: 'estoque',
    label: 'Estoque',
    path: '/app/estoque',
    group: 'Operação',
    roles: ['admin', 'gerente', 'operador']
  },
  {
    id: 'cotacao',
    label: 'Cotação',
    path: '/app/cotacao',
    group: 'Operação',
    roles: ['admin', 'gerente', 'operador']
  },
  {
    id: 'crm',
    label: 'CRM Reformas',
    path: '/app/crm',
    group: 'Vendas',
    roles: ['admin', 'gerente', 'operador']
  },
  {
    id: 'contratos',
    label: 'Contratos e O.S.',
    path: '/app/contratos',
    group: 'Operação',
    roles: ['admin', 'gerente', 'operador']
  },
  {
    id: 'agenda',
    label: 'Agenda',
    path: '/app/agenda',
    group: 'Operação',
    roles: ['admin', 'gerente', 'operador']
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    path: '/app/pedidos',
    group: 'Vendas',
    roles: ['admin', 'gerente', 'operador']
  },
  {
    id: 'receber',
    label: 'Contas a receber',
    path: '/app/receber',
    group: 'Financeiro',
    roles: ['admin', 'gerente']
  },
  {
    id: 'compras',
    label: 'Compras',
    path: '/app/compras',
    group: 'Operação',
    roles: ['admin', 'gerente']
  },
  {
    id: 'caixa',
    label: 'Fluxo de Caixa',
    path: '/app/caixa',
    group: 'Financeiro',
    roles: ['admin', 'gerente']
  },
  {
    id: 'rcas',
    label: 'Vendedores',
    path: '/app/rcas',
    group: 'Cadastros',
    roles: ['admin', 'gerente']
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    path: '/app/relatorios',
    group: 'Operação',
    roles: ['admin', 'gerente']
  },
  {
    id: 'campanhas',
    label: 'Campanhas',
    path: '/app/campanhas',
    group: 'Operação',
    roles: ['admin', 'gerente']
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/app/analytics',
    group: 'Operação',
    roles: ['admin', 'gerente']
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
