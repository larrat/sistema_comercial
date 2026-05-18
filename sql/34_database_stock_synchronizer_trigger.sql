-- 34_database_stock_synchronizer_trigger.sql
-- Objetivo: Criar um gatilho (Trigger) automático a nível de banco de dados
-- que garante consistência total e sincronização automática entre a tabela de
-- 'movimentacoes' e o estoque atual ('esal') na tabela de 'produtos'.
-- Evita qualquer desalinhamento ou bug de estoque zerado.

begin;

create or replace function public.recalculate_product_stock()
returns trigger as $$
declare
  v_prod_id text;
  v_filial_id text;
  v_saldo numeric := 0;
  r record;
begin
  -- Identifica qual produto e filial sofreram alteração na movimentação
  if tg_op = 'DELETE' then
    v_prod_id := old.prod_id;
    v_filial_id := old.filial_id;
  else
    v_prod_id := new.prod_id;
    v_filial_id := new.filial_id;
  end if;

  -- Executa a reprodução sequencial das movimentações para encontrar o saldo correto e real
  for r in 
    select tipo, qty, saldo_real 
    from public.movimentacoes 
    where prod_id = v_prod_id and filial_id = v_filial_id
    order by ts asc, criado_em asc
  loop
    if r.tipo = 'entrada' then
      v_saldo := v_saldo + coalesce(r.qty, 0);
    elsif r.tipo = 'saida' or r.tipo = 'transf' then
      v_saldo := v_saldo - coalesce(r.qty, 0);
    elsif r.tipo = 'ajuste' then
      v_saldo := coalesce(r.saldo_real, 0);
    end if;
  end loop;

  -- Atualiza o saldo físico final na tabela de produtos
  update public.produtos
  set esal = coalesce(v_saldo, 0),
      atualizado_em = now()
  where id = v_prod_id and filial_id = v_filial_id;

  return null;
end;
$$ language plpgsql;

-- Remove o trigger antigo se existir e cria o novo
drop trigger if exists trg_movimentacoes_stock_sync on public.movimentacoes;

create trigger trg_movimentacoes_stock_sync
after insert or update or delete on public.movimentacoes
for each row
execute function public.recalculate_product_stock();

commit;
