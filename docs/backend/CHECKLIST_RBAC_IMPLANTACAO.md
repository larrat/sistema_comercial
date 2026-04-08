# Checklist de Implantação RBAC

Data: 2026-04-07

## Concluído

- [x] Login/logout com sessão Supabase no frontend.
- [x] Requisições usando bearer token da sessão autenticada.
- [x] RLS de produção aplicado por filial (`02_rls_producao.sql`).
- [x] Guardrail no script anon dev (`01b_rls_anon_dev.sql`).
- [x] Estrutura RBAC v1 criada (`03_rbac_v1.sql`).
- [x] Seed inicial + auditoria de perfis (`03b_rbac_seed_e_auditoria.sql`).
- [x] Guardas funcionais no frontend para ações sensíveis.
- [x] Guardas visuais no frontend (ações ocultas sem permissão).
- [x] Bloqueio de acesso direto a páginas restritas.
- [x] Matriz de permissões publicada (`RBAC_MATRIZ_PERMISSOES_2026-04-07.md`).
- [x] Separação v2 no frontend: `admin` diferente de `gerente` (filiais admin-only).
- [x] Script de endurecimento v2 no banco criado (`04_rbac_v2_admin_only.sql`).

## Em execução no ambiente

- [ ] Rodar `04_rbac_v2_admin_only.sql` no Supabase de produção.
- [ ] Validar acesso com 3 contas reais: `admin`, `gerente`, `operador`.

## Próximos passos recomendados

- [ ] Criar tela/admin flow para gestão de papéis (`user_perfis`) e vínculos (`user_filiais`).
- [ ] Mover regras críticas de campanha/envio para backend (Edge Functions/BFF).
- [ ] Adicionar auditoria de segurança por release (checklist obrigatório).
- [ ] Adicionar testes automatizados para permissões críticas.
- [ ] Monitorar tentativas negadas por RBAC e revisar mensalmente.

