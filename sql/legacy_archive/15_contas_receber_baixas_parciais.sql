-- 15_contas_receber_baixas_parciais.sql
-- Evolui contas a receber para suportar baixa parcial com historico simples.

begin;

alter table public.contas_receber
  add column if not exists valor_recebido numeric not null default 0,
  add column if not exists valor_em_aberto numeric not null default 0,
  add column if not exists ultimo_recebimento_em timestamptz;

update public.contas_receber
set
  valor_recebido = case
    when status = 'recebido' then coalesce(valor, 0)
    else greatest(coalesce(valor_recebido, 0), 0)
  end,
  valor_em_aberto = case
    when status = 'recebido' then 0
    else greatest(coalesce(valor, 0) - coalesce(valor_recebido, 0), 0)
  end,
  ultimo_recebimento_em = case
    when status = 'recebido' then coalesce(recebido_em, ultimo_recebimento_em)
    else ultimo_recebimento_em
  end
where true;

create table if not exists public.contas_receber_baixas (
  id text primary key,
  filial_id text not null,
  conta_receber_id text not null references public.contas_receber(id) on delete cascade,
  pedido_id text,
  pedido_num integer,
  cliente_id text,
  cliente text not null,
  valor numeric not null,
  recebido_em timestamptz not null default now(),
  observacao text,
  criado_em timestamptz not null default now(),
  constraint ck_contas_receber_baixas_valor_positive check (valor > 0)
);

create index if not exists ix_cr_baixas_filial_recebido_em
  on public.contas_receber_baixas (filial_id, recebido_em desc);

create index if not exists ix_cr_baixas_conta
  on public.contas_receber_baixas (conta_receber_id);

alter table public.contas_receber_baixas enable row level security;

drop policy if exists p_contas_receber_baixas_all on public.contas_receber_baixas;
create policy p_contas_receber_baixas_all on public.contas_receber_baixas
  for all to authenticated
  using (public.can_access_filial(filial_id))
  with check (public.can_access_filial(filial_id));

commit;
