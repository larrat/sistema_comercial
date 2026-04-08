# Roadmap de Arquitetura Escalavel

## Objetivo
Migrar o sistema de um modelo centralizado em `js/main.js` para uma arquitetura modular, com bootstrap previsivel, servicos compartilhados e fronteiras claras por dominio.

## Problemas atuais
- `js/main.js` concentra regras de negocio, navegacao, UI, seguranca e bootstrap.
- Estado global e efeitos colaterais ficam espalhados.
- Modulos usam dependencias implicitas via `window`, `localStorage` e caches globais.
- O custo de adicionar novas features cresce a cada tela.

## Modelo alvo
- `core/`
  - runtime comum
  - contexto da aplicacao
  - registro de modulos
  - servicos compartilhados
- `modules/`
  - cada dominio com init, handlers, renderizacao e adaptadores
- `js/main.js`
  - somente composicao, boot e exposicoes legadas temporarias

## Fases
1. Fundacao
- contexto da aplicacao
- registro central de modulos
- bootstrap previsivel

2. Extracao de dominios
- notificacoes
- dashboard
- filiais/acessos
- navegacao/topbar/sidebar

3. Estado e servicos
- reduzir acesso direto ao cache global
- criar adaptadores para API, storage, telemetria e auth

4. Compatibilidade
- manter `window.*` apenas como camada de transicao
- remover chamadas inline do HTML aos poucos

## Regra para novas evolucoes
- toda nova feature entra como modulo registrado
- dependencias devem ser explicitas via contexto
- evitar nova logica de negocio em `js/main.js`
