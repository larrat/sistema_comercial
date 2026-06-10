-- Migration: 91_clean_moddatetime_legacy
-- Propósito: Substituir a extensão 'moddatetime' pelo método nativo 'public.set_atualizado_em()'

-- 1. Garante que a função nativa existe (já criada em migrações anteriores, mas por garantia)
create or replace function public.set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- 2. Bloco anônimo para atualizar todas as tabelas principais
do $$
declare
    t varchar;
    tables varchar[] := array[
        'clientes',
        'produtos',
        'pedidos',
        'pedido_itens',
        'compras',
        'contas_receber',
        'contas_pagar',
        'caixa_movimentacoes',
        'orcamentos_obra',
        'levantamentos_arquitetura',
        'projetos',
        'contratos'
    ];
begin
    foreach t in array tables loop
        -- Se a tabela existir, remove o trigger velho e recria o novo com segurança
        if exists (select from pg_tables where schemaname = 'public' and tablename = t) then
            -- Tenta remover se houver trigger 'handle_updated_at' (padrão Supabase/moddatetime)
            execute format('drop trigger if exists handle_updated_at on public.%I', t);
            -- Tenta remover se houver trigger 'handle_atualizado_em'
            execute format('drop trigger if exists handle_atualizado_em on public.%I', t);
            
            -- Recria o trigger usando a nossa function plpgsql moderna
            execute format('
                create trigger handle_updated_at 
                before update on public.%I 
                for each row execute procedure public.set_atualizado_em()
            ', t);
        end if;
    end loop;
end;
$$;

-- 3. Limpa a extensão moddatetime do banco (opcional, só se tiver permissão e ninguém usar)
-- drop extension if exists moddatetime cascade;

commit;
