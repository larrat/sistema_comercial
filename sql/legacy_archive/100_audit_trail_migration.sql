-- 100_audit_trail_migration.sql
-- Trilha de Auditoria Universal para Entidades de Negócio

begin;

create table if not exists public.logs_auditoria (
  id bigserial primary key,
  entity_type text not null, -- 'produto', 'cliente', 'pedido', etc.
  entity_id text not null,
  action text not null,      -- 'INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE'
  old_data jsonb,
  new_data jsonb,
  actor_id uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create index if not exists ix_logs_auditoria_entity 
  on public.logs_auditoria (entity_type, entity_id);

create index if not exists ix_logs_auditoria_criado_em 
  on public.logs_auditoria (criado_em desc);

alter table public.logs_auditoria enable row level security;

-- Somente admin pode ler a trilha completa
create policy p_logs_auditoria_select_admin on public.logs_auditoria
for select to authenticated
using (public.current_user_role() = 'admin');

-- Todos os usuários autenticados podem inserir logs (gerado pelo sistema via API)
create policy p_logs_auditoria_insert_auth on public.logs_auditoria
for insert to authenticated
with check (true);

commit;
