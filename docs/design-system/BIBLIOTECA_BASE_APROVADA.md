# Biblioteca Base Aprovada (Design System v1)

Data: 2026-04-07
Status: Aprovada para uso em novas entregas

## Fonte unica de verdade

- Arquivo principal de estilo: `css/style.css`
- Secao canonica recomendada (ordem obrigatoria):
  1. Tokens (`:root`): cor, tipografia, espaco, radius, sombra, transicao
  2. Base/Reset
  3. Layout shell (`.app-*`)
  4. Componentes (`.btn`, `.inp`, `.sel`, `.card`, `.tbl`, `.modal-box`, `#toast`, `.bdg`, `.tabs/.tb`, `.empty`, `.sk-*`)
  5. Utilitarios e estados (`.is-loading`, `.is-error`, `.is-success`, `:focus-visible`)
  6. Responsivo (media queries)

## Tokens semanticos obrigatorios

- Critico: vermelho
- Atencao: ambar
- Oportunidade: azul
- Sucesso: verde
- Neutro: tons de base

Aplicacao:
- `Badge`: prioridade/status
- `Alert/Toast`: feedback de operacao
- `StatCard/KPI`: destaque de risco e oportunidade

## Componentes base autorizados

- `Button`: `.btn` + variantes semanticas (`.btn-p`, `.btn-r`, `.btn-gh`, `.btn-sm`)
- `Input`/`Select`: `.inp`, `.sel`
- `Card`/`Panel`: `.card`, `.panel`
- `Table`: `.tbl`
- `Modal`: `.modal-wrap`, `.modal-box`
- `Toast`: `#toast` + classes de tipo
- `Badge`: `.bdg`
- `Tabs`: `.tabs`, `.tb`
- `Empty state`: `.empty`
- `Loading`: `.is-loading`, `.sk-grid`
- `Pagination` (novo): `c-pagination` (a implementar como padrao)

## Regras de aprovacao

- Novo componente so entra se:
  - nao existir equivalente na base,
  - tiver documentacao de anatomia + estados,
  - tiver uso em 2+ modulos.

- Novo token so entra se:
  - for semantico (nao por tela),
  - estiver mapeado para prioridade de informacao.
