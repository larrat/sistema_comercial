-- 13_contas_receber.sql
-- Cria tabela de contas a receber gerada automaticamente ao marcar pedido como entregue.
-- Pre-requisito: 02_rls_producao.sql (função can_access_filial já existente).

begin;

create table if not exists public.contas_receber (
  id          text        primary key,
  filial_id   text        not null,
  pedido_id   text        not null,
  pedido_num  integer,
  cliente_id  text,
  cliente     text        not null,
  valor       numeric     not null default 0,
  vencimento  date        not null,
  status      text        not null default 'pendente', -- pendente | recebido | vencido
  recebido_em timestamptz,
  obs         text,
  criado_em   timestamptz not null default now()
);

create index if not exists ix_cr_filial_status
  on public.contas_receber (filial_id, status);

create index if not exists ix_cr_filial_vencimento
  on public.contas_receber (filial_id, vencimento);

create index if not exists ix_cr_pedido
  on public.contas_receber (pedido_id);

-- RLS
alter table public.contas_receber enable row level security;

drop policy if exists p_contas_receber_all on public.contas_receber;
create policy p_contas_receber_all on public.contas_receber
  for all to authenticated
  using (public.can_access_filial(filial_id))
  with check (public.can_access_filial(filial_id));

commit;
