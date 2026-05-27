-- 64_contrato_pagamentos_equipe.sql
-- Objetivo: Criar tabela para registrar adiantamentos e pagamentos a parceiros nas Ordens de Serviço.

begin;

create table if not exists public.contrato_pagamentos_equipe (
  id uuid primary key default gen_random_uuid(),
  filial_id uuid not null references public.filiais(id),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  valor numeric(10, 2) not null,
  data_pagamento date not null default current_date,
  tipo text not null check (tipo in ('adiantamento', 'vale', 'quitacao', 'premio')),
  forma_pagamento text,
  comprovante_url text,
  obs text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now()
);

create index if not exists ix_pagamentos_equipe_os on public.contrato_pagamentos_equipe(os_id);

alter table public.contrato_pagamentos_equipe enable row level security;

-- Políticas de acesso padrão
drop policy if exists "Todos na filial podem ver pagamentos de equipe" on public.contrato_pagamentos_equipe;
create policy "Todos na filial podem ver pagamentos de equipe"
  on public.contrato_pagamentos_equipe
  for select
  to authenticated
  using (filial_id = (select f.filial_id from user_filiais f where f.user_id = auth.uid() limit 1));

drop policy if exists "Todos na filial podem inserir pagamentos de equipe" on public.contrato_pagamentos_equipe;
create policy "Todos na filial podem inserir pagamentos de equipe"
  on public.contrato_pagamentos_equipe
  for insert
  to authenticated
  with check (filial_id = (select f.filial_id from user_filiais f where f.user_id = auth.uid() limit 1));

commit;
