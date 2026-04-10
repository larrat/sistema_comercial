# Checklist de Code Review

## Objetivo

Padronizar a revisao tecnica de Pull Requests para reduzir regressao, debito tecnico e risco operacional.

Este checklist deve ser usado por quem abre o PR e por quem revisa.

## 1. Contexto do PR

- [ ] O objetivo da mudanca esta claro
- [ ] O escopo esta delimitado
- [ ] O risco foi descrito
- [ ] O plano de teste foi informado
- [ ] Existe estrategia de rollback quando aplicavel

## 2. Qualidade de codigo

- [ ] O codigo esta legivel e com nomes claros
- [ ] Nao ha duplicacao desnecessaria
- [ ] Nao ha logica de negocio escondida em camada errada
- [ ] Funcoes muito grandes foram evitadas ou justificadas
- [ ] O codigo novo segue os padroes da equipe

## 3. Tipagem e contratos

- [ ] O codigo novo esta tipado
- [ ] `any` nao foi usado sem justificativa
- [ ] Entradas e saidas importantes possuem contrato claro
- [ ] Mudancas em contratos estao refletidas na tipagem e nos consumidores

## 4. Testes

- [ ] Os testes necessarios foram criados ou atualizados
- [ ] Casos de sucesso e falha foram considerados
- [ ] Fluxos criticos nao perderam cobertura
- [ ] O reviewer entende como validar a mudanca

## 5. Seguranca

- [ ] Nao ha segredo hardcoded
- [ ] Nao ha vazamento de dado sensivel em log
- [ ] Entradas externas foram validadas
- [ ] Renderizacao dinamica sensivel esta protegida contra XSS
- [ ] Permissoes, auth e RBAC foram respeitados quando aplicavel

## 6. Banco e dados

- [ ] Toda alteracao de schema possui migration versionada
- [ ] A migration descreve impacto e rollback quando aplicavel
- [ ] Nao ha mudanca destrutiva sem fase de transicao
- [ ] Indices e constraints foram considerados quando necessario

## 7. UX e operacao

- [ ] Estados de loading, erro e sucesso foram considerados
- [ ] A mudanca nao quebra fluxo operacional existente
- [ ] Copys e mensagens estao coerentes
- [ ] A experiencia continua consistente com o restante do sistema

## 8. Observabilidade

- [ ] Erros relevantes sao rastreaveis
- [ ] Logs adicionados sao uteis e nao ruidosos
- [ ] Eventos criticos ou telemetria foram considerados quando necessario

## 9. Documentacao

- [ ] README, ADR ou doc tecnica foram atualizados quando necessario
- [ ] Funcoes publicas ou modulos relevantes ficaram documentados

## 10. Decisao final

- [ ] Aprovar
- [ ] Solicitar ajustes
- [ ] Bloquear por risco tecnico, seguranca ou regressao

## Regra pratica de aprovacao

Um PR nao deve ser aprovado se:

- lint falha
- typecheck falha
- testes falham
- falta contexto minimo
- existe risco nao explicado
- a mudanca nao pode ser revertida com seguranca razoavel
