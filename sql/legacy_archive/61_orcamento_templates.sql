-- 61_orcamento_templates.sql
-- Objetivo: Criar tabelas para Templates de Combos de Reforma (ex: "Banheiro Zero").
-- Idempotente: sim.

begin;

create table if not exists public.orcamento_templates (
  id uuid primary key default gen_random_uuid(),
  filial_id text not null references public.filiais(id) on delete cascade,
  titulo text not null,
  bdi_percentual numeric(5,2) not null default 30.00,
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now()
);

create table if not exists public.orcamento_template_itens (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.orcamento_templates(id) on delete cascade,
  ambiente text not null default 'Geral',
  ordem_apresentacao integer not null default 0,
  descricao_servico text not null,
  unidade text not null default 'un',
  quantidade numeric(12,2) not null default 1,
  custo_material_unitario numeric(12,2) not null default 0,
  custo_mao_obra_unitario numeric(12,2) not null default 0
);

create index if not exists ix_orc_templates_filial on public.orcamento_templates(filial_id);
create index if not exists ix_orc_template_itens_tmpl on public.orcamento_template_itens(template_id);

alter table public.orcamento_templates enable row level security;
alter table public.orcamento_template_itens enable row level security;

do $$ begin
  create policy "Acesso aos templates por filial"
    on public.orcamento_templates
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "Acesso aos itens de template"
    on public.orcamento_template_itens
    for all to authenticated
    using (
      template_id in (
        select id from public.orcamento_templates where public.can_access_filial(filial_id)
      )
    )
    with check (
      template_id in (
        select id from public.orcamento_templates where public.can_access_filial(filial_id)
      )
    );
exception
  when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.orcamento_templates to authenticated;
grant select, insert, update, delete on public.orcamento_template_itens to authenticated;

-- Inserir um template padrão como exemplo
insert into public.orcamento_templates (id, filial_id, titulo, bdi_percentual)
select gen_random_uuid(), id, 'Pacote Banheiro Zero', 30.00
from public.filiais limit 1
on conflict do nothing;

commit;
