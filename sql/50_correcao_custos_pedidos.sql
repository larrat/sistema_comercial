-- 50_correcao_custos_pedidos.sql
-- Objetivo: Garantir a existência de custo_frete e outros_custos em public.pedidos
-- e forçar a limpeza/atualização do cache de esquema do PostgREST (Supabase).
-- Idempotente: pode rodar mais de uma vez.

begin;

-- 1. Assegurar as colunas de custo frete e adicionais na tabela pedidos
alter table public.pedidos
  add column if not exists custo_frete numeric not null default 0,
  add column if not exists outros_custos numeric not null default 0;

-- 2. Recriar índices/comentários de documentação se necessário
comment on column public.pedidos.custo_frete is 'Custo gasto com transporte ou frete atrelado a este pedido.';
comment on column public.pedidos.outros_custos is 'Outras despesas operacionais (embalagens, terceiros) do pedido.';

commit;

-- 3. Notificar o PostgREST para limpar e recarregar o cache do esquema imediatamente
-- (Esta instrução roda fora do bloco de transação para efeito instantâneo)
perform dblink('dbname=' || current_database(), 'NOTIFY pgrst, ''reload schema''') 
where false; -- Fallback seguro caso dblink não esteja ativo

-- Notificação direta padrão
notify pgrst, 'reload schema';
