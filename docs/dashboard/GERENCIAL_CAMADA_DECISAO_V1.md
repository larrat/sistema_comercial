# Camada Gerencial V1 — Insight + Acao

## Objetivo
Transformar o Gerencial em um painel de decisao com leitura orientada a execucao.

## Novo modelo
- Fonte unica: `calcGoalSummary()` + notificacoes ativas + fila de campanhas.
- Saida estruturada em dois blocos:
  - `Cards de insight`: risco, atencao e oportunidade com metrica.
  - `Recomendacoes acionaveis`: prioridade + explicacao + CTA direto.

## Regras de insight (V1)
- Risco:
  - abandono medio > 20%
  - erro operacional > 12%
  - notificacoes criticas > 0
- Atencao:
  - fila de campanha pendente > 0
  - conclusao mobile < 70%
- Oportunidade:
  - oportunidades ativas em notificacoes
  - base estavel + uso estrategico alto

## CTAs acionaveis
- `Revisar jornada de clientes` -> abre Clientes
- `Tratar criticos` -> abre Notificacoes
- `Abrir fila de campanhas` -> abre Campanhas
- `Criar acao comercial` -> abre Campanhas
- `Nova campanha` -> abre modal de nova campanha
- `Testar fluxo rapido de pedido` -> abre novo pedido
- `Atualizar KPIs` -> recalcula painel

## Eventos de produto
- `gerencial_action` com `action_id` e `page` para medir uso dos CTAs.

## Entregaveis implementados
- Novo modelo do gerencial: ativo na pagina `Gerencial`.
- Cards de insight: bloco `#ger-insights`.
- Recomendacoes acionaveis: bloco `#ger-recomendacoes`.
