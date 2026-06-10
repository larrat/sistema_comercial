-- 04_rbac_v2_admin_only.sql
-- CAMINHO OFICIAL APOS 03_rbac_v1.sql.
-- RBAC v2: separa admin de gerente no banco (RLS/policies).
-- Pre-requisito:
--   1) 03_rbac_v1.sql aplicado
--   2) 02_rls_producao.sql aplicado

begin;

-- Utilitário: identifica usuário admin pelo perfil RBAC.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'admin';
$$;

-- ==========================================================
-- user_perfis (admin pode gerenciar perfis; usuário comum vê o próprio)
-- ==========================================================
drop policy if exists p_user_perfis_select_own on public.user_perfis;
create policy p_user_perfis_select_own on public.user_perfis
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists p_user_perfis_admin_write on public.user_perfis;
create policy p_user_perfis_admin_write on public.user_perfis
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ==========================================================
-- user_filiais (evita auto-elevação de privilégio)
-- ==========================================================
drop policy if exists p_user_filiais_select on public.user_filiais;
create policy p_user_filiais_select on public.user_filiais
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists p_user_filiais_write on public.user_filiais;
drop policy if exists p_user_filiais_admin_write on public.user_filiais;
create policy p_user_filiais_admin_write on public.user_filiais
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ==========================================================
-- filiais (admin-only para criar/editar/remover)
-- ==========================================================
drop policy if exists p_filiais_select on public.filiais;
create policy p_filiais_select on public.filiais
for select to authenticated
using (public.is_admin() or public.can_access_filial(id));

drop policy if exists p_filiais_insert on public.filiais;
create policy p_filiais_insert on public.filiais
for insert to authenticated
with check (public.is_admin());

drop policy if exists p_filiais_update on public.filiais;
create policy p_filiais_update on public.filiais
for update to authenticated
using (public.is_admin() or public.can_access_filial(id))
with check (public.is_admin() or public.can_access_filial(id));

drop policy if exists p_filiais_delete on public.filiais;
create policy p_filiais_delete on public.filiais
for delete to authenticated
using (public.is_admin() or public.can_access_filial(id));

commit;

