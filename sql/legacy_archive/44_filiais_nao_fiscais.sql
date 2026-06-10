-- 44_filiais_nao_fiscais.sql
-- Objetivo: Adicionar coluna is_fiscal na tabela public.filiais para suporte a filiais Não Fiscais.
-- Idempotente: pode rodar mais de uma vez.

begin;

alter table if exists public.filiais
  add column if not exists is_fiscal boolean default false;

-- Atualizar filiais existentes para true se já possuírem CNPJ configurado
update public.filiais
  set is_fiscal = true
  where cnpj is not null and cnpj <> '';

commit;
