begin;

do $$
begin
  if exists (
    select 1
    from (
      select filial_id, lower(regexp_replace(coalesce(doc, ''), '[^0-9A-Za-z]+', '', 'g')) as doc_norm
      from public.clientes
    ) t
    where nullif(t.doc_norm, '') is not null
    group by filial_id, doc_norm
    having count(*) > 1
  ) then
    raise exception 'Nao foi possivel criar a unicidade de clientes: existem documentos duplicados por filial.';
  end if;

  if exists (
    select 1
    from (
      select filial_id, lower(trim(coalesce(email, ''))) as email_norm
      from public.clientes
    ) t
    where nullif(t.email_norm, '') is not null
    group by filial_id, email_norm
    having count(*) > 1
  ) then
    raise exception 'Nao foi possivel criar a unicidade de clientes: existem e-mails duplicados por filial.';
  end if;

  if exists (
    select 1
    from (
      select filial_id, regexp_replace(coalesce(tel, ''), '\D+', '', 'g') as tel_norm
      from public.clientes
    ) t
    where nullif(t.tel_norm, '') is not null
    group by filial_id, tel_norm
    having count(*) > 1
  ) then
    raise exception 'Nao foi possivel criar a unicidade de clientes: existem telefones duplicados por filial.';
  end if;

  if exists (
    select 1
    from (
      select filial_id, regexp_replace(coalesce(whatsapp, ''), '\D+', '', 'g') as whatsapp_norm
      from public.clientes
    ) t
    where nullif(t.whatsapp_norm, '') is not null
    group by filial_id, whatsapp_norm
    having count(*) > 1
  ) then
    raise exception 'Nao foi possivel criar a unicidade de clientes: existem WhatsApps duplicados por filial.';
  end if;

  if exists (
    select 1
    from public.clientes a
    join public.clientes b
      on b.filial_id = a.filial_id
     and b.id <> a.id
     and (
       regexp_replace(coalesce(a.tel, ''), '\D+', '', 'g') = regexp_replace(coalesce(b.whatsapp, ''), '\D+', '', 'g')
       or regexp_replace(coalesce(a.whatsapp, ''), '\D+', '', 'g') = regexp_replace(coalesce(b.tel, ''), '\D+', '', 'g')
     )
    where nullif(regexp_replace(coalesce(a.tel, ''), '\D+', '', 'g'), '') is not null
       or nullif(regexp_replace(coalesce(a.whatsapp, ''), '\D+', '', 'g'), '') is not null
  ) then
    raise exception 'Nao foi possivel criar a unicidade de clientes: existem conflitos cruzados entre telefone e WhatsApp na mesma filial.';
  end if;
end $$;

create unique index if not exists ux_clientes_filial_doc_norm
  on public.clientes (
    filial_id,
    lower(regexp_replace(coalesce(doc, ''), '[^0-9A-Za-z]+', '', 'g'))
  )
  where nullif(regexp_replace(coalesce(doc, ''), '[^0-9A-Za-z]+', '', 'g'), '') is not null;

create unique index if not exists ux_clientes_filial_email_norm
  on public.clientes (
    filial_id,
    lower(trim(coalesce(email, '')))
  )
  where nullif(trim(coalesce(email, '')), '') is not null;

create unique index if not exists ux_clientes_filial_tel_norm
  on public.clientes (
    filial_id,
    regexp_replace(coalesce(tel, ''), '\D+', '', 'g')
  )
  where nullif(regexp_replace(coalesce(tel, ''), '\D+', '', 'g'), '') is not null;

create unique index if not exists ux_clientes_filial_whatsapp_norm
  on public.clientes (
    filial_id,
    regexp_replace(coalesce(whatsapp, ''), '\D+', '', 'g')
  )
  where nullif(regexp_replace(coalesce(whatsapp, ''), '\D+', '', 'g'), '') is not null;

create or replace function public.enforce_cliente_identity_uniqueness()
returns trigger
language plpgsql
as $$
declare
  v_doc_norm text := lower(regexp_replace(coalesce(new.doc, ''), '[^0-9A-Za-z]+', '', 'g'));
  v_email_norm text := lower(trim(coalesce(new.email, '')));
  v_tel_norm text := regexp_replace(coalesce(new.tel, ''), '\D+', '', 'g');
  v_whatsapp_norm text := regexp_replace(coalesce(new.whatsapp, ''), '\D+', '', 'g');
begin
  if nullif(v_doc_norm, '') is not null and exists (
    select 1
    from public.clientes c
    where c.filial_id = new.filial_id
      and c.id <> new.id
      and lower(regexp_replace(coalesce(c.doc, ''), '[^0-9A-Za-z]+', '', 'g')) = v_doc_norm
  ) then
    raise exception using errcode = '23505', message = 'duplicate key value violates unique constraint "ux_clientes_filial_doc_norm"';
  end if;

  if nullif(v_email_norm, '') is not null and exists (
    select 1
    from public.clientes c
    where c.filial_id = new.filial_id
      and c.id <> new.id
      and lower(trim(coalesce(c.email, ''))) = v_email_norm
  ) then
    raise exception using errcode = '23505', message = 'duplicate key value violates unique constraint "ux_clientes_filial_email_norm"';
  end if;

  if nullif(v_tel_norm, '') is not null and exists (
    select 1
    from public.clientes c
    where c.filial_id = new.filial_id
      and c.id <> new.id
      and (
        regexp_replace(coalesce(c.tel, ''), '\D+', '', 'g') = v_tel_norm
        or regexp_replace(coalesce(c.whatsapp, ''), '\D+', '', 'g') = v_tel_norm
      )
  ) then
    raise exception using errcode = '23505', message = 'duplicate key value violates unique constraint "ux_clientes_filial_tel_identity"';
  end if;

  if nullif(v_whatsapp_norm, '') is not null and exists (
    select 1
    from public.clientes c
    where c.filial_id = new.filial_id
      and c.id <> new.id
      and (
        regexp_replace(coalesce(c.tel, ''), '\D+', '', 'g') = v_whatsapp_norm
        or regexp_replace(coalesce(c.whatsapp, ''), '\D+', '', 'g') = v_whatsapp_norm
      )
  ) then
    raise exception using errcode = '23505', message = 'duplicate key value violates unique constraint "ux_clientes_filial_whatsapp_identity"';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_clientes_identity_uniqueness on public.clientes;

create trigger trg_clientes_identity_uniqueness
before insert or update on public.clientes
for each row
execute function public.enforce_cliente_identity_uniqueness();

commit;
