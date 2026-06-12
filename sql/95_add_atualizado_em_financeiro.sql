begin;

-- Adiciona a coluna atualizado_em em contas_receber (e outras tabelas financeiras caso falte)
-- Isso resolve o erro "record 'new' has no field 'atualizado_em'" gerado pelo gatilho handle_updated_at

alter table public.contas_receber
add column if not exists atualizado_em timestamp with time zone;

alter table public.contas_pagar
add column if not exists atualizado_em timestamp with time zone;


commit;
