-- 05_rbac_auditoria_acessos.sql
-- CAMINHO OFICIAL APOS 04_rbac_v2_admin_only.sql.
-- Auditoria administrativa para alteracoes de perfis e vinculos RBAC.
-- Aplicar somente depois de validar RBAC e RLS do ambiente.

begin;

create table if not exists public.acessos_auditoria (
  id bigserial primary key,
  ator_user_id uuid,
  acao text not null,
  recurso text not null,
  alvo_user_id uuid,
  alvo_filial_id text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists ix_acessos_auditoria_criado_em
  on public.acessos_auditoria (criado_em desc);

create index if not exists ix_acessos_auditoria_ator
  on public.acessos_auditoria (ator_user_id);

create index if not exists ix_acessos_auditoria_alvo_user
  on public.acessos_auditoria (alvo_user_id);

alter table public.acessos_auditoria enable row level security;

-- Somente admin pode ler trilha completa.
drop policy if exists p_acessos_auditoria_select_admin on public.acessos_auditoria;
create policy p_acessos_auditoria_select_admin on public.acessos_auditoria
for select to authenticated
using (public.current_user_role() = 'admin');

-- Somente admin pode inserir eventos de auditoria administrativa.
drop policy if exists p_acessos_auditoria_insert_admin on public.acessos_auditoria;
create policy p_acessos_auditoria_insert_admin on public.acessos_auditoria
for insert to authenticated
with check (
  public.current_user_role() = 'admin'
  and coalesce(ator_user_id, auth.uid()) = auth.uid()
);

commit;
