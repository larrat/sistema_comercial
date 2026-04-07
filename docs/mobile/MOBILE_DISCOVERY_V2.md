# Mobile Discovery V2

Data: 2026-04-07

## Novo fluxo mobile

Objetivo: reduzir dependência do menu lateral para recursos estratégicos e melhorar descoberta inicial.

Fluxo principal revisado:

1. Entrada em `Dashboard` (Início)
2. Acesso imediato no rodapé para:
   - Gestão (Gerencial)
   - Campanhas
   - Alertas (Notificações)
   - Pedidos
3. Atalhos contextuais na home mobile para ação direta:
   - Gerencial
   - Campanhas
   - Alertas
   - Novo pedido
4. Menu lateral permanece como camada secundária para navegação completa.

## Menu revisado

Menu inferior mobile atualizado para 6 destinos principais:

- Início (`dashboard`)
- Gestão (`gerencial`)
- Pedidos (`pedidos`)
- Camp. (`campanhas`)
- Alertas (`notificacoes`)
- Menu (sidebar)

Resultado esperado:
- Menos passos para chegar em áreas estratégicas.
- Menor dependência de navegação escondida.

## Atalhos mobile implantados

Atalhos adicionados no topo do `Dashboard` apenas em mobile (`max-width:760px`):

- Gerencial
- Campanhas
- Alertas
- Novo pedido

Comportamento:
- Grid 2x2 para uso com uma mão.
- Botões full-width por célula.
- Mantém consistência visual com o sistema de botões atual.

## Arquivos alterados

- `index.html`
- `css/style.css`

## Métricas de sucesso sugeridas

- Tempo até primeira ação estratégica no mobile.
- Taxa de acesso ao Gerencial via mobile.
- Taxa de uso de Campanhas/Alertas sem abrir menu lateral.
