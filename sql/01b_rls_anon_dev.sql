-- 01b_rls_anon_dev.sql
-- USO RESTRITO:
-- - somente para ambiente local/dev explicitamente controlado
-- - proibido para homologacao e producao
-- - nao faz parte do caminho oficial de saneamento
-- Script oficial para ambiente seguro: 02_rls_producao.sql

begin;

-- Guardrail de seguranca:
-- Este script so executa quando a sessao define explicitamente:
--   set app.allow_anon_rls = 'true';
--   set app.environment = 'dev';
do $$
begin
  if coalesce(current_setting('app.allow_anon_rls', true), 'false') <> 'true' then
    raise exception 'Bloqueado: 01b_rls_anon_dev.sql exige "set app.allow_anon_rls = true" na sessao.';
  end if;

  if coalesce(current_setting('app.environment', true), '') not in ('dev', 'local') then
    raise exception 'Bloqueado: 01b_rls_anon_dev.sql exige "set app.environment = dev" ou "local" na sessao.';
  end if;
end
$$;

alter table public.filiais enable row level security;
alter table public.produtos enable row level security;
alter table public.clientes enable row level security;
alter table public.pedidos enable row level security;
alter table public.fornecedores enable row level security;
alter table public.cotacao_precos enable row level security;
alter table public.cotacao_historico enable row level security;
alter table public.cotacao_layouts enable row level security;
alter table public.cotacao_config enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.notas enable row level security;
alter table public.jogos_agenda enable row level security;
alter table public.campanhas enable row level security;
alter table public.campanha_envios enable row level security;

-- recria políticas abertas para role anon

drop policy if exists app_all_filiais on public.filiais;
create policy app_all_filiais on public.filiais for all to anon using (true) with check (true);

drop policy if exists app_all_produtos on public.produtos;
create policy app_all_produtos on public.produtos for all to anon using (true) with check (true);

drop policy if exists app_all_clientes on public.clientes;
create policy app_all_clientes on public.clientes for all to anon using (true) with check (true);

drop policy if exists app_all_pedidos on public.pedidos;
create policy app_all_pedidos on public.pedidos for all to anon using (true) with check (true);

drop policy if exists app_all_fornecedores on public.fornecedores;
create policy app_all_fornecedores on public.fornecedores for all to anon using (true) with check (true);

drop policy if exists app_all_cotacao_precos on public.cotacao_precos;
create policy app_all_cotacao_precos on public.cotacao_precos for all to anon using (true) with check (true);

drop policy if exists app_all_cotacao_historico on public.cotacao_historico;
create policy app_all_cotacao_historico on public.cotacao_historico for all to anon using (true) with check (true);

drop policy if exists app_all_cotacao_layouts on public.cotacao_layouts;
create policy app_all_cotacao_layouts on public.cotacao_layouts for all to anon using (true) with check (true);

drop policy if exists app_all_cotacao_config on public.cotacao_config;
create policy app_all_cotacao_config on public.cotacao_config for all to anon using (true) with check (true);

drop policy if exists app_all_movimentacoes on public.movimentacoes;
create policy app_all_movimentacoes on public.movimentacoes for all to anon using (true) with check (true);

drop policy if exists app_all_notas on public.notas;
create policy app_all_notas on public.notas for all to anon using (true) with check (true);

drop policy if exists app_all_jogos_agenda on public.jogos_agenda;
create policy app_all_jogos_agenda on public.jogos_agenda for all to anon using (true) with check (true);

drop policy if exists app_all_campanhas on public.campanhas;
create policy app_all_campanhas on public.campanhas for all to anon using (true) with check (true);

drop policy if exists app_all_campanha_envios on public.campanha_envios;
create policy app_all_campanha_envios on public.campanha_envios for all to anon using (true) with check (true);

commit;
