-- 81_alertas_estoque_critico.sql
-- Objetivo: Cria a tabela de alertas_sistema e um trigger que detecta produtos
-- atingindo seu estoque mínimo (emin) e gera notificações em tempo real.

begin;

-- 1. Tabela genérica para Alertas do Sistema
create table if not exists public.alertas_sistema (
  id uuid primary key default gen_random_uuid(),
  filial_id text not null references public.filiais(id) on delete cascade,
  tipo text not null, -- 'estoque_minimo', 'produto_sem_ncm', etc.
  prioridade text not null default 'atencao', -- 'info', 'atencao', 'critico'
  entidade_tipo text not null, -- 'produto', 'pedido', 'cliente'
  entidade_id text not null,
  titulo text not null,
  mensagem text not null,
  resolvido boolean not null default false,
  resolvido_em timestamptz null,
  resolvido_por text null,
  criado_em timestamptz not null default now()
);

create index if not exists ix_alertas_sistema_filial 
  on public.alertas_sistema (filial_id, resolvido);

create index if not exists ix_alertas_sistema_entidade 
  on public.alertas_sistema (entidade_tipo, entidade_id) where resolvido = false;

alter table public.alertas_sistema enable row level security;

do $$ begin
  create policy p_alertas_sistema_all on public.alertas_sistema
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception when duplicate_object then null;
end $$;

-- 2. Trigger Function para detectar ruptura de estoque
create or replace function public.fn_detectar_estoque_critico()
returns trigger as $$
declare
  v_alerta_existente uuid;
begin
  -- Apenas verificar se o saldo (esal) diminuiu e existe um mínimo (emin) configurado
  if new.emin > 0 and new.esal < new.emin and (old.esal is null or new.esal < old.esal) then
    
    -- Verificar se já existe alerta pendente para esse produto
    select id into v_alerta_existente 
    from public.alertas_sistema 
    where entidade_tipo = 'produto' 
      and entidade_id = new.id 
      and resolvido = false
    limit 1;

    -- Se não existir, criar novo alerta
    if not found then
      insert into public.alertas_sistema (
        filial_id, tipo, prioridade, entidade_tipo, entidade_id, titulo, mensagem
      ) values (
        coalesce(new.filial_id, (select id from public.filiais limit 1)), 
        'estoque_minimo', 
        case when new.esal <= 0 then 'critico' else 'atencao' end, 
        'produto', 
        new.id,
        'Estoque Crítico: ' || new.nome,
        'Saldo atual (' || new.esal || ' ' || coalesce(new.un, 'un') || ') está abaixo do ponto de pedido mínimo configurado de ' || new.emin || ' ' || coalesce(new.un, 'un') || '.'
      );
    end if;

  elsif new.emin > 0 and new.esal >= new.emin and old.esal < new.emin then
    -- Se o estoque foi reabastecido acima do mínimo, resolve o alerta automaticamente
    update public.alertas_sistema
    set resolvido = true,
        resolvido_em = now(),
        resolvido_por = 'system_auto'
    where entidade_tipo = 'produto' 
      and entidade_id = new.id 
      and resolvido = false;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 3. Aplica o trigger na tabela de produtos
drop trigger if exists trg_detectar_estoque_critico on public.produtos;
create trigger trg_detectar_estoque_critico
  after update of esal, emin on public.produtos
  for each row
  execute function public.fn_detectar_estoque_critico();

commit;
