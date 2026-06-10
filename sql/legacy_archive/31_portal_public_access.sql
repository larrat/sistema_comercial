-- 31_portal_public_access.sql
-- Objetivo: Liberar acesso de leitura estritamente necessário para o Portal de Clientes público (role anon)
-- e permissão segura de inserção de pedidos de venda de varejo.
--
-- Segurança RLS implementada:
-- 1. Qualquer visitante (anon) pode ler o nome e IDs das filiais para seletor dinâmico.
-- 2. Qualquer visitante (anon) pode ler produtos ativos (is_active = true) para navegar na vitrine.
-- 3. Qualquer visitante (anon) pode criar um novo pedido (INSERT), mas NUNCA ler (SELECT),
--    atualizar (UPDATE) ou deletar (DELETE) outros pedidos, protegendo dados de terceiros.

begin;

-- ==========================================
-- 0. Garantir existência da coluna origem_venda
-- ==========================================
alter table if exists public.pedidos
  add column if not exists origem_venda text;

create index if not exists ix_pedidos_filial_origem_venda_portal
  on public.pedidos (filial_id, origem_venda);

-- ==========================================
-- 1. Políticas de Leitura para Filiais (anon)
-- ==========================================
drop policy if exists p_filiais_anon_select on public.filiais;
create policy p_filiais_anon_select on public.filiais
for select to anon
using (true);

-- ==========================================
-- 2. Políticas de Leitura para Produtos (anon)
-- ==========================================
drop policy if exists p_produtos_anon_select on public.produtos;
create policy p_produtos_anon_select on public.produtos
for select to anon
using (is_active = true);

-- ==========================================
-- 3. Políticas de Inserção de Pedidos (anon)
-- ==========================================
-- Nota: anon pode inserir novos pedidos de venda, mas NÃO pode ler ou alterar nenhum pedido existente.
drop policy if exists p_pedidos_anon_insert on public.pedidos;
create policy p_pedidos_anon_insert on public.pedidos
for insert to anon
with check (origem_venda = 'portal');

commit;
