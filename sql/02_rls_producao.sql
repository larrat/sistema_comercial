-- 02_rls_producao.sql
-- CAMINHO OFICIAL PARA AMBIENTE SEGURO.
-- Objetivo: modelo RLS seguro por filial para ambiente de producao.
-- Pre-requisito: app usar autenticacao Supabase (auth.uid()).
-- Ordem recomendada:
--   1) 01_schema_alignment.sql
--   2) 02_rls_producao.sql
--   3) 03_rbac_v1.sql
--   4) 04_rbac_v2_admin_only.sql
--   5) 05_rbac_auditoria_acessos.sql
-- Nao combinar com 01b_rls_anon_dev.sql no mesmo ambiente.

begin;

-- Mapeia usuários para filiais autorizadas
create table if not exists public.user_filiais (
  user_id uuid not null,
  filial_id text not null,
  criado_em timestamptz not null default now(),
  primary key (user_id, filial_id)
);

create index if not exists ix_user_filiais_filial on public.user_filiais (filial_id);

-- Função utilitária para políticas
create or replace function public.can_access_filial(fid text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_filiais uf
    where uf.user_id = auth.uid()
      and uf.filial_id = fid
  );
$$;

-- Tabelas multi-filial (com filial_id)
alter table public.produtos enable row level security;
alter table public.clientes enable row level security;
alter table public.pedidos enable row level security;
alter table public.fornecedores enable row level security;
alter table public.cotacao_precos enable row level security;
alter table public.cotacao_historico enable row level security;
alter table public.cotacao_layouts enable row level security;
alter table public.cotacao_config enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.jogos_agenda enable row level security;
alter table public.campanhas enable row level security;
alter table public.campanha_envios enable row level security;

-- Tabelas sem filial_id direto, mas ligadas por FK lógica
alter table public.notas enable row level security;
alter table public.filiais enable row level security;
alter table public.user_filiais enable row level security;

-- Limpeza de políticas antigas (nomes padrão deste script)
drop policy if exists p_filiais_select on public.filiais;
drop policy if exists p_filiais_insert on public.filiais;
drop policy if exists p_filiais_update on public.filiais;
drop policy if exists p_filiais_delete on public.filiais;

drop policy if exists p_user_filiais_select on public.user_filiais;
drop policy if exists p_user_filiais_write on public.user_filiais;

-- Filiais: usuário vê apenas filiais vinculadas
create policy p_filiais_select on public.filiais
for select to authenticated
using (public.can_access_filial(id));

create policy p_filiais_insert on public.filiais
for insert to authenticated
with check (true);

create policy p_filiais_update on public.filiais
for update to authenticated
using (public.can_access_filial(id))
with check (public.can_access_filial(id));

create policy p_filiais_delete on public.filiais
for delete to authenticated
using (public.can_access_filial(id));

-- user_filiais: cada usuário enxerga só seus vínculos
create policy p_user_filiais_select on public.user_filiais
for select to authenticated
using (user_id = auth.uid());

create policy p_user_filiais_write on public.user_filiais
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Macro para tabelas com filial_id (repetido explicitamente)
-- produtos
drop policy if exists p_produtos_all on public.produtos;
create policy p_produtos_all on public.produtos
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- clientes
drop policy if exists p_clientes_all on public.clientes;
create policy p_clientes_all on public.clientes
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- pedidos
drop policy if exists p_pedidos_all on public.pedidos;
create policy p_pedidos_all on public.pedidos
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- fornecedores
drop policy if exists p_fornecedores_all on public.fornecedores;
create policy p_fornecedores_all on public.fornecedores
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- cotacao_precos
drop policy if exists p_cotacao_precos_all on public.cotacao_precos;
create policy p_cotacao_precos_all on public.cotacao_precos
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- cotacao_historico
drop policy if exists p_cotacao_historico_all on public.cotacao_historico;
create policy p_cotacao_historico_all on public.cotacao_historico
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- cotacao_layouts
drop policy if exists p_cotacao_layouts_all on public.cotacao_layouts;
create policy p_cotacao_layouts_all on public.cotacao_layouts
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- cotacao_config
drop policy if exists p_cotacao_config_all on public.cotacao_config;
create policy p_cotacao_config_all on public.cotacao_config
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- movimentacoes
drop policy if exists p_movimentacoes_all on public.movimentacoes;
create policy p_movimentacoes_all on public.movimentacoes
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- jogos_agenda
drop policy if exists p_jogos_agenda_all on public.jogos_agenda;
create policy p_jogos_agenda_all on public.jogos_agenda
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- campanhas
drop policy if exists p_campanhas_all on public.campanhas;
create policy p_campanhas_all on public.campanhas
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- campanha_envios
drop policy if exists p_campanha_envios_all on public.campanha_envios;
create policy p_campanha_envios_all on public.campanha_envios
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

-- notas: depende de cliente_id -> clientes.filial_id
drop policy if exists p_notas_all on public.notas;
create policy p_notas_all on public.notas
for all to authenticated
using (
  exists (
    select 1
    from public.clientes c
    where c.id = notas.cliente_id
      and public.can_access_filial(c.filial_id)
  )
)
with check (
  exists (
    select 1
    from public.clientes c
    where c.id = notas.cliente_id
      and public.can_access_filial(c.filial_id)
  )
);

commit;
