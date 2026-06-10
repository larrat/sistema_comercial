-- 60_portal_public_rls.sql
-- Objetivo: Permitir leitura anônima de Contratos, Cronogramas e Diários de Obra
--           para o Portal do Cliente (acesso via UUID que funciona como token).

begin;

-- 1. Contratos
drop policy if exists "Permitir leitura publica de contratos pelo ID" on public.contratos;
create policy "Permitir leitura publica de contratos pelo ID"
  on public.contratos
  for select
  to anon
  using (true);

-- 2. Cronograma
drop policy if exists "Permitir leitura publica de cronograma" on public.contrato_cronograma;
create policy "Permitir leitura publica de cronograma"
  on public.contrato_cronograma
  for select
  to anon
  using (true);

-- 3. Diário de Obra
drop policy if exists "Permitir leitura publica de diarios" on public.diario_obra;
create policy "Permitir leitura publica de diarios"
  on public.diario_obra
  for select
  to anon
  using (true);

-- 4. Clientes (para poder mostrar o nome do cliente no cabeçalho)
drop policy if exists "Permitir leitura publica de clientes" on public.clientes;
create policy "Permitir leitura publica de clientes"
  on public.clientes
  for select
  to anon
  using (true);

commit;
