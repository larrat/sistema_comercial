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
    description: 'Dashboard real conectado ao shell novo, ainda com algumas dependências transitórias do legado.',
    actions: [
      { label: 'Clientes', to: '/app/clientes' },
      { label: 'Pedidos', to: '/app/pedidos', tone: 'primary' }
    ]
  },
  clientes: {
    kicker: 'Cadastros',
    title: 'Clientes',
    description: 'Módulo real de clientes conectado ao shell novo, preservando integrações transitórias necessárias.',
    actions: [
      { label: 'Dashboard', to: '/app/dashboard' },
      { label: 'Pedidos', to: '/app/pedidos' }
    ]
  },
  estoque: {
    kicker: 'Operação',
    title: 'Estoque',
    description: 'Módulo React de estoque ativo: posição, histórico e movimentações.',
    actions: [
      { label: 'Produtos', to: '/app/produtos' },
      { label: 'Dashboard', to: '/app/dashboard' }
    ]
  },
  cotacao: {
    kicker: 'Compras',
    title: 'Cotação',
    description: 'Comparação de preços entre fornecedores, importação de planilhas e tabela de decisão de compra.',
    actions: [
      { label: 'Produtos', to: '/app/produtos' },
      { label: 'Estoque', to: '/app/estoque' }
    ]
  },
  pedidos: {
    kicker: 'Vendas',
    title: 'Pedidos',
    description: 'Módulo real de pedidos conectado ao shell novo, ainda preservando integrações transitórias com o legado.',
    actions: [
      { label: 'Clientes', to: '/app/clientes' },
      { label: 'Receber', to: '/app/receber', tone: 'primary' }
    ]
  },
  receber: {
    kicker: 'Financeiro',
    title: 'Contas a receber',
    description: 'Módulo real de contas a receber conectado ao shell novo, preservando integrações transitórias necessárias.',
    actions: [
      { label: 'Pedidos', to: '/app/pedidos' },
      { label: 'Produtos', to: '/app/produtos' }
    ]
  },
  produtos: {
    kicker: 'Catálogo',
    title: 'Produtos',
    description: 'Módulo real de produtos conectado ao shell novo, preservando integrações transitórias com estoque e bridge legado.',
    actions: [
      { label: 'Dashboard', to: '/app/dashboard' },
      { label: 'Clientes', to: '/app/clientes' }
    ]
  },
  rcas: {
    kicker: 'Cadastros',
    title: 'Vendedores',
    description: 'Cadastro e gestão de vendedores (RCAs) da filial.',
    actions: [
      { label: 'Clientes', to: '/app/clientes' },
      { label: 'Pedidos', to: '/app/pedidos' }
    ]
  },
  relatorios: {
    kicker: 'Análise',
    title: 'Relatórios',
    description: 'Oportunidades por jogos, performance comercial e análise da base de clientes.',
    actions: [
      { label: 'Pedidos', to: '/app/pedidos' },
      { label: 'Clientes', to: '/app/clientes' }
    ]
  }
};
