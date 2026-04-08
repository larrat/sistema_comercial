# Governanca de SQL e RLS

Data base: 2026-04-08  
Escopo: uso seguro dos scripts SQL de RLS e RBAC.

## Regra principal
- `sql/01b_rls_anon_dev.sql` e um script de excecao para ambiente local/dev.
- `sql/02_rls_producao.sql`, `sql/03_rbac_v1.sql`, `sql/04_rbac_v2_admin_only.sql` e `sql/05_rbac_auditoria_acessos.sql` formam o caminho oficial para ambiente seguro.
- `01b` e o caminho oficial nao devem coexistir como pratica operacional do mesmo ambiente.

## Ordem oficial de aplicacao
1. `sql/01_schema_alignment.sql`
2. `sql/02_rls_producao.sql`
3. `sql/03_rbac_v1.sql`
4. `sql/04_rbac_v2_admin_only.sql`
5. `sql/05_rbac_auditoria_acessos.sql`

## Comportamento esperado do caminho oficial
- `sql/02_rls_producao.sql` deve limpar politicas legadas `app_all_*` abertas para `anon`
- se o ambiente ja recebeu `01b` em algum momento, reaplicar o caminho oficial e obrigatorio
- a validacao da Fase 1 so passa com `politicas_anon_abertas = 0`

## Uso permitido do 01b
- somente em ambiente `dev` ou `local`
- somente com sessao explicitamente marcada
- somente para suporte temporario de fluxo sem autenticacao segura

## Uso proibido do 01b
- producao
- homologacao compartilhada
- ambiente com dados reais
- qualquer rollout oficial da Fase 1 em diante

## Guardrails obrigatorios
- antes de aplicar `01b`, a sessao deve definir:
  - `set app.allow_anon_rls = 'true';`
  - `set app.environment = 'dev';`
- alteracoes em `sql/02..05` exigem aprovacao formal
- validacao por role e por tabela critica e obrigatoria

## Checklist minimo de validacao
- confirmar RLS habilitada nas tabelas criticas
- validar leitura/escrita como `authenticated`
- validar restricao de admin em `user_perfis`, `user_filiais`, `filiais` e `acessos_auditoria`
- registrar evidencias da validacao no checklist da fase

## Evidencias esperadas
- ordem aplicada dos scripts
- ambiente alvo
- responsavel pela execucao
- validacao por role
- plano de rollback
