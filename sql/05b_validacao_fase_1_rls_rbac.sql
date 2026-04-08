-- 05b_validacao_fase_1_rls_rbac.sql
-- Validacao operacional da Fase 1.
-- Objetivo: confirmar que o ambiente segue o caminho oficial 02/03/04/05
-- e que nao depende do caminho inseguro 01b.

-- ==========================================================
-- 1) Politicas abertas para anon (esperado: zero linhas)
-- ==========================================================
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and 'anon' = any(roles)
order by tablename, policyname;

-- ==========================================================
-- 2) Tabelas criticas com RLS habilitada (esperado: todas true)
-- ==========================================================
select
  c.relname as tabela,
  c.relrowsecurity as rls_habilitada,
  c.relforcerowsecurity as rls_forcada
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'filiais',
    'user_filiais',
    'user_perfis',
    'produtos',
    'clientes',
    'pedidos',
    'fornecedores',
    'cotacao_precos',
    'cotacao_historico',
    'cotacao_layouts',
    'cotacao_config',
    'movimentacoes',
    'notas',
    'jogos_agenda',
    'campanhas',
    'campanha_envios',
    'acessos_auditoria'
  )
order by c.relname;

-- ==========================================================
-- 3) Funcoes de seguranca esperadas (esperado: todas presentes)
-- ==========================================================
select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'can_access_filial',
    'current_user_role',
    'is_admin'
  )
order by routine_name;

-- ==========================================================
-- 4) Politicas oficiais das tabelas criticas
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
  and tablename in (
    'filiais',
    'user_filiais',
    'user_perfis',
    'clientes',
    'produtos',
    'pedidos',
    'campanhas',
    'campanha_envios',
    'acessos_auditoria'
  )
order by tablename, policyname;

-- ==========================================================
-- 5) Usuarios sem perfil (esperado: zero)
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
-- 6) Usuarios com perfil mas sem vinculo de filial
-- esperado: zero para usuarios ativos nao-admin
-- ==========================================================
select
  up.user_id,
  u.email,
  up.papel
from public.user_perfis up
left join auth.users u on u.id = up.user_id
left join public.user_filiais uf on uf.user_id = up.user_id
where up.papel <> 'admin'
  and uf.user_id is null
order by up.papel, up.user_id;

-- ==========================================================
-- 7) Vinculos invalidos com filial inexistente (esperado: zero)
-- ==========================================================
select
  uf.user_id,
  uf.filial_id
from public.user_filiais uf
left join public.filiais f on f.id = uf.filial_id
where f.id is null;

-- ==========================================================
-- 8) Auditoria administrativa pronta
-- esperado: tabela presente, select/insert admin-only
-- ==========================================================
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'acessos_auditoria'
order by policyname;

-- ==========================================================
-- 9) Resumo executivo da Fase 1
-- ==========================================================
select
  (select count(*) from pg_policies where schemaname = 'public' and 'anon' = any(roles)) as politicas_anon_abertas,
  (select count(*) from auth.users u left join public.user_perfis up on up.user_id = u.id where up.user_id is null) as usuarios_sem_perfil,
  (
    select count(*)
    from public.user_perfis up
    left join public.user_filiais uf on uf.user_id = up.user_id
    where up.papel <> 'admin'
      and uf.user_id is null
  ) as usuarios_sem_filial,
  (select count(*) from public.user_filiais uf left join public.filiais f on f.id = uf.filial_id where f.id is null) as vinculos_filial_invalidos;
