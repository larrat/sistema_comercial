# Execucao - UI Core da Fase 2

Data base: 2026-04-08  
Status: preparada para implementacao  
Objetivo: definir a automacao UI minima da Onda B da Fase 2 para os fluxos:

- login autenticado
- setup de filial
- carregamento inicial da filial

## Escopo da Onda B

Cobrir apenas o fluxo visual principal que garante entrada segura no sistema.

Esta onda nao deve tentar automatizar:

- CRUDs secundarios
- modais laterais
- validacoes visuais finas de layout
- exploracao completa de telas apos o bootstrap

## Ferramenta recomendada

Usar harness de navegador/headless com suporte a:

- abrir pagina
- preencher formulario
- clicar em botao
- aguardar render
- ler texto e visibilidade de elementos

Exemplos de perfil de ferramenta aceitavel:

- Playwright
- Cypress

## Ordem oficial de implementacao

1. login autenticado
2. setup de filial
3. carregamento inicial da filial

## Fluxo 1 - Login autenticado

### Objetivo

Garantir que o usuario consegue:

- informar credenciais
- autenticar
- criar/recuperar sessao
- sair do estado inicial sem erro opaco

### Elementos principais

- `#auth-email`
- `#auth-password`
- `#auth-login-btn`
- `#setup-auth`

### Passos minimos

1. abrir a aplicacao
2. preencher email
3. preencher senha
4. clicar em `#auth-login-btn`
5. aguardar transicao do gate de autenticacao

### Asserts minimos

- `#setup-auth` deixa de ser o foco principal ou some
- nao ocorre tela branca
- sessao autenticada gera continuidade do fluxo

### Falhas que bloqueiam

- botao nao responde
- erro nao estruturado
- autenticacao aparentemente completa, mas fluxo nao avanca

## Fluxo 2 - Setup de filial

### Objetivo

Garantir que o usuario autenticado consegue entrar no app com uma filial valida.

### Elementos principais

- `#fil-grid`
- `#setup-form`
- `#setup-actions`

### Passos minimos

1. aguardar listagem de filiais
2. selecionar uma filial existente
3. se nao houver filial, seguir apenas com validacao manual inicial
4. confirmar entrada no app

### Asserts minimos

- existe pelo menos uma opcao visivel quando o usuario tem filial
- a escolha da filial altera o estado da aplicacao
- a tela principal do app passa a ser exibida

### Falhas que bloqueiam

- lista vazia com usuario que deveria ter filial
- selecao visual ocorre, mas o app nao entra
- setup segue sem filial valida

### Observacao

A criacao da primeira filial deve continuar manual no comeco, por depender mais do ambiente/dados do que do fluxo basico da smoke suite.

## Fluxo 3 - Carregamento inicial da filial

### Objetivo

Garantir que o bootstrap da filial conclui sem deixar o app em estado inconsistente.

### Elementos principais

- `#screen-app`
- `#screen-setup`
- cards ou blocos principais da primeira tela carregada

### Passos minimos

1. apos selecionar a filial, aguardar fim do carregamento
2. verificar que a tela principal do app ficou visivel
3. verificar que a tela de setup nao permaneceu ativa
4. validar presenca minima de conteudo operacional

### Asserts minimos

- `#screen-app` visivel
- `#screen-setup` oculto
- pagina principal renderizada sem erro fatal
- bootstrap nao deixa o app travado em loading eterno

### Falhas que bloqueiam

- tela branca
- loading infinito
- app entra sem dados minimos e sem mensagem clara

## O que manter manual nesta onda

- criacao da primeira filial
- verificacao visual fina de skeleton/loading
- mensagens detalhadas de erro e empty states

## Criterio de pronto da Onda B

- existe roteiro automatizavel para login + setup + bootstrap
- os asserts minimos estao definidos
- o time consegue implementar a automacao UI sem redescobrir o fluxo

## Entregavel esperado depois da implementacao

- 3 specs UI separados
- 1 runner operacional executando os 3 fluxos em sequencia
- evidencias de execucao
- integracao desse spec na smoke suite minima da Fase 2

## Comando operacional recomendado

```powershell
npm run test:e2e:onda-b
```

## Referencias

- [FLUXOS_CRITICOS_SMOKE_SUITE_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/FLUXOS_CRITICOS_SMOKE_SUITE_FASE_2.md)
- [ROTEIRO_AUTOMACAO_INCREMENTAL_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/ROTEIRO_AUTOMACAO_INCREMENTAL_FASE_2.md)
- [CHECKLIST_EXECUCAO_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_2.md)
