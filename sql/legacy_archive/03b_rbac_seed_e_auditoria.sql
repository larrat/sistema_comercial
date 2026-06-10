-- 03b_rbac_seed_e_auditoria.sql
-- Passo 1 (RBAC): seed inicial + auditoria operacional.
-- Execute no SQL Editor do Supabase após rodar 03_rbac_v1.sql.

begin;

-- 1) Seed inicial:
-- cria perfil "operador" para todo usuário autenticado que ainda não possui linha em user_perfis.
insert into public.user_perfis (user_id, papel)
select u.id, 'operador'
from auth.users u
left join public.user_perfis up on up.user_id = u.id
where up.user_id is null
  and u.id is not null;

commit;

-- ==========================================================
-- 2) Promoção de perfis (execute conforme necessidade)
-- ==========================================================
-- Exemplo por e-mail:
-- update public.user_perfis up
-- set papel = 'admin'
-- from auth.users u
-- where up.user_id = u.id
--   and lower(u.email) = lower('seu-admin@empresa.com');

-- Exemplo por UUID:
-- update public.user_perfis
-- set papel = 'gerente'
-- where user_id = '00000000-0000-0000-0000-000000000000';

-- ==========================================================
-- 3) Auditoria rápida
-- ==========================================================

-- 3.1 Usuários e papéis atuais
select
  u.id as user_id,
  u.email,
  coalesce(up.papel, 'sem_perfil') as papel,
  up.criado_em,
  up.atualizado_em
from auth.users u
left join public.user_perfis up on up.user_id = u.id
order by u.created_at desc;

-- 3.2 Contagem por papel
select papel, count(*) as total
from public.user_perfis
group by papel
order by papel;

-- 3.3 Usuários ainda sem perfil (deve retornar 0 após seed)
select
  u.id as user_id,
  u.email,
  u.created_at
from auth.users u
left join public.user_perfis up on up.user_id = u.id
where up.user_id is null
order by u.created_at desc;

