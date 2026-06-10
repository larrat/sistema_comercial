-- 01_schema_alignment.sql
-- Objetivo: alinhar o banco ao que o frontend atual usa via PostgREST/Supabase.
-- Idempotente: pode rodar mais de uma vez.

begin;

-- =============================
-- COLUNAS NOVAS / COMPATIBILIDADE
-- =============================
alter table if exists public.filiais
  add column if not exists criado_em timestamptz default now();

alter table if exists public.clientes
  add column if not exists time text;

alter table if exists public.campanhas
  add column if not exists criado_em timestamptz default now();

alter table if exists public.campanha_envios
  add column if not exists criado_em timestamptz default now();

alter table if exists public.notas
  add column if not exists criado_em timestamptz default now();

-- Compatibilidade temporária com payloads camelCase já salvos historicamente
alter table if exists public.movimentacoes
  add column if not exists "prodId" text,
  add column if not exists "saldoReal" numeric,
  add column if not exists "destFil" text,
  add column if not exists dest_fil text;

-- =============================
-- UNIQUE INDEXES (upsert/on_conflict)
-- =============================
create unique index if not exists ux_filiais_id on public.filiais (id);
create unique index if not exists ux_produtos_id on public.produtos (id);
create unique index if not exists ux_clientes_id on public.clientes (id);
create unique index if not exists ux_pedidos_id on public.pedidos (id);
create unique index if not exists ux_fornecedores_id on public.fornecedores (id);
create unique index if not exists ux_jogos_agenda_id on public.jogos_agenda (id);
create unique index if not exists ux_campanhas_id on public.campanhas (id);
create unique index if not exists ux_campanha_envios_id on public.campanha_envios (id);

create unique index if not exists ux_cotacao_precos_conflict
  on public.cotacao_precos (filial_id, produto_id, fornecedor_id);

create unique index if not exists ux_cotacao_historico_conflict
  on public.cotacao_historico (filial_id, produto_id, fornecedor_id, mes_ref);

create unique index if not exists ux_cotacao_layouts_conflict
  on public.cotacao_layouts (filial_id, fornecedor_id);

create unique index if not exists ux_cotacao_config_filial
  on public.cotacao_config (filial_id);

create unique index if not exists ux_campanha_envios_conflict
  on public.campanha_envios (campanha_id, cliente_id, canal, data_ref);

-- =============================
-- INDEXES DE CONSULTA
-- =============================
create index if not exists ix_produtos_filial on public.produtos (filial_id);
create index if not exists ix_clientes_filial on public.clientes (filial_id);
create index if not exists ix_pedidos_filial on public.pedidos (filial_id);
create index if not exists ix_fornecedores_filial on public.fornecedores (filial_id);
create index if not exists ix_movimentacoes_filial_ts on public.movimentacoes (filial_id, ts);
create index if not exists ix_jogos_agenda_filial_data on public.jogos_agenda (filial_id, data_hora);
create index if not exists ix_campanhas_filial_criado on public.campanhas (filial_id, criado_em desc);
create index if not exists ix_envios_filial_criado on public.campanha_envios (filial_id, criado_em desc);
create index if not exists ix_notas_cliente_criado on public.notas (cliente_id, criado_em desc);

commit;
