# Critério Mínimo de Aceite UX/UI por Feature

Data base: 2026-04-07
Status: Obrigatório em cada feature com impacto em UI/UX

## Regra de aceite

Uma feature só é considerada pronta se atender os 4 blocos abaixo:

## A) Clareza de tarefa
- Usuário entende em até 5 segundos:
  - o objetivo da tela,
  - a ação principal,
  - o próximo passo.

## B) Operação sem fricção
- Fluxo principal conclui sem ambiguidade.
- Erros de validação orientam correção imediata.
- Ações de risco têm confirmação (quando aplicável).

## C) Qualidade visual e técnica
- Reuso de componentes do Design System.
- Semântica de cor correta por prioridade.
- Estados completos (`empty/loading/error/success/disabled`).
- Responsividade funcional em 360px+, 768px+ e desktop.

## D) Acessibilidade mínima
- Foco visível.
- Navegação por teclado funcional nas ações críticas.
- Contraste adequado nos principais elementos de leitura e ação.

## Template de aceite por feature

Feature: __________________________

- [ ] Ação principal clara e visível.
- [ ] Mensagens de feedback padronizadas.
- [ ] Tratamento de erro com impacto + próximo passo.
- [ ] Fluxo mobile concluído sem depender de menu oculto.
- [ ] Estados visuais completos e consistentes.
- [ ] Revisão UX/UI aprovada.

Aprovador UX/UI: __________________________
Data: __________________________
Observações: __________________________
