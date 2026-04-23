import type { AppUserRole } from '../hooks/useCurrentUserRole';
import type { AppRouteId } from '../router/routes';

export type PageMetaAction = {
  label: string;
  to?: string;
  roles?: AppUserRole[];
  tone?: 'default' | 'primary';
};

export type PageMeta = {
  kicker: string;
  title: string;
  description: string;
  actions?: PageMetaAction[];
};

export const PAGE_META: Record<AppRouteId, PageMeta> = {
  login: {
    kicker: 'Acesso',
    title: 'Login',
    description: 'Fluxo público da nova árvore React.',
    actions: [{ label: 'Ir para setup', to: '/setup' }]
  },
  setup: {
    kicker: 'Configuração',
    title: 'Setup',
    description: 'Fluxo autenticado sem filial ativa.',
    actions: [{ label: 'Ir para login', to: '/login' }]
  },
  app: {
    kicker: 'App',
    title: 'Sistema Comercial',
    description: 'Container da nova árvore protegida.',
    actions: [{ label: 'Abrir dashboard', to: '/app/dashboard', tone: 'primary' }]
  },
  dashboard: {
    kicker: 'Operação',
    title: 'Dashboard',
    description: 'Placeholder do shell novo. O dashboard real ainda não foi conectado.',
    actions: [
      { label: 'Clientes', to: '/app/clientes' },
      { label: 'Pedidos', to: '/app/pedidos', tone: 'primary' }
    ]
  },
  clientes: {
    kicker: 'Cadastros',
    title: 'Clientes',
    description: 'Placeholder da rota React. O módulo atual continua fora do shell novo.',
    actions: [
      { label: 'Dashboard', to: '/app/dashboard' },
      { label: 'Pedidos', to: '/app/pedidos' }
    ]
  },
  pedidos: {
    kicker: 'Vendas',
    title: 'Pedidos',
    description: 'Placeholder da rota React. Sem ligação ainda com o módulo de pedidos.',
    actions: [
      { label: 'Clientes', to: '/app/clientes' },
      { label: 'Receber', to: '/app/receber', tone: 'primary' }
    ]
  },
  receber: {
    kicker: 'Financeiro',
    title: 'Contas a receber',
    description: 'Placeholder da rota React. Fluxos financeiros permanecem no caminho atual.',
    actions: [
      { label: 'Pedidos', to: '/app/pedidos' },
      { label: 'Produtos', to: '/app/produtos' }
    ]
  },
  produtos: {
    kicker: 'Catálogo',
    title: 'Produtos',
    description: 'Placeholder da rota React. O módulo real ainda não foi encaixado aqui.',
    actions: [
      { label: 'Dashboard', to: '/app/dashboard' },
      { label: 'Clientes', to: '/app/clientes' }
    ]
  }
};
