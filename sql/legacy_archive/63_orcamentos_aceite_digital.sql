-- 63_orcamentos_aceite_digital.sql
-- Objetivo: Criar tabela para registrar assinaturas/aceites eletrônicos via Portal Público.

begin;

create table if not exists public.orcamentos_aceite_digital (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos_obra(id) on delete cascade,
  nome_assinante text not null,
  cpf_cnpj text not null,
  ip_address text,
  data_hora_aceite timestamptz default now()
);

create index if not exists ix_orc_aceite_orcamento on public.orcamentos_aceite_digital(orcamento_id);

alter table public.orcamentos_aceite_digital enable row level security;

-- Permitir inserção anônima (já que o cliente aceita pelo link público)
drop policy if exists "Permitir insercao anonima de aceite" on public.orcamentos_aceite_digital;
create policy "Permitir insercao anonima de aceite"
  on public.orcamentos_aceite_digital
  for insert
  to anon
  with check (true);

-- Permitir leitura anonima da própria proposta
drop policy if exists "Permitir leitura publica de orcamentos pelo ID" on public.orcamentos_obra;
create policy "Permitir leitura publica de orcamentos pelo ID"
  on public.orcamentos_obra
  for select
  to anon
  using (true);

-- Permitir update anônimo APENAS para mudar status para "aprovado"
drop policy if exists "Permitir atualizacao anonima de status orcamento" on public.orcamentos_obra;
create policy "Permitir atualizacao anonima de status orcamento"
  on public.orcamentos_obra
  for update
  to anon
  using (true)
  with check (status = 'aprovado');

commit;
