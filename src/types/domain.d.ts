export type Id = string;

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: Record<string, unknown> | null;
};

export type SbApiError = Error & {
  status: number | null;
  code: string;
  source: string;
  operation: string;
  resource: string | null;
  details: unknown;
  retryable: boolean;
  cause?: unknown;
};

export type SbResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: SbApiError };

export type Filial = {
  id: Id;
  nome: string;
  cidade?: string;
  estado?: string;
  cor?: string;
  criado_em?: string;
};

export type Fornecedor = {
  id: Id;
  filial_id?: Id | null;
  nome: string;
  contato?: string;
  tel?: string;
  email?: string;
  obs?: string;
  criado_em?: string;
};

export type Produto = {
  id: Id;
  filial_id?: Id | null;
  nome: string;
  sku?: string;
  un: string;
  cat?: string;
  custo: number;
  mkv: number;
  mka?: number;
  pfa?: number;
  pvv?: number;
  qtmin?: number;
  dv?: number;
  da?: number;
  emin?: number;
  esal?: number;
  ecm?: number;
  hist_cot?: Array<{
    mes?: string;
    forn?: string;
    preco?: number;
  }>;
};

export type Cliente = {
  id: Id;
  filial_id?: Id | null;
  nome: string;
  apelido?: string;
  doc?: string;
  tipo?: string;
  status?: string;
  tel?: string;
  whatsapp?: string;
  email?: string;
  data_aniversario?: string;
  time?: string | string[];
  resp?: string;
  seg?: string;
  tab?: string;
  prazo?: string;
  cidade?: string;
  estado?: string;
  obs?: string;
  optin_marketing?: boolean;
  optin_email?: boolean;
  optin_sms?: boolean;
};

export type PedidoItem = {
  prodId: Id;
  nome: string;
  un: string;
  qty: number;
  preco: number;
  custo: number;
  orig: string;
};

export type Pedido = {
  id: Id;
  filial_id?: Id | null;
  num: number;
  cli: string;
  data?: string;
  status: string;
  pgto?: string;
  prazo?: string;
  tipo?: string;
  obs?: string;
  itens: PedidoItem[] | string;
  total: number;
};

export type Campanha = {
  id: Id;
  filial_id?: Id | null;
  nome: string;
  tipo?: string;
  canal?: string;
  dias_antecedencia?: number;
  assunto?: string | null;
  mensagem?: string;
  cupom?: string | null;
  desconto?: number;
  ativo?: boolean;
  criado_em?: string;
};

export type CampanhaEnvio = {
  id: Id;
  filial_id?: Id | null;
  campanha_id?: Id | null;
  cliente_id?: Id | null;
  canal?: string;
  destino?: string | null;
  mensagem?: string;
  status?: string;
  data_ref?: string;
  criado_em?: string;
  enviado_em?: string | null;
  erro?: string | null;
};

export type JogoAgenda = {
  id: Id;
  filial_id?: Id | null;
  titulo: string;
  campeonato?: string | null;
  data_hora?: string | null;
  mandante?: string | null;
  visitante?: string | null;
  local?: string | null;
  status?: string | null;
};

export type UserPerfil = {
  user_id: Id;
  papel: string;
  criado_em?: string;
  atualizado_em?: string;
};

export type UserFilial = {
  user_id: Id;
  filial_id: Id;
  criado_em?: string;
};

export type AcessoAuditoria = {
  id?: Id;
  ator_user_id?: Id | null;
  acao?: string;
  recurso?: string;
  alvo_user_id?: Id | null;
  alvo_filial_id?: Id | null;
  detalhes?: Record<string, unknown> | null;
  criado_em?: string;
};

export type AccessAdminReadData = {
  ator_user_id: Id;
  papel: string;
  perfis: UserPerfil[];
  vinculos: UserFilial[];
  filiais: Filial[];
  auditoria: AcessoAuditoria[];
  auditoria_limit: number;
};

export type AccessAdminOperationData = {
  action: string;
  ator_user_id: Id;
  alvo_user_id: Id;
  alvo_filial_id?: Id | null;
  recurso: string;
  result: unknown;
};

export type CampanhaFilaResult = {
  campanha_id: Id;
  filial_id?: Id | null;
  dry_run: boolean;
  criados: number;
  ignorados: number;
  falhas: number;
  total_elegiveis: number;
};

export type MovimentoEstoque = {
  id: Id;
  filial_id?: Id | null;
  prodId?: Id;
  prod_id?: Id;
  tipo: string;
  data?: string;
  qty?: number;
  custo?: number;
  obs?: string;
  saldo_real?: number;
  saldoReal?: number;
  destino?: Id | null;
  ts?: number;
};

export type ScreenDom = {
  get(id: string): (HTMLElement & {
    value?: string;
    checked?: boolean;
    disabled?: boolean;
  }) | null;
  html(scope: string, id: string, html: string, signature?: string): void;
  text(scope: string, id: string, text: string, signature?: string): void;
  value(id: string, value: string | number): void;
  checked(id: string, checked: boolean): void;
  display(scope: string, id: string, value: string, signature?: string): void;
  select(scope: string, id: string, html: string, current?: string, signature?: string): void;
};

export type ProdutoModuleCallbacks = {
  calcSaldos?: () => Record<string, { saldo: number; cm?: number }>;
  setFlowStep?: (...args: any[]) => void;
  refreshMovSel?: () => void;
};

export type ClientesModuleCallbacks = {
  setFlowStep?: (...args: any[]) => void;
};

export type PedidosModuleCallbacks = {
  refreshProdSel?: () => void;
  refreshCliDL?: () => void;
};

export type DashboardModuleCallbacks = {
  calcSaldosMulti?: (...args: any[]) => Record<string, { saldo: number; cm?: number }>;
};

export type EstoqueModuleCallbacks = {
  calcSaldos?: () => Record<string, { saldo: number; cm?: number }>;
};

export type AuthSetupModuleDeps = {
  pageAtual?: () => string;
  ir?: (page: string) => void;
  filterSidebarNav?: (query?: string) => void;
  resetRuntimeData?: () => void;
  showLoading?: (loading: boolean) => void;
  mostrarTela?: (screen: string) => void;
  buildSkeletonLines?: (count?: number) => string;
  carregarDadosFilial?: (filialId: Id) => Promise<void>;
  refreshProdSel?: () => void;
  refreshCliDL?: () => void;
  renderFornSel?: () => void;
  refreshMovSel?: () => void;
  refreshDestSel?: () => void;
  renderDashFilSel?: () => void;
  renderDash?: () => void;
  atualizarBadgeEst?: () => void;
  updateNotiBadge?: () => void;
  cores?: string[];
};

export type FiliaisAcessosModuleDeps = {
  requireRole?: (allowedRoles?: string[], denyMessage?: string) => boolean;
  renderSetup?: () => Promise<void>;
  entrar?: () => Promise<void>;
  renderDashFilSel?: () => void;
  scheduleRoleUiGuards?: () => void;
  roleAdminOnly?: string[];
  appRoles?: string[];
  cores?: string[];
};
