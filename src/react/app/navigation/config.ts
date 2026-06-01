import type { AppUserRole } from '../hooks/useCurrentUserRole';
import type { AppRouteId } from '../router/routes';

export type NavigationGroup = 'Vendas & CRM' | 'Gestão & Operação' | 'Financeiro' | 'Marketing & Dados' | 'Cadastros' | 'Configurações';

export type NavigationItem = {
  id: AppRouteId;
  label: string;
  path: string;
  group: NavigationGroup;
  roles?: AppUserRole[];
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  // Vendas & CRM
  { id: 'pdv', label: 'PDV', path: '/app/pdv', group: 'Vendas & CRM', roles: ['admin', 'gerente', 'operador'] },
  { id: 'pedidos', label: 'Pedidos', path: '/app/pedidos', group: 'Vendas & CRM', roles: ['admin', 'gerente', 'operador'] },
  { id: 'crm', label: 'CRM Reformas', path: '/app/crm', group: 'Vendas & CRM', roles: ['admin', 'gerente', 'operador'] },
  { id: 'orcamentos', label: 'Orçamentos', path: '/app/orcamentos', group: 'Vendas & CRM', roles: ['admin', 'gerente', 'operador'] },
  { id: 'cotacao', label: 'Cotação', path: '/app/cotacao', group: 'Vendas & CRM', roles: ['admin', 'gerente', 'operador'] },
  { id: 'contratos', label: 'Contratos e O.S.', path: '/app/contratos', group: 'Vendas & CRM', roles: ['admin', 'gerente', 'operador'] },
  
  // Gestão & Operação
  { id: 'dashboard', label: 'Dashboard', path: '/app/dashboard', group: 'Gestão & Operação', roles: ['admin', 'gerente'] },
  { id: 'agenda', label: 'Agenda', path: '/app/agenda', group: 'Gestão & Operação', roles: ['admin', 'gerente', 'operador'] },
  { id: 'estoque', label: 'Estoque', path: '/app/estoque', group: 'Gestão & Operação', roles: ['admin', 'gerente', 'operador'] },
  { id: 'compras', label: 'Compras', path: '/app/compras', group: 'Gestão & Operação', roles: ['admin', 'gerente'] },
  
  // Financeiro
  { id: 'receber', label: 'Contas a receber', path: '/app/receber', group: 'Financeiro', roles: ['admin', 'gerente'] },
  { id: 'caixa', label: 'Fluxo de Caixa', path: '/app/caixa', group: 'Financeiro', roles: ['admin', 'gerente'] },
  
  // Marketing & Dados
  { id: 'analytics', label: 'Analytics', path: '/app/analytics', group: 'Marketing & Dados', roles: ['admin', 'gerente'] },
  { id: 'relatorios', label: 'Relatórios', path: '/app/relatorios', group: 'Marketing & Dados', roles: ['admin', 'gerente'] },
  { id: 'campanhas', label: 'Campanhas', path: '/app/campanhas', group: 'Marketing & Dados', roles: ['admin', 'gerente'] },
  
  // Cadastros
  { id: 'clientes', label: 'Clientes', path: '/app/clientes', group: 'Cadastros', roles: ['admin', 'gerente', 'operador'] },
  { id: 'produtos', label: 'Produtos', path: '/app/produtos', group: 'Cadastros', roles: ['admin', 'gerente', 'operador'] },
  { id: 'rcas', label: 'Vendedores', path: '/app/rcas', group: 'Cadastros', roles: ['admin', 'gerente'] },
  
  // Configurações
  { id: 'filiais', label: 'Filiais', path: '/app/filiais', group: 'Configurações', roles: ['admin'] },
  { id: 'acessos', label: 'Acessos', path: '/app/acessos', group: 'Configurações', roles: ['admin'] },
  { id: 'fiscal', label: 'Tributação (NCM/IVA)', path: '/app/fiscal', group: 'Configurações', roles: ['admin', 'gerente'] }
];
