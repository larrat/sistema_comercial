-- Esquema mínimo de teste. Não é uma migração e não usa dados reais.
create table public.pedidos (
  id text primary key,
  filial_id text not null,
  num integer not null,
  status text not null,
  fiscal_status text not null,
  itens jsonb,
  obs text
);

create table public.pedido_itens (
  pedido_id text not null references public.pedidos(id),
  filial_id text not null,
  produto_id text,
  qty integer not null,
  custo numeric(12, 2),
  preco numeric(12, 2)
);

create table public.contas_receber (
  id text primary key,
  pedido_id text not null references public.pedidos(id),
  filial_id text not null,
  status text not null,
  valor numeric(12, 2) not null,
  valor_em_aberto numeric(12, 2) not null,
  valor_recebido numeric(12, 2) not null,
  recebido_em timestamptz,
  ultimo_recebimento_em timestamptz
);

create table public.contas_receber_baixas (
  id text primary key,
  conta_receber_id text not null references public.contas_receber(id)
);

create table public.movimentacoes (
  id text primary key,
  filial_id text not null,
  prod_id text not null,
  "prodId" text not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  data date not null,
  qty integer not null check (qty > 0),
  custo numeric(12, 2) not null,
  obs text not null,
  ts bigint not null
);

-- Substituto explícito de autenticação: o cenário local opera só na filial fictícia.
create function public.can_access_filial(p_filial_id text)
returns boolean
language sql
immutable
as $$ select p_filial_id = 'FILIAL-DEMO' $$;
