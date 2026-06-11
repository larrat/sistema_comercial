-- 93_pedidos_financeiro_sync.sql
-- Objetivo: Criar automação robusta para gerar "Contas a Receber" quando um Pedido de venda é fechado.

begin;

create or replace function public.fn_pedido_to_contas_receber()
returns trigger as $$
declare
    v_vencimento date;
    v_status text;
    v_recebido_em timestamptz;
begin
    -- Só atua se o pedido estiver com status de fechamento/faturamento e tiver valor
    if NEW.status in ('concluido', 'confirmado', 'em_separacao', 'entregue_aguardando_pagamento', 'pago_aguardando_entrega') and coalesce(NEW.total, 0) > 0 then
        
        -- 1. Calcular Vencimento baseado na regra de negócio
        if NEW.prazo = 'imediato' then
            v_vencimento := (NEW.data::date);
        elsif NEW.prazo = '7d' then
            v_vencimento := (NEW.data::date) + interval '7 days';
        elsif NEW.prazo = '15d' then
            v_vencimento := (NEW.data::date) + interval '15 days';
        elsif NEW.prazo = '30d' then
            v_vencimento := (NEW.data::date) + interval '30 days';
        elsif NEW.prazo = '60d' then
            v_vencimento := (NEW.data::date) + interval '60 days';
        elsif NEW.prazo = '90d' then
            v_vencimento := (NEW.data::date) + interval '90 days';
        else
            -- Fallback para prazo não reconhecido
            v_vencimento := (NEW.data::date) + interval '30 days';
        end if;

        -- 2. Calcular Status baseado na forma de Pagamento
        if NEW.pgto in ('a_vista', 'pix', 'dinheiro', 'cartao', 'debito') then
            v_status := 'recebido';
            v_recebido_em := now();
        else
            -- fiado, boleto, cheque, misto, etc.
            v_status := 'pendente';
            v_recebido_em := null;
        end if;

        -- 3. Inserir ou Atualizar Conta a Receber (Usando o pedido.id como ID da conta para 1:1 perfeita)
        insert into public.contas_receber (
            id,
            filial_id,
            pedido_id,
            pedido_num,
            cliente_id,
            cliente,
            valor,
            vencimento,
            status,
            recebido_em
        ) values (
            NEW.id, -- ID compartilhado para evitar duplicação
            NEW.filial_id,
            NEW.id,
            NEW.num,
            NEW.cliente_id,
            NEW.cli,
            NEW.total,
            v_vencimento,
            v_status,
            v_recebido_em
        )
        on conflict (id) do update set
            cliente_id = EXCLUDED.cliente_id,
            cliente = EXCLUDED.cliente,
            valor = EXCLUDED.valor,
            vencimento = EXCLUDED.vencimento,
            status = EXCLUDED.status,
            recebido_em = EXCLUDED.recebido_em;
            
    end if;

    return NEW;
end;
$$ language plpgsql security definer;

-- 4. Anexar Trigger na tabela pedidos
drop trigger if exists trg_pedido_to_contas_receber on public.pedidos;
create trigger trg_pedido_to_contas_receber
after insert or update on public.pedidos
for each row
execute function public.fn_pedido_to_contas_receber();

commit;
