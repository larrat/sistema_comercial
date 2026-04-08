# Checklist - Deploy de Edge Functions

Data base: 2026-04-08  
Uso: marcar e executar no dia do deploy

## 1. Pre-check
- [ ] maquina com `git` e `supabase` CLI funcionando
- [ ] branch correta atualizada com `git pull`
- [ ] projeto Supabase correto identificado
- [ ] `supabase login` executado
- [ ] `supabase link --project-ref ...` validado
- [ ] JWTs de teste separados por papel:
  - [ ] `admin`
  - [ ] `gerente/admin` para campanhas
  - [ ] `operador` para teste negativo

## 2. Deploy
- [ ] publicar `campanhas-gerar-fila`
- [ ] publicar `acessos-admin`
- [ ] publicar `acessos-admin-read`
- [ ] registrar output dos 3 deploys

## 3. Smoke - sucesso
- [ ] smoke `campanhas-gerar-fila` com `200`
- [ ] smoke `acessos-admin` com `200`
- [ ] smoke `acessos-admin-read` com `200`

## 4. Smoke - autorizacao
- [ ] validar pelo menos 1 caso `401` ou `403` em campanhas
- [ ] validar `403` em `acessos-admin` com usuario nao-admin
- [ ] validar `403` em `acessos-admin-read` com usuario nao-admin

## 5. Evidencias
- [ ] registrar data e hora
- [ ] registrar ambiente alvo
- [ ] registrar commit/branch
- [ ] anexar output dos smokes
- [ ] atualizar [CHECKLIST_EXECUCAO_FASE_1.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_1.md)

## 6. Decisao final
- [ ] aprovado para seguir
- [ ] bloqueado para investigacao
- [ ] rollback necessario

## Bloqueios imediatos
- [ ] parar se qualquer deploy falhar
- [ ] parar se algum smoke `200` vier com contrato incompleto
- [ ] parar se `operador` conseguir acessar funcao admin
- [ ] parar se aparecer `AUDIT_INSERT_FAILED` sem validacao manual

## Referencias
- [RUNBOOK_DEPLOY_EDGE_FUNCTIONS_V1.md](/e:/Programas/sistema_comercial/docs/backend/RUNBOOK_DEPLOY_EDGE_FUNCTIONS_V1.md)
- [SMOKE_TEST_EDGE_FUNCTION_CAMPANHAS.md](/e:/Programas/sistema_comercial/docs/backend/SMOKE_TEST_EDGE_FUNCTION_CAMPANHAS.md)
- [SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN.md](/e:/Programas/sistema_comercial/docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN.md)
- [SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN_READ.md](/e:/Programas/sistema_comercial/docs/backend/SMOKE_TEST_EDGE_FUNCTION_ACESSOS_ADMIN_READ.md)
