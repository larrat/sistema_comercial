# Fluxos Criticos - Smoke Suite Minima da Fase 2

Data base: 2026-04-08  
Status: pronto para execucao/automacao  
Objetivo: definir a menor suite de smoke capaz de validar os fluxos mais sensiveis do sistema com boa relacao entre custo e cobertura.

## Ordem oficial de execucao

1. login autenticado
2. setup de filial
3. carregamento inicial da filial
4. campanhas - gerar fila
5. acessos admin - escrita
6. acessos admin - leitura

## Regras gerais

- executar na ordem definida
- interromper a suite se um fluxo bloquear o seguinte
- registrar para cada fluxo:
  - ambiente
  - usuario/papel
  - horario
  - status esperado
  - status obtido
- considerar aprovado apenas quando o criterio do fluxo e o criterio global forem atendidos

## Fluxo 1 - Login autenticado

### Objetivo
Validar entrada no sistema e criacao/recuperacao de sessao.

### Ponto tecnico principal
- [auth-setup.js](/e:/Programas/sistema_comercial/src/features/auth-setup.js)
- [api.js](/e:/Programas/sistema_comercial/src/app/api.js)

### Pre-condicao
- usuario valido existente
- configuracao Supabase valida no ambiente

### Passos minimos
1. informar email e senha validos
2. executar o fluxo de `authEntrar`
3. confirmar sessao ativa

### Criterio de aprovado
- sessao criada sem erro
- perfil do usuario carregado
- app nao fica em tela branca
- falha de login invalido gera erro estruturado

### Falhas que reprovam
- sessao nao persistida
- erro generico sem contexto
- redirecionamento quebrado

## Fluxo 2 - Setup de filial

### Objetivo
Validar o primeiro corte operacional apos o login.

### Ponto tecnico principal
- [auth-setup.js](/e:/Programas/sistema_comercial/src/features/auth-setup.js)
- [filiais-acessos.js](/e:/Programas/sistema_comercial/src/features/filiais-acessos.js)

### Pre-condicao
- usuario autenticado
- pelo menos uma filial acessivel ou permissao para criar a primeira

### Passos minimos
1. listar filiais disponiveis
2. selecionar uma filial existente ou criar a primeira
3. confirmar entrada no app com filial definida

### Criterio de aprovado
- filiais carregam sem falha silenciosa
- selecao de filial funciona
- criacao da primeira filial funciona quando aplicavel
- `State.FIL` fica coerente com a filial selecionada

### Falhas que reprovam
- selecao de filial nao persiste
- fluxo segue sem filial valida
- erro de persistencia mascarado

## Fluxo 3 - Carregamento inicial da filial

### Objetivo
Validar o bootstrap de dados criticos da operacao.

### Ponto tecnico principal
- [runtime-loading.js](/e:/Programas/sistema_comercial/src/features/runtime-loading.js)
- [api.js](/e:/Programas/sistema_comercial/src/app/api.js)

### Pre-condicao
- usuario autenticado
- filial valida selecionada

### Passos minimos
1. carregar dados da filial
2. verificar datasets base:
   - produtos
   - clientes
   - pedidos
   - fornecedores
3. validar que a UI entra no app sem colapsar

### Criterio de aprovado
- datasets criticos carregam
- falha critica interrompe bootstrap com mensagem clara
- fallback controlado so ocorre nos pontos aceitos

### Falhas que reprovam
- bootstrap segue com falha critica silenciosa
- app entra com estado inconsistente
- dados essenciais nao carregam e a UI continua como se estivesse ok

## Fluxo 4 - Campanhas / Gerar fila

### Objetivo
Validar o primeiro backend de dominio leve adotado na base.

### Ponto tecnico principal
- [campanhas.js](/e:/Programas/sistema_comercial/src/features/campanhas.js)
- [campanhas-gerar-fila/index.ts](/e:/Programas/sistema_comercial/supabase/functions/campanhas-gerar-fila/index.ts)
- [campanhas-gerar-fila.ps1](/e:/Programas/sistema_comercial/scripts/smoke/campanhas-gerar-fila.ps1)

### Pre-condicao
- function publicada
- campanha valida existente
- usuario `gerente` ou `admin`

### Passos minimos
1. executar smoke `200`
2. executar smoke negativo `401` ou `403`
3. confirmar que o frontend nao tenta mais gerar fila localmente

### Criterio de aprovado
- contrato `200` valido
- contrato negativo valido
- geracao de fila depende da Edge Function

### Falhas que reprovam
- resposta sem campos obrigatorios
- `operador` consegue gerar fila
- frontend volta a montar fila no browser

## Fluxo 5 - Acessos admin / Escrita

### Objetivo
Validar a retirada da escrita administrativa do browser.

### Ponto tecnico principal
- [filiais-acessos.js](/e:/Programas/sistema_comercial/src/features/filiais-acessos.js)
- [acessos-admin/index.ts](/e:/Programas/sistema_comercial/supabase/functions/acessos-admin/index.ts)
- [acessos-admin.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin.ps1)

### Pre-condicao
- function publicada
- usuario `admin`
- alvo de teste definido

### Passos minimos
1. executar smoke `perfil_upsert` com `200`
2. executar smoke `vinculo_upsert` com `200`
3. executar caso negativo `403` com usuario nao-admin

### Criterio de aprovado
- contratos `200` validos
- `403` valido para nao-admin
- auditoria esperada registrada sem duplicidade de frontend

### Falhas que reprovam
- `operador` consegue escrever
- `AUDIT_INSERT_FAILED` sem tratamento
- frontend ainda grava direto em tabela sensivel

## Fluxo 6 - Acessos admin / Leitura

### Objetivo
Validar a agregacao backend da leitura administrativa.

### Ponto tecnico principal
- [filiais-acessos.js](/e:/Programas/sistema_comercial/src/features/filiais-acessos.js)
- [acessos-admin-read/index.ts](/e:/Programas/sistema_comercial/supabase/functions/acessos-admin-read/index.ts)
- [acessos-admin-read.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin-read.ps1)

### Pre-condicao
- function publicada
- usuario `admin`

### Passos minimos
1. executar smoke `200`
2. executar caso negativo `403`
3. abrir tela de acessos e confirmar carga da leitura agregada

### Criterio de aprovado
- contrato `200` valido
- `403` valido para nao-admin
- `renderAcessosAdmin()` depende do endpoint agregado

### Falhas que reprovam
- frontend volta a fazer as 4 leituras antigas no caminho principal
- contrato sem `perfis`, `vinculos`, `filiais` ou `auditoria`
- permissao incorreta para nao-admin

## Criterio global de aprovado da smoke suite minima

- os 6 fluxos executam na ordem prevista
- nenhum fluxo critico falha silenciosamente
- todos os contratos minimos obrigatorios sao respeitados
- pelo menos os casos negativos de autorizacao dos fluxos admin sao validados

## Criterio global de bloqueio

- falha em login ou setup
- bootstrap da filial inconsistente
- qualquer funcao admin acessivel por papel incorreto
- qualquer fluxo critico ainda mascarando falha de persistencia

## Referencias

- [CHECKLIST_EXECUCAO_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_2.md)
- [CONTRATO_MINIMO_SB_V1.md](/e:/Programas/sistema_comercial/docs/backend/CONTRATO_MINIMO_SB_V1.md)
- [RUNBOOK_DEPLOY_EDGE_FUNCTIONS_V1.md](/e:/Programas/sistema_comercial/docs/backend/RUNBOOK_DEPLOY_EDGE_FUNCTIONS_V1.md)
