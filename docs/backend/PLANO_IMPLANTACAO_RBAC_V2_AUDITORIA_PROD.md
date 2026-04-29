# Plano de Implantacao RBAC v2 + Auditoria em Producao

Data: 2026-04-29

## 1. Objetivo

Preparar uma implantacao segura em producao para:

- `sql/04_rbac_v2_admin_only.sql`
- `sql/05_rbac_auditoria_acessos.sql`

sem aplicar SQL nesta etapa, deixando claros:

- pre-requisitos;
- ordem de execucao;
- validacoes antes e depois;
- impacto por papel;
- riscos;
- rollback;
- decisao recomendada para o rollout.

## 2. Arquivos SQL envolvidos

### Base obrigatoria ja aplicada

1. [sql/02_rls_producao.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/02_rls_producao.sql:1)
2. [sql/03_rbac_v1.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/03_rbac_v1.sql:1)
3. [sql/03b_rbac_seed_e_auditoria.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/03b_rbac_seed_e_auditoria.sql:1)

### Implantacao pendente

4. [sql/04_rbac_v2_admin_only.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/04_rbac_v2_admin_only.sql:1)
5. [sql/05_rbac_auditoria_acessos.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/05_rbac_auditoria_acessos.sql:1)

### Validacoes obrigatorias associadas

- [sql/04b_rbac_v2_validacao.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/04b_rbac_v2_validacao.sql:1)
- [sql/05b_validacao_fase_1_rls_rbac.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/05b_validacao_fase_1_rls_rbac.sql:1)

## 3. Pre-requisitos

### Tecnicos

1. Confirmar que `02_rls_producao.sql` esta aplicado no ambiente alvo.
2. Confirmar que `03_rbac_v1.sql` esta aplicado.
3. Confirmar que o seed de [03b_rbac_seed_e_auditoria.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/03b_rbac_seed_e_auditoria.sql:1) foi executado.
4. Confirmar que as funcoes abaixo existem no banco:
   - `public.can_access_filial(...)`
   - `public.current_user_role()`
5. Confirmar que nao ha uso operacional de `01b_rls_anon_dev.sql` no ambiente alvo.

### De dados

1. Zero usuarios sem perfil em `user_perfis`.
2. Zero vinculos invalidos em `user_filiais`.
3. Pelo menos uma conta real por papel para validacao:
   - `admin`
   - `gerente`
   - `operador`
4. Pelo menos uma filial real para cada usuario de teste.

### Operacionais

1. Janela de implantacao com responsavel definido.
2. Acesso ao painel Supabase SQL Editor ou fluxo oficial de migrations em producao.
3. Roteiro de evidencias definido:
   - screenshots
   - resultado de queries de validacao
   - responsavel
   - horario

## 4. Dependencias com SQL 03 e 03b

### Dependencia com `03_rbac_v1.sql`

`04_rbac_v2_admin_only.sql` depende diretamente de:

- tabela `public.user_perfis`
- funcao `public.current_user_role()`
- RLS habilitado em `user_perfis`

Sem `03`, o `04` nao tem base segura para diferenciar `admin` de `gerente`.

### Dependencia com `03b_rbac_seed_e_auditoria.sql`

`03b` nao cria estrutura, mas e critico para qualidade dos dados:

- popula `user_perfis` para usuarios sem perfil;
- reduz risco de usuarios cairm em papel implicito `operador` por ausencia de linha;
- permite auditar se o ambiente esta pronto antes do `04`.

### Dependencia funcional indireta com `02_rls_producao.sql`

`04` reaproveita:

- `public.can_access_filial(...)`
- politicas de `filiais` e `user_filiais` criadas sob o caminho oficial de RLS

Sem `02`, o `04` nao fecha a superficie administrativa de forma confiavel.

## 5. Ordem de aplicacao

### Ordem recomendada de producao

1. Rodar verificacoes pre-flight:
   - `04b_rbac_v2_validacao.sql`
   - `05b_validacao_fase_1_rls_rbac.sql`
2. Se houver qualquer anomalia, **parar** e corrigir dados/ambiente antes da implantacao.
3. Aplicar `sql/04_rbac_v2_admin_only.sql`
4. Reexecutar `04b_rbac_v2_validacao.sql`
5. Validar manualmente com usuarios reais por papel
6. Somente depois do `04` aprovado, aplicar `sql/05_rbac_auditoria_acessos.sql`
7. Reexecutar `05b_validacao_fase_1_rls_rbac.sql`
8. Validar leitura/insercao da trilha `acessos_auditoria` como admin

### Regra de seguranca

Nao aplicar `05` junto com `04` no mesmo passo sem antes validar o `04`.  
O `05` adiciona auditoria administrativa, mas depende da separacao `admin-only` estar correta.

## 6. Checklist antes de aplicar

### Banco / RLS / RBAC

- [ ] Confirmar ambiente alvo: producao correta
- [ ] Confirmar que `01b_rls_anon_dev.sql` nunca foi reaplicado no ambiente alvo
- [ ] Confirmar `02` aplicado
- [ ] Confirmar `03` aplicado
- [ ] Confirmar `03b` executado
- [ ] Rodar `04b_rbac_v2_validacao.sql`
- [ ] Rodar `05b_validacao_fase_1_rls_rbac.sql`
- [ ] Confirmar:
  - [ ] `usuarios_sem_perfil = 0`
  - [ ] `vinculos_filial_invalidos = 0`
  - [ ] politicas esperadas presentes em `user_perfis`, `user_filiais`, `filiais`

### Operacao

- [ ] Nomear executor
- [ ] Nomear aprovador funcional
- [ ] Definir janela de implantacao
- [ ] Definir plano de comunicacao se houver regressao de acesso

### Backup / snapshot

- [ ] Export logico ou snapshot das tabelas:
  - `public.user_perfis`
  - `public.user_filiais`
  - `public.filiais`
- [ ] Salvar resultado de:
  - politicas atuais de `pg_policies`
  - contagem de usuarios por papel
  - vinculos por filial

## 7. Checklist depois de aplicar

### Logo apos `04`

- [ ] Reexecutar `04b_rbac_v2_validacao.sql`
- [ ] Confirmar que politicas ficaram ativas para:
  - `user_perfis`
  - `user_filiais`
  - `filiais`
- [ ] Validar login e acesso do `admin`
- [ ] Validar login e acesso do `gerente`
- [ ] Validar login e acesso do `operador`
- [ ] Validar que `gerente` e `operador` nao conseguem administrar `filiais`
- [ ] Validar que somente `admin` consegue administrar `user_perfis` e `user_filiais`

### Depois do `05`

- [ ] Reexecutar `05b_validacao_fase_1_rls_rbac.sql`
- [ ] Confirmar existencia da tabela `public.acessos_auditoria`
- [ ] Confirmar indices criados
- [ ] Validar que `admin` consegue:
  - inserir evento de auditoria
  - ler a trilha
- [ ] Validar que `gerente` e `operador` nao conseguem ler a trilha
- [ ] Validar que `gerente` e `operador` nao conseguem inserir evento arbitrario

## 8. Cenarios de teste por role

### Admin

Esperado:

- ler `filiais`
- criar/editar/remover `filiais`
- ler `user_perfis`
- criar/editar/remover `user_perfis`
- ler `user_filiais`
- criar/editar/remover `user_filiais`
- ler `acessos_auditoria`
- inserir `acessos_auditoria`

Testes minimos:

1. abrir tela administrativa
2. listar filiais
3. editar uma filial de teste
4. alterar um perfil de teste
5. vincular/desvincular usuario de teste em filial de teste
6. consultar auditoria

### Gerente

Esperado:

- continuar lendo/modificando modulos operacionais conforme matriz atual
- **nao** administrar `filiais`
- **nao** administrar `user_perfis`
- **nao** administrar `user_filiais`
- **nao** ler `acessos_auditoria`

Testes minimos:

1. login normal
2. acesso aos modulos operacionais habituais
3. tentativa de abrir/operar `Filiais`
4. tentativa de abrir/operar `Acessos`
5. confirmar negacao coerente

### Operador

Esperado:

- continuar no escopo operacional atual
- sem acesso a superficies administrativas
- sem acesso a auditoria

Testes minimos:

1. login normal
2. uso basico de modulo permitido
3. tentativa de abrir `Filiais`
4. tentativa de abrir `Acessos`
5. confirmar negacao coerente

## 9. Impacto por papel

### Admin

Impacto esperado:

- sem perda de capacidade;
- passa a ser o unico papel com write administrativo real em:
  - `user_perfis`
  - `user_filiais`
  - `filiais`
  - `acessos_auditoria`

### Gerente

Impacto esperado:

- pode perder acesso administrativo residual hoje ainda tolerado em alguns fluxos se o ambiente estava permissivo demais;
- fluxo operacional deve permanecer.

### Operador

Impacto esperado:

- sem mudanca no escopo administrativo formal;
- possivel endurecimento real do banco em relacao a telas/acoes que hoje dependem demais do frontend.

## 10. Riscos

### 1. Dados de base inconsistentes

Se houver:

- usuarios sem perfil;
- vinculos invalidos;
- filiais orfas;

o `04` pode endurecer o acesso em cima de uma base quebrada e bloquear usuarios validos.

### 2. Frontend React ainda nao centraliza todos os guards por papel

Segundo a matriz atual:

- `Filiais` e `Acessos` ainda dependem em parte de legado e/ou backend;
- o banco pode passar a negar operacoes que o frontend ainda tenta expor.

Isso e aceitavel, mas precisa ser esperado como impacto de UX.

### 3. Rollout combinado 04 + 05 aumenta superficie de diagnostico

Aplicar os dois juntos dificulta isolar regressao:

- foi politica admin-only?
- foi RLS da auditoria?
- foi falta de perfil?

Por isso a aplicacao deve ser em duas etapas.

### 4. Ausencia de backup de politicas e dados administrativos

Como o `04` altera politicas de:

- `user_perfis`
- `user_filiais`
- `filiais`

um rollback seguro depende de snapshot previo.

### 5. Auditoria sem consumidor pronto

O `05` cria a trilha no banco, mas a leitura no React ainda nao esta madura.  
Isso nao bloqueia a aplicacao, mas reduz capacidade de observacao funcional imediata.

## 11. Rollback

### Principio

Rollback deve restaurar:

1. politicas anteriores;
2. estado anterior das tabelas administrativas, se houve alteracao acidental;
3. acesso operacional dos perfis reais.

### Rollback minimo para `04`

Preparar antes da aplicacao:

- dump das politicas atuais de:
  - `public.user_perfis`
  - `public.user_filiais`
  - `public.filiais`
- export das tabelas:
  - `public.user_perfis`
  - `public.user_filiais`
  - `public.filiais`

Acao de rollback:

1. reaplicar a versao anterior das policies salvas;
2. se necessario, restaurar dados exportados;
3. rerodar `04b_rbac_v2_validacao.sql`;
4. revalidar login por papel.

### Rollback minimo para `05`

Preparar antes da aplicacao:

- registrar que a tabela `acessos_auditoria` ainda nao existia ou salvar seu estado, se existir parcialmente;

Acao de rollback:

1. remover policies de `acessos_auditoria`;
2. se a decisao for rollback total, dropar `public.acessos_auditoria` e indices associados;
3. rerodar `05b_validacao_fase_1_rls_rbac.sql`.

### Regra operacional

Se `04` falhar em validacao por role, **nao aplicar `05`**.

## 12. Necessidade de backup / snapshot

**Sim, necessario.**

Minimo recomendado antes da producao:

1. snapshot logico das tabelas:
   - `user_perfis`
   - `user_filiais`
   - `filiais`
2. export das policies atuais via `pg_policies`
3. captura dos resultados de:
   - `04b_rbac_v2_validacao.sql`
   - `05b_validacao_fase_1_rls_rbac.sql`

Sem isso, o rollback fica dependente de reconstituicao manual de regra e dado administrativo.

## 13. Decisao recomendada

**Status: precisa ajuste**

### Motivos

1. o checklist oficial ainda marca `04`, `04b` e `05b` como pendentes no ambiente;
2. a matriz aponta divergencias entre frontend e enforcement server-side;
3. a validacao com contas reais por papel ainda nao esta registrada;
4. nao ha evidencia anexada de snapshot/backup previo.

### Condicao para mudar para “pronto”

Pode passar para **pronto** quando:

- `04b_rbac_v2_validacao.sql` retornar sem anomalias criticas;
- `05b_validacao_fase_1_rls_rbac.sql` retornar conforme esperado;
- houver snapshot/export previo das tabelas administrativas e policies;
- houver validacao manual com usuarios `admin`, `gerente` e `operador`;
- o rollout for planejado em duas etapas:
  1. `04`
  2. `05`
