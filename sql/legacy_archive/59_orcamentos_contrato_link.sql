-- 59_orcamentos_contrato_link.sql
-- Objetivo: Permitir que um orçamento aprovado guarde a referência do contrato gerado, evitando duplicidade.

begin;

alter table public.orcamentos_obra
  add column if not exists contrato_id uuid references public.contratos(id) on delete set null;

commit;
