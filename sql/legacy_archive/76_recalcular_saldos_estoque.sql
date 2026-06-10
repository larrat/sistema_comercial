-- Script para recalcular todos os saldos e custos médios dos produtos
-- Isso corrige qualquer assimetria onde a movimentação ocorreu mas o saldo no produto não alterou.

begin;

do $$
declare
  v_prod record;
  v_saldo numeric;
  r record;
begin
  for v_prod in select id, filial_id from public.produtos loop
    v_saldo := 0;

    for r in 
      select tipo, qty, saldo_real 
      from public.movimentacoes 
      where prod_id = v_prod.id and filial_id = v_prod.filial_id
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

    update public.produtos
    set esal = coalesce(v_saldo, 0),
        atualizado_em = now()
    where id = v_prod.id and filial_id = v_prod.filial_id;
  end loop;

  raise notice 'Saldos de estoque recalculados com sucesso com base nas movimentações.';
end;
$$;

commit;
