-- Script 88: Adicionar coluna 'genero' na tabela de produtos

begin;

-- Adicionar a coluna genero na tabela produtos caso ela ainda não exista
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'produtos' and column_name = 'genero') then
        alter table public.produtos add column genero text check (genero in ('masculino', 'feminino', 'unissex'));
        
        comment on column public.produtos.genero is 'Gênero do produto (masculino, feminino, unissex) para classificação de vestuário/calçados';
    end if;
end $$;

commit;
