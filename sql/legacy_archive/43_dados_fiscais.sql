-- 43_dados_fiscais.sql
-- Objetivo: Adicionar campos regulatórios necessários para a emissão de nota fiscal real (NF-e/NFC-e/NFS-e)
-- Idempotente: pode rodar mais de uma vez.

begin;

-- 1. Expansão da tabela de filiais
alter table if exists public.filiais
  add column if not exists cnpj text,
  add column if not exists inscricao_estadual text,
  add column if not exists inscricao_municipal text,
  add column if not exists regime_tributario integer, -- 1: Simples Nacional, 2: Simples Nac. - Excesso, 3: Regime Normal
  add column if not exists cep text,
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists bairro text,
  add column if not exists codigo_municipio text;

-- 2. Expansão da tabela de clientes
alter table if exists public.clientes
  add column if not exists inscricao_estadual text,
  add column if not exists cep text,
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists bairro text,
  add column if not exists codigo_municipio text;

-- 3. Expansão da tabela de produtos
alter table if exists public.produtos
  add column if not exists ncm text default '61091000',
  add column if not exists cest text,
  add column if not exists origem integer default 0,
  add column if not exists cfop_padrao text default '5102';

-- 4. Criação de índices de busca rápida
create index if not exists ix_produtos_ncm on public.produtos (ncm);
create index if not exists ix_filiais_cnpj on public.filiais (cnpj);

commit;
