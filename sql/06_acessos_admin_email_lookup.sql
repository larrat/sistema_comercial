-- 06_acessos_admin_email_lookup.sql
-- Permite a administradores resolver usuarios do Auth por e-mail
-- sem expor auth.users diretamente ao frontend.

begin;

create or replace function public.admin_access_users_index()
returns table (
  user_id uuid,
  nome text,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'forbidden';
  end if;

  return query
  select
    u.id as user_id,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'nome'), ''),
      split_part(coalesce(u.email, ''), '@', 1)
    )::text as nome,
    u.email::text as email,
    u.created_at
  from auth.users u
  order by u.created_at desc;
end;
$$;

create or replace function public.admin_lookup_user_by_email(p_email text)
returns table (
  user_id uuid,
  nome text,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'forbidden';
  end if;

  return query
  select
    u.id as user_id,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'nome'), ''),
      split_part(coalesce(u.email, ''), '@', 1)
    )::text as nome,
    u.email::text as email,
    u.created_at
  from auth.users u
  where lower(coalesce(u.email, '')) = lower(coalesce(trim(p_email), ''))
  limit 1;
end;
$$;

revoke all on function public.admin_access_users_index() from public;
revoke all on function public.admin_lookup_user_by_email(text) from public;

grant execute on function public.admin_access_users_index() to authenticated;
grant execute on function public.admin_lookup_user_by_email(text) to authenticated;

commit;
