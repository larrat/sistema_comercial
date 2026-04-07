# Dashboard Operacional V2

Data: 2026-04-07
Status: Implementado em produção (front-end)

## 1) Novo wireframe (hierarquia por prioridade)

```text
┌ Operação rápida ─────────────────────────────────────────┐
│ Alertas prioritários (crítico/atenção/oportunidade)      │
│ [Oportunidades por time] [Próximos jogos]                │
│ [Estoque em alerta]                                      │
└──────────────────────────────────────────────────────────┘

┌ Análise do negócio ──────────────────────────────────────┐
│ KPIs (faturamento, lucro, margem, ticket, em aberto)     │
│ [Faturamento x Lucro] [Status dos pedidos]                │
│ [Top produtos] [Fornecedores]                             │
│ [Margem por produto]                                      │
└──────────────────────────────────────────────────────────┘
```

## 2) Protótipo validado (interno)

Validação realizada em revisão técnica/UX interna com os seguintes critérios:

- Separação clara entre blocos acionáveis e blocos analíticos.
- Ordem visual priorizando decisão imediata no topo.
- Redução de ruído textual em alertas (mais objetivo, menos excesso de texto).
- Estados vazios padronizados e mais legíveis.
- Responsividade preservada para desktop e mobile.

Resultado: aprovado para uso operacional.

## 3) Revisão aplicada em produção (front-end)

Mudanças implementadas:

- Reorganização do dashboard em duas seções:
  - Operação rápida
  - Análise do negócio
- Cards de ação movidos para o topo.
- Alertas reescritos para leitura curta e objetiva.
- Redução de densidade no bloco de oportunidades (lista limitada para leitura rápida).
- Padronização de espaçamentos e cabeçalhos de seção.

Arquivos alterados:

- `index.html`
- `css/style.css`
- `modules/dashboard.js`

## 4) Métrica de sucesso (acompanhamento sugerido)

- Tempo para localizar primeira ação prioritária (meta: reduzir).
- Taxa de clique em ações de topo (campanhas/sincronização/acionar).
- Taxa de abandono no dashboard após primeira visualização.
- Feedback qualitativo de clareza inicial da tela.
