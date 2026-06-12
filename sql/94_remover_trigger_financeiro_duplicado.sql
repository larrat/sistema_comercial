-- 94_remover_trigger_financeiro_duplicado.sql
-- Objetivo: Remover o trigger duplicado de contas a receber introduzido pelo script 93,
-- já que o script 55 (trg_pedidos_sync) já faz a sincronização financeira e de estoque
-- utilizando o prefixo 'REC-' no ID da conta. Também limpa a sujeira gerada.

begin;

-- 1. Remover o gatilho duplicado
drop trigger if exists trg_pedido_to_contas_receber on public.pedidos;
drop function if exists public.fn_pedido_to_contas_receber();

-- 2. Limpar a sujeira (contas_receber duplicadas)
-- O script 93 criava contas_receber com id = pedido_id.
-- O correto (do script 55) cria com id = 'REC-' || pedido_id.
-- Então podemos apagar com segurança as duplicatas geradas com id = pedido_id.
delete from public.contas_receber 
where id = pedido_id;

commit;
