begin;

alter table if exists public.user_perfis
  add column if not exists user_nome text,
  add column if not exists user_email text;

alter table if exists public.user_filiais
  add column if not exists user_nome text,
  add column if not exists user_email text;

create index if not exists ix_user_perfis_user_email
  on public.user_perfis (user_email);

create index if not exists ix_user_filiais_user_email
  on public.user_filiais (user_email);

update public.user_perfis up
set
  user_nome = coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'nome'), ''),
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  user_email = u.email
from auth.users u
where u.id = up.user_id
  and (
    coalesce(trim(up.user_nome), '') = ''
    or coalesce(trim(up.user_email), '') = ''
  );

update public.user_filiais uf
set
  user_nome = coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'nome'), ''),
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  user_email = u.email
from auth.users u
where u.id = uf.user_id
  and (
    coalesce(trim(uf.user_nome), '') = ''
    or coalesce(trim(uf.user_email), '') = ''
  );

commit;
