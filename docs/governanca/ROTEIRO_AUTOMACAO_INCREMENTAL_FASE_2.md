# Roteiro de Automacao Incremental - Fase 2

Data base: 2026-04-08  
Status: pronto para execucao  
Objetivo: separar os 6 fluxos criticos da smoke suite minima entre automacao por script, automacao por UI e validacao manual inicial.

## Principio da fase

Nao tentar automatizar tudo de uma vez.

A Fase 2 deve seguir esta ordem:

1. automatizar primeiro o que ja tem contrato backend e script simples
2. automatizar por UI apenas o que depende do fluxo visual principal
3. manter manual no inicio o que ainda teria alto custo de manutencao ou pouca estabilidade

## Classificacao oficial por fluxo

### Fluxo 1 - Login autenticado

- Tipo inicial: `UI`
- Motivo:
  - valida tela de entrada, sessao, redirecionamento e feedback visual
  - tem valor maior em automacao end-to-end do que em script isolado

- Recomendacao:
  - automatizar com navegador/headless quando a ferramenta de UI estiver definida
  - manter caso manual leve ate a automacao existir

- Nao recomendado agora:
  - criar script HTTP solto para substituir o fluxo visual principal

### Fluxo 2 - Setup de filial

- Tipo inicial: `UI`
- Motivo:
  - depende da tela de setup, escolha de filial e transicao de estado visual
  - o ganho vem de validar comportamento da interface e do estado

- Recomendacao:
  - automatizar junto com o fluxo de login
  - manter manual no comeco se o harness de UI ainda nao existir

### Fluxo 3 - Carregamento inicial da filial

- Tipo inicial: `UI`
- Motivo:
  - valida bootstrap, loading, entrada no app e consistencia minima de render
  - precisa observar comportamento visual e nao so contrato HTTP

- Recomendacao:
  - automatizar no mesmo roteiro UI de login + setup
  - incluir asserts de carregamento basico da pagina

### Fluxo 4 - Campanhas / Gerar fila

- Tipo inicial: `Script`
- Motivo:
  - ja existe endpoint backend
  - ja existe smoke dedicado
  - contrato e autorizacao sao o principal risco

- Artefato atual:
  - [campanhas-gerar-fila.ps1](/e:/Programas/sistema_comercial/scripts/smoke/campanhas-gerar-fila.ps1)

- Recomendacao:
  - automatizar primeiro por script
  - so depois adicionar cobertura UI para o botao `Gerar fila`

### Fluxo 5 - Acessos admin / Escrita

- Tipo inicial: `Script`
- Motivo:
  - ja existe endpoint backend
  - ja existe smoke dedicado
  - risco principal e autorizacao/escrita indevida, nao visual

- Artefato atual:
  - [acessos-admin.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin.ps1)

- Recomendacao:
  - automatizar primeiro por script
  - validar `200` e `403`
  - deixar UI apenas como complementar

### Fluxo 6 - Acessos admin / Leitura

- Tipo inicial: `Script + UI leve`
- Motivo:
  - contrato backend ja existe
  - ja existe smoke de leitura
  - mas vale uma confirmacao UI leve para garantir que a tela usa o endpoint agregado

- Artefatos atuais:
  - [acessos-admin-read.ps1](/e:/Programas/sistema_comercial/scripts/smoke/acessos-admin-read.ps1)
  - [filiais-acessos.js](/e:/Programas/sistema_comercial/modules/filiais-acessos.js)

- Recomendacao:
  - automatizar contrato por script primeiro
  - depois adicionar um check UI pequeno para abrir a tela e validar carregamento

## Matriz objetiva

| fluxo | caminho inicial | caminho seguinte | manter manual no comeco |
|---|---|---|---|
| login autenticado | UI | UI automatizada completa | sim |
| setup de filial | UI | UI automatizada completa | sim |
| carregamento inicial da filial | UI | UI automatizada com asserts de bootstrap | sim |
| campanhas / gerar fila | script | UI complementar | nao |
| acessos admin / escrita | script | UI complementar | nao |
| acessos admin / leitura | script + UI leve | UI mais completa se necessario | parcialmente |

## Ordem recomendada de implementacao

### Onda A - Script first

Automatizar primeiro:

1. campanhas / gerar fila
2. acessos admin / escrita
3. acessos admin / leitura

Motivo:

- menor custo
- maior retorno imediato
- cobre os fluxos backend mais sensiveis

### Onda B - UI core

Automatizar depois:

1. login autenticado
2. setup de filial
3. carregamento inicial da filial

Motivo:

- precisa ferramenta de UI/harness mais estavel
- valida risco real de regressao visual/fluxo

### Onda C - UI complementar

Adicionar por ultimo:

1. clique de `Gerar fila` na UI de campanhas
2. abrir tela de acessos e validar render agregado

Motivo:

- adiciona confianca de integracao
- nao deve bloquear a suite minima inicial

## O que deve continuar manual no comeco

- criacao da primeira filial em ambiente com dados muito variaveis
- verificacao visual fina de loading/tela branca
- validacao exploratoria de mensagens e estados vazios

## O que nao deve entrar agora

- automacao extensa de layout/CSS
- automacao de todos os CRUDs da aplicacao
- automacao de modais secundarios fora dos 6 fluxos criticos
- harness complexo antes de validar os scripts backend

## Criterio de pronto da automacao incremental

- os 3 fluxos backend ja rodam por script com evidencias
- o roteiro UI principal cobre login + setup + bootstrap
- existe separacao clara entre o que e smoke obrigatoria e o que e teste complementar

## Referencias

- [FLUXOS_CRITICOS_SMOKE_SUITE_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/FLUXOS_CRITICOS_SMOKE_SUITE_FASE_2.md)
- [CHECKLIST_EXECUCAO_FASE_2.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_2.md)
