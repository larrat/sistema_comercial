-- 03_rbac_v1.sql
-- RBAC v1 por usuário autenticado.
-- Papéis suportados: admin, gerente, operador.

begin;

create table if not exists public.user_perfis (
  user_id uuid primary key,
  papel text not null default 'operador',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint ck_user_perfis_papel check (papel in ('admin', 'gerente', 'operador'))
);

create index if not exists ix_user_perfis_papel on public.user_perfis (papel);

create or replace function public.set_updated_at_user_perfis()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end
$$;

drop trigger if exists trg_user_perfis_updated_at on public.user_perfis;
create trigger trg_user_perfis_updated_at
before update on public.user_perfis
for each row execute function public.set_updated_at_user_perfis();

alter table public.user_perfis enable row level security;

-- Cada usuário autenticado só enxerga seu próprio papel.
drop policy if exists p_user_perfis_select_own on public.user_perfis;
create policy p_user_perfis_select_own on public.user_perfis
for select to authenticated
using (user_id = auth.uid());

-- Escrita de user_perfis deve ser feita por service role/SQL admin.
drop policy if exists p_user_perfis_write_own on public.user_perfis;

-- Função utilitária para consulta de papel em regras futuras.
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(
    (select up.papel from public.user_perfis up where up.user_id = auth.uid() limit 1),
    'operador'
  );
$$;

commit;
