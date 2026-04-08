# Validacao RLS/RBAC - Fase 1

Data base: 2026-04-08  
Objetivo: validar que o ambiente segue o caminho oficial de seguranca e que o estado minimo de RBAC/RLS esta consistente.

## Script oficial de validacao
- `sql/05b_validacao_fase_1_rls_rbac.sql`

## Ordem recomendada
1. aplicar `sql/01_schema_alignment.sql`
2. aplicar `sql/02_rls_producao.sql`
3. aplicar `sql/03_rbac_v1.sql`
4. aplicar `sql/04_rbac_v2_admin_only.sql`
5. aplicar `sql/05_rbac_auditoria_acessos.sql`
6. executar `sql/05b_validacao_fase_1_rls_rbac.sql`

## Resultado esperado

### Bloco 1 - Politicas anon
- esperado: zero linhas
- se houver linha:
  - o ambiente nao esta aderente ao caminho oficial
  - revisar se `01b_rls_anon_dev.sql` foi aplicado indevidamente
  - reaplicar `sql/02_rls_producao.sql`, que agora remove politicas legadas `app_all_*`

### Bloco 2 - RLS habilitada
- esperado: `rls_habilitada = true` para todas as tabelas criticas
- `rls_forcada` pode variar, mas deve ser revisada se houver duvida operacional

### Bloco 3 - Funcoes de seguranca
- esperado:
  - `can_access_filial`
  - `current_user_role`
  - `is_admin`

### Bloco 4 - Politicas oficiais
- esperado:
  - politicas presentes para `filiais`, `user_filiais`, `user_perfis`
  - politicas presentes para `clientes`, `produtos`, `pedidos`, `campanhas`, `campanha_envios`
  - politicas presentes para `acessos_auditoria`

### Bloco 5 - Usuarios sem perfil
- esperado: zero
- se houver linha:
  - executar seed/correcao antes de considerar RBAC pronto

### Bloco 6 - Usuarios sem filial
- esperado: zero para usuarios ativos nao-admin
- excecoes precisam ser justificadas e registradas

### Bloco 7 - Vinculos invalidos
- esperado: zero

### Bloco 8 - Auditoria administrativa
- esperado:
  - select admin-only
  - insert admin-only

### Bloco 9 - Resumo executivo
- esperado:
  - `politicas_anon_abertas = 0`
  - `usuarios_sem_perfil = 0`
  - `usuarios_sem_filial = 0` para nao-admin ativos
  - `vinculos_filial_invalidos = 0`

## Evidencias minimas
- export ou screenshot do resultado do bloco 9
- screenshot ou log do bloco 1
- screenshot ou log do bloco 8
- registro do ambiente validado
- data e responsavel pela execucao

## Invalida a Fase 1
- qualquer politica aberta para `anon`
- usuario autenticado sem perfil sem justificativa
- vinculo de filial invalido
- ausencia de politica para `acessos_auditoria`
