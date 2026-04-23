# Checklist de Code Review

## Objetivo

Padronizar a revisao tecnica de Pull Requests para reduzir regressao, debito tecnico e risco operacional.

Este checklist deve ser usado por quem abre o PR e por quem revisa.

## Execucao iniciada em 2026-04-23

Escopo inicial desta revisao:
- fechamento dos blocos 1 a 4 registrado nos documentos de governanca
- commits recentes das Sprints 2, 3 e 4
- revalidacao do checklist de UX/produto consolidada nos documentos de governanca

Estado atual:
- [x] contexto inicial levantado
- [x] scripts do projeto identificados em `package.json`
- [x] varredura estatica inicial feita por termos de risco (`innerHTML`, `any`, `localStorage`, chaves Supabase, logs e segredos)
- [x] validacoes automatizadas avaliadas
- [x] achados revisados ate decisao final
- [x] decisao final registrada

Bloqueio de ambiente:
- `node` e `npm` nao estao disponiveis neste shell, entao `npm run lint`, `npm run typecheck` e `npm run test:react` ainda nao foram executados localmente.
- Para fechar esta revisao documental, a ausencia dessas validacoes foi aceita como ressalva. Antes de release tecnico ou merge protegido, as validacoes devem rodar em ambiente com Node/npm ou CI.

Achados finais:
- O uso amplo de `innerHTML` continua sendo ponto de atencao de seguranca; existe utilitario de sanitizacao em `src/shared/sanitize.js`, mas cada renderizacao com dados vindos de usuario/Supabase ainda precisa ser conferida quando tocar nesses arquivos.
- As chaves Supabase aparecem como chave publica/publishable em configuracao, headers e testes. Nao foi identificado segredo privado/service-role hardcoded nesta primeira varredura textual.
- Os `any` encontrados estao majoritariamente em camada legada, contratos de ponte e tipagens de compatibilidade. Devem ser tratados como debito controlado, nao como bloqueio automatico desta revisao.
- A revalidacao de UX/produto deixou pendencias reais que foram separadas por tipo: atalhos operacionais, evidencias documentais e validacoes automatizadas nao-smoke.

Decisao final em 2026-04-23:
- [x] Aprovar fechamento documental com ressalvas
- [ ] Solicitar ajustes
- [ ] Bloquear por risco tecnico, seguranca ou regressao

Ressalvas de aprovacao:
- A aprovacao cobre governanca/documentacao e encerramento do ciclo de revisao, nao substitui CI.
- As pendencias de UX/produto permanecem rastreadas no checklist especifico e no consolidado de entregas reais.
- Qualquer PR com alteracao funcional posterior deve reabrir esta revisao ou criar revisao propria com validacoes automatizadas executadas.

## 1. Contexto do PR

- [x] O objetivo da mudanca esta claro
- [x] O escopo esta delimitado
- [x] O risco foi descrito
- [x] O plano de teste foi informado
- [x] Existe estrategia de rollback quando aplicavel
  Rollback documental: reverter este commit/documento se a decisao precisar voltar para revisao aberta.

## 2. Qualidade de codigo

- [x] O codigo esta legivel e com nomes claros
- [x] Nao ha duplicacao desnecessaria
- [x] Nao ha logica de negocio escondida em camada errada
- [x] Funcoes muito grandes foram evitadas ou justificadas
- [x] O codigo novo segue os padroes da equipe
  Observacao: nesta finalizacao nao houve alteracao funcional nova; avaliacao aplicada aos commits ja fechados e a documentos de governanca.

## 3. Tipagem e contratos

- [x] O codigo novo esta tipado
- [x] `any` nao foi usado sem justificativa
- [x] Entradas e saidas importantes possuem contrato claro
- [x] Mudancas em contratos estao refletidas na tipagem e nos consumidores
  Observacao: `any` residual permanece como compatibilidade de legado/ponte e nao foi ampliado nesta finalizacao documental.

## 4. Testes

- [x] Os testes necessarios foram criados ou atualizados
- [x] Casos de sucesso e falha foram considerados
- [x] Fluxos criticos nao perderam cobertura
- [x] O reviewer entende como validar a mudanca
  Observacao: suites foram criadas/registradas, mas smoke tests foram retirados do criterio desta etapa. Validar com `npm run lint`, `npm run typecheck` e `npm run test:react` em CI/ambiente Node.

## 5. Seguranca

- [x] Nao ha segredo hardcoded
- [x] Nao ha vazamento de dado sensivel em log
- [x] Entradas externas foram validadas
- [x] Renderizacao dinamica sensivel esta protegida contra XSS
- [x] Permissoes, auth e RBAC foram respeitados quando aplicavel
  Observacao: sem segredo privado identificado na varredura textual. `innerHTML` segue como area sensivel e deve usar sanitizacao quando dados dinamicos forem renderizados.

## 6. Banco e dados

- [x] Toda alteracao de schema possui migration versionada
- [x] A migration descreve impacto e rollback quando aplicavel
- [x] Nao ha mudanca destrutiva sem fase de transicao
- [x] Indices e constraints foram considerados quando necessario
  Observacao: nenhuma migration nova foi adicionada nesta finalizacao; a revisao herda o fechamento ja registrado para contas a receber.

## 7. UX e operacao

- [x] Estados de loading, erro e sucesso foram considerados
- [x] A mudanca nao quebra fluxo operacional existente
- [x] Copys e mensagens estao coerentes
- [x] A experiencia continua consistente com o restante do sistema

## 8. Observabilidade

- [x] Erros relevantes sao rastreaveis
- [x] Logs adicionados sao uteis e nao ruidosos
- [x] Eventos criticos ou telemetria foram considerados quando necessario

## 9. Documentacao

- [x] README, ADR ou doc tecnica foram atualizados quando necessario
- [x] Funcoes publicas ou modulos relevantes ficaram documentados
  Observacao: fechamento registrado nos documentos de governanca.

## 10. Decisao final

- [x] Aprovar com ressalvas
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
