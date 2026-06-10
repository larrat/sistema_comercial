-- 62_storage_diario_fotos.sql
-- Objetivo: Preparar banco e Storage para Upload de Fotos no Diário de Obra.

begin;

-- 1. Adicionar coluna fotos na tabela diario_obra
alter table public.diario_obra
  add column if not exists fotos text[] default '{}'::text[];

-- 2. Políticas de Storage
-- Para executar as regras abaixo, você deve garantir que o bucket 'obras_arquivos' existe.
-- Se estiver usando o painel web do Supabase: 
-- Vá em "Storage" -> "New Bucket" -> Nomeie "obras_arquivos" e marque "Public bucket".

-- As instruções abaixo criam as policies de segurança caso você já tenha o bucket.
-- OBS: Apenas descomente se for executar no editor SQL do Supabase conectado com permissão de superuser, 
-- do contrário, crie a pasta pelo painel do Supabase.

/*
insert into storage.buckets (id, name, public) 
values ('obras_arquivos', 'obras_arquivos', true) 
on conflict do nothing;

create policy "Imagens públicas da obra" 
  on storage.objects for select 
  to public 
  using ( bucket_id = 'obras_arquivos' );

create policy "Upload de imagens da obra" 
  on storage.objects for insert 
  to authenticated 
  with check ( bucket_id = 'obras_arquivos' );
*/

commit;
