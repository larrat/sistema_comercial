-- 24_caixa_e_movimentacoes.sql
-- Estrutura para Fluxo de Caixa (Universal Cash Log)

begin;

create table if not exists public.caixa_categorias (
  id          text        primary key,
  nome        text        not null,
  tipo        text        not null, -- entrada | saida
  is_sistema  boolean     default false, -- Categorias fixas do sistema
  criado_em   timestamptz not null default now()
);

create table if not exists public.caixa_transacoes (
  id            bigserial   primary key,
  filial_id     text        not null,
  tipo          text        not null, -- entrada | saida
  valor         numeric     not null default 0,
  categoria_id  text        references public.caixa_categorias(id),
  descricao     text        not null,
  entidade_id   text,       -- ID do Pedido, PedidoCompra, ou Conta (opcional)
  entidade_tipo text,       -- 'venda', 'compra', 'despesa', 'recebimento'
  criado_por    uuid        references auth.users(id),
  criado_em     timestamptz not null default now()
);

-- Dados Iniciais (Categorias)
insert into public.caixa_categorias (id, nome, tipo, is_sistema) values
  ('venda', 'Venda de Mercadoria', 'entrada', true),
  ('recebimento', 'Recebimento de Fiado', 'entrada', true),
  ('compra', 'Compra de Mercadoria', 'saida', true),
  ('aluguel', 'Aluguel', 'saida', false),
  ('energia', 'Energia Elétrica', 'saida', false),
  ('salarios', 'Salários', 'saida', false),
  ('impostos', 'Impostos', 'saida', false),
  ('outros_in', 'Outras Entradas', 'entrada', false),
  ('outros_out', 'Outras Saídas', 'saida', false)
on conflict (id) do nothing;

-- Índices
create index if not exists ix_caixa_filial_data on public.caixa_transacoes(filial_id, criado_em desc);

-- RLS
alter table public.caixa_categorias enable row level security;
alter table public.caixa_transacoes enable row level security;

create policy p_caixa_categorias_select on public.caixa_categorias
  for select to authenticated
  using (true);

create policy p_caixa_transacoes_all on public.caixa_transacoes
  for all to authenticated
  using (public.can_access_filial(filial_id))
  with check (public.can_access_filial(filial_id));

commit;
