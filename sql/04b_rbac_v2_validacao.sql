-- 04b_rbac_v2_validacao.sql
-- Validação operacional após aplicar 04_rbac_v2_admin_only.sql
-- Objetivo: confirmar consistência de perfis, vínculos e políticas.

-- ==========================================================
-- 1) Visão geral de usuários e papéis
-- ==========================================================
select
  u.id as user_id,
  u.email,
  coalesce(up.papel, 'sem_perfil') as papel,
  up.atualizado_em
from auth.users u
left join public.user_perfis up on up.user_id = u.id
order by u.created_at desc;

-- ==========================================================
-- 2) Usuários sem perfil (esperado: zero)
-- ==========================================================
select
  u.id as user_id,
  u.email,
  u.created_at
from auth.users u
left join public.user_perfis up on up.user_id = u.id
where up.user_id is null
order by u.created_at desc;

-- ==========================================================
-- 3) Distribuição por papel
-- ==========================================================
select
  papel,
  count(*) as total
from public.user_perfis
group by papel
order by papel;

-- ==========================================================
-- 4) Usuários sem vínculo de filial (esperado: zero para usuários ativos)
-- ==========================================================
select
  up.user_id,
  u.email,
  up.papel
from public.user_perfis up
left join auth.users u on u.id = up.user_id
left join public.user_filiais uf on uf.user_id = up.user_id
where uf.user_id is null
order by up.papel, up.user_id;

-- ==========================================================
-- 5) Duplicidades de vínculo usuário-filial (esperado: zero)
-- ==========================================================
select
  user_id,
  filial_id,
  count(*) as total
from public.user_filiais
group by user_id, filial_id
having count(*) > 1;

-- ==========================================================
-- 6) Integridade de vínculo com filial existente (esperado: zero)
-- ==========================================================
select
  uf.user_id,
  uf.filial_id
from public.user_filiais uf
left join public.filiais f on f.id = uf.filial_id
where f.id is null;

-- ==========================================================
-- 7) Auditoria de políticas existentes (deve listar políticas RBAC/RLS)
-- ==========================================================
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('user_perfis', 'user_filiais', 'filiais', 'clientes', 'produtos', 'pedidos', 'campanhas', 'campanha_envios')
order by tablename, policyname;

-- ==========================================================
-- 8) Resumo de prontidão RBAC v2
-- ==========================================================
select
  (select count(*) from auth.users) as total_auth_users,
  (select count(*) from public.user_perfis) as total_user_perfis,
  (select count(*) from auth.users u left join public.user_perfis up on up.user_id = u.id where up.user_id is null) as usuarios_sem_perfil,
  (select count(*) from public.user_filiais uf left join public.filiais f on f.id = uf.filial_id where f.id is null) as vinculos_filial_invalidos;

