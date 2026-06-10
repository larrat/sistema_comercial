begin;

create table if not exists public.cliente_fidelidade_saldos (
  cliente_id text primary key references public.clientes(id) on delete cascade,
  filial_id text not null references public.filiais(id) on delete cascade,
  saldo_pontos numeric not null default 0,
  total_acumulado numeric not null default 0,
  total_resgatado numeric not null default 0,
  bloqueado boolean not null default false,
  motivo_bloqueio text null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint ck_cliente_fidelidade_saldos_non_negative
    check (saldo_pontos >= 0 and total_acumulado >= 0 and total_resgatado >= 0)
);

create table if not exists public.cliente_fidelidade_lancamentos (
  id text primary key,
  cliente_id text not null references public.clientes(id) on delete cascade,
  filial_id text not null references public.filiais(id) on delete cascade,
  pedido_id text null references public.pedidos(id) on delete set null,
  tipo text not null default 'credito',
  status text not null default 'confirmado',
  pontos numeric not null,
  origem text null,
  observacao text null,
  metadata jsonb not null default '{}'::jsonb,
  criado_por text null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint ck_cliente_fidelidade_lanc_tipo
    check (tipo in ('credito', 'debito', 'ajuste', 'expiracao', 'estorno')),
  constraint ck_cliente_fidelidade_lanc_status
    check (status in ('pendente', 'confirmado', 'cancelado')),
  constraint ck_cliente_fidelidade_lanc_pontos_non_zero
    check (pontos <> 0)
);

alter table if exists public.cliente_fidelidade_saldos enable row level security;
alter table if exists public.cliente_fidelidade_lancamentos enable row level security;

create index if not exists ix_cliente_fidelidade_saldos_filial
  on public.cliente_fidelidade_saldos (filial_id);

create index if not exists ix_cliente_fidelidade_lanc_cliente_criado
  on public.cliente_fidelidade_lancamentos (cliente_id, criado_em desc);

create index if not exists ix_cliente_fidelidade_lanc_filial_criado
  on public.cliente_fidelidade_lancamentos (filial_id, criado_em desc);

create unique index if not exists ux_cliente_fidelidade_credito_pedido
  on public.cliente_fidelidade_lancamentos (cliente_id, pedido_id, coalesce(origem, ''))
  where pedido_id is not null
    and tipo = 'credito'
    and status <> 'cancelado';

create or replace function public.cliente_tem_suspeita_duplicidade(p_cliente_id text)
returns boolean
language sql
stable
as $$
  with alvo as (
    select
      c.id,
      c.filial_id,
      lower(regexp_replace(coalesce(c.doc, ''), '[^0-9A-Za-z]+', '', 'g')) as doc_norm,
      lower(trim(coalesce(c.email, ''))) as email_norm,
      regexp_replace(coalesce(c.tel, ''), '\D+', '', 'g') as tel_norm,
      regexp_replace(coalesce(c.whatsapp, ''), '\D+', '', 'g') as whatsapp_norm
    from public.clientes c
    where c.id = p_cliente_id
    limit 1
  )
  select exists (
    select 1
    from alvo a
    join public.clientes c
      on c.filial_id = a.filial_id
     and c.id <> a.id
    where (
      nullif(a.doc_norm, '') is not null
      and lower(regexp_replace(coalesce(c.doc, ''), '[^0-9A-Za-z]+', '', 'g')) = a.doc_norm
    ) or (
      nullif(a.email_norm, '') is not null
      and lower(trim(coalesce(c.email, ''))) = a.email_norm
    ) or (
      nullif(a.tel_norm, '') is not null
      and (
        regexp_replace(coalesce(c.tel, ''), '\D+', '', 'g') = a.tel_norm
        or regexp_replace(coalesce(c.whatsapp, ''), '\D+', '', 'g') = a.tel_norm
      )
    ) or (
      nullif(a.whatsapp_norm, '') is not null
      and (
        regexp_replace(coalesce(c.tel, ''), '\D+', '', 'g') = a.whatsapp_norm
        or regexp_replace(coalesce(c.whatsapp, ''), '\D+', '', 'g') = a.whatsapp_norm
      )
    )
  );
$$;

create or replace function public.refresh_cliente_fidelidade_saldo(p_cliente_id text)
returns void
language plpgsql
as $$
declare
  v_filial_id text;
  v_bloqueado boolean;
  v_motivo text;
  v_total_creditos numeric := 0;
  v_total_debitos numeric := 0;
begin
  select filial_id
    into v_filial_id
  from public.clientes
  where id = p_cliente_id
  limit 1;

  if v_filial_id is null then
    return;
  end if;

  v_bloqueado := public.cliente_tem_suspeita_duplicidade(p_cliente_id);
  v_motivo := case when v_bloqueado then 'Duplicidade suspeita de identidade do cliente. Acumulo bloqueado ate saneamento.' else null end;

  select
    coalesce(sum(case when status = 'confirmado' and pontos > 0 then pontos else 0 end), 0),
    coalesce(sum(case when status = 'confirmado' and pontos < 0 then abs(pontos) else 0 end), 0)
    into v_total_creditos, v_total_debitos
  from public.cliente_fidelidade_lancamentos
  where cliente_id = p_cliente_id;

  insert into public.cliente_fidelidade_saldos (
    cliente_id,
    filial_id,
    saldo_pontos,
    total_acumulado,
    total_resgatado,
    bloqueado,
    motivo_bloqueio,
    atualizado_em
  )
  values (
    p_cliente_id,
    v_filial_id,
    greatest(v_total_creditos - v_total_debitos, 0),
    v_total_creditos,
    v_total_debitos,
    v_bloqueado,
    v_motivo,
    now()
  )
  on conflict (cliente_id) do update
  set filial_id = excluded.filial_id,
      saldo_pontos = excluded.saldo_pontos,
      total_acumulado = excluded.total_acumulado,
      total_resgatado = excluded.total_resgatado,
      bloqueado = excluded.bloqueado,
      motivo_bloqueio = excluded.motivo_bloqueio,
      atualizado_em = now();
end;
$$;

create or replace function public.enforce_cliente_fidelidade_lancamento()
returns trigger
language plpgsql
as $$
begin
  if new.cliente_id is null or trim(new.cliente_id) = '' then
    raise exception using errcode = '23514', message = 'cliente_id obrigatorio para fidelidade';
  end if;

  if public.cliente_tem_suspeita_duplicidade(new.cliente_id) then
    raise exception using
      errcode = '23514',
      message = 'fidelidade bloqueada por suspeita de duplicidade do cliente';
  end if;

  if new.pedido_id is not null and trim(new.pedido_id) <> '' and new.tipo = 'credito' and exists (
    select 1
    from public.cliente_fidelidade_lancamentos l
    where l.cliente_id = new.cliente_id
      and l.id <> coalesce(new.id, '')
      and l.pedido_id = new.pedido_id
      and l.tipo = 'credito'
      and l.status <> 'cancelado'
      and coalesce(l.origem, '') = coalesce(new.origem, '')
  ) then
    raise exception using
      errcode = '23505',
      message = 'duplicate key value violates unique constraint "ux_cliente_fidelidade_credito_pedido"';
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

create or replace function public.sync_cliente_fidelidade_saldo()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_cliente_fidelidade_saldo(coalesce(new.cliente_id, old.cliente_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_cliente_fidelidade_on_cliente_change()
returns trigger
language plpgsql
as $$
declare
  v_target_id text := coalesce(new.id, old.id);
begin
  if v_target_id is not null and trim(v_target_id) <> '' then
    perform public.refresh_cliente_fidelidade_saldo(v_target_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_cliente_fidelidade_lancamento_guard on public.cliente_fidelidade_lancamentos;
create trigger trg_cliente_fidelidade_lancamento_guard
before insert or update on public.cliente_fidelidade_lancamentos
for each row
execute function public.enforce_cliente_fidelidade_lancamento();

drop trigger if exists trg_cliente_fidelidade_lancamento_sync on public.cliente_fidelidade_lancamentos;
create trigger trg_cliente_fidelidade_lancamento_sync
after insert or update or delete on public.cliente_fidelidade_lancamentos
for each row
execute function public.sync_cliente_fidelidade_saldo();

drop trigger if exists trg_cliente_fidelidade_refresh_on_cliente on public.clientes;
create trigger trg_cliente_fidelidade_refresh_on_cliente
after insert or update on public.clientes
for each row
execute function public.sync_cliente_fidelidade_on_cliente_change();

commit;
