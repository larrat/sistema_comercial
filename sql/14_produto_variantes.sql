-- 14_produto_variantes.sql
-- Objetivo: adicionar suporte a produto pai/filho (variantes).
-- Um produto pai agrupa variantes (ex: CAMISA 1 LINHA → Brasil, Argentina, etc.)
-- Idempotente: pode rodar mais de uma vez.

begin;

-- Coluna de referência ao produto pai (self-referencial, nullable)
-- Tipo text para bater com o campo id de produtos (que é text, não uuid)
alter table public.produtos
  add column if not exists produto_pai_id text
    references public.produtos(id) on delete set null;

-- Index para consulta de variantes por pai
create index if not exists ix_produtos_pai
  on public.produtos (produto_pai_id)
  where produto_pai_id is not null;

commit;
