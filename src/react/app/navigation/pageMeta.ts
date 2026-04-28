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
    description: 'Entre com seu e-mail e senha para acessar o sistema.',
    actions: []
  },
  setup: {
    kicker: 'Configuração',
    title: 'Selecionar filial',
    description: 'Escolha a filial com que deseja trabalhar nesta sessão.',
    actions: []
  },
  app: {
    kicker: 'Sistema',
    title: 'Sistema Comercial',
    description: '',
    actions: [{ label: 'Dashboard', to: '/app/dashboard', tone: 'primary' }]
  },
  dashboard: {
    kicker: 'Operação',
    title: 'Dashboard',
    description: 'Visão geral da operação da filial.',
    actions: [
      { label: 'Clientes', to: '/app/clientes' },
      { label: 'Pedidos', to: '/app/pedidos', tone: 'primary' }
    ]
  },
  clientes: {
    kicker: 'Cadastros',
    title: 'Clientes',
    description: 'Gestão da base de clientes da filial.',
    actions: [
      { label: 'Dashboard', to: '/app/dashboard' },
      { label: 'Pedidos', to: '/app/pedidos' }
    ]
  },
  estoque: {
    kicker: 'Operação',
    title: 'Estoque',
    description: 'Posição de estoque, histórico de movimentações e alertas de ruptura.',
    actions: [
      { label: 'Produtos', to: '/app/produtos' },
      { label: 'Cotação', to: '/app/cotacao' }
    ]
  },
  cotacao: {
    kicker: 'Compras',
    title: 'Cotação',
    description: 'Comparação de preços entre fornecedores e tabela de decisão de compra.',
    actions: [
      { label: 'Produtos', to: '/app/produtos' },
      { label: 'Estoque', to: '/app/estoque' }
    ]
  },
  pedidos: {
    kicker: 'Vendas',
    title: 'Pedidos',
    description: 'Registro e acompanhamento de pedidos de venda.',
    actions: [
      { label: 'Clientes', to: '/app/clientes' },
      { label: 'Receber', to: '/app/receber', tone: 'primary' }
    ]
  },
  receber: {
    kicker: 'Financeiro',
    title: 'Contas a receber',
    description: 'Gestão de cobranças, baixas e controle financeiro da filial.',
    actions: [
      { label: 'Pedidos', to: '/app/pedidos' },
      { label: 'Dashboard', to: '/app/dashboard' }
    ]
  },
  produtos: {
    kicker: 'Catálogo',
    title: 'Produtos',
    description: 'Cadastro e precificação de produtos.',
    actions: [
      { label: 'Estoque', to: '/app/estoque' },
      { label: 'Cotação', to: '/app/cotacao' }
    ]
  },
  rcas: {
    kicker: 'Cadastros',
    title: 'Vendedores',
    description: 'Cadastro e gestão de vendedores da filial.',
    actions: [
      { label: 'Clientes', to: '/app/clientes' },
      { label: 'Pedidos', to: '/app/pedidos' }
    ]
  },
  relatorios: {
    kicker: 'Análise',
    title: 'Relatórios',
    description: 'Oportunidades por jogos, performance comercial e análise de clientes.',
    actions: [
      { label: 'Pedidos', to: '/app/pedidos' },
      { label: 'Clientes', to: '/app/clientes' }
    ]
  },
  campanhas: {
    kicker: 'Marketing',
    title: 'Campanhas',
    description: 'Gestão de campanhas, fila de envio WhatsApp e histórico de contatos.',
    actions: [
      { label: 'Clientes', to: '/app/clientes' },
      { label: 'Relatórios', to: '/app/relatorios' }
    ]
  },
  analytics: {
    kicker: 'Análise',
    title: 'Analytics',
    description: 'Uso interno do sistema, tempo de execução de ações e identificação de gargalos.',
    actions: [
      { label: 'Dashboard', to: '/app/dashboard' },
      { label: 'Relatórios', to: '/app/relatorios' }
    ]
  },
  filiais: {
    kicker: 'Administração',
    title: 'Filiais',
    description: 'Cadastro e configuração das filiais da operação.',
    actions: [{ label: 'Acessos', to: '/app/acessos', roles: ['admin'] }]
  },
  acessos: {
    kicker: 'Administração',
    title: 'Acessos',
    description: 'Perfis de usuário, vínculos a filiais, convites e auditoria.',
    actions: [{ label: 'Filiais', to: '/app/filiais', roles: ['admin'] }]
  }
};
