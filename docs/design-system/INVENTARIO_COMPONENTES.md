# Inventario de Componentes (Atual)

Data: 2026-04-07
Escopo analisado: `index.html`, `modules/*.js`, `js/*.js`, `css/style.css`

## Mapa de componentes usados hoje

| Componente | Classe/ID principal | Uso no codigo (ocorrencias) | Estado atual |
|---|---|---:|---|
| Button | `.btn` (`.btn-p`, `.btn-sm`, `.btn-gh`, `.btn-r`) | 308 | Alto uso, com sobreposicoes de estilo |
| Input | `.inp` | 221 | Alto uso, estados dispersos |
| Select | `.sel` | 155 | Alto uso, variacoes locais |
| Modal | `.modal-wrap`, `.modal-box` | 16 / 27 | Alto impacto, regras mobile duplicadas |
| Card/Panel | `.card`, `.panel` | 217 | Base visual principal |
| Tabela | `.tbl` (`th`, `td`) | 50 | Regras globais + overrides por tela |
| Toast | `#toast` | 114 | Multipla redefinicao global |
| Badge | `.bdg` | 116 | Semantica parcialmente consistente |
| Empty state | `.empty` | 27 | Presente, sem padrao completo de variacao |
| Loading | `.is-loading`, `.sk-grid` | 6 (`sk-grid`) | Implementado de forma parcial |
| Tabs | `.tabs`, `.tb` | 7 / 103 | Componente funcional, estilo fragmentado |
| Paginacao | (nao padronizado) | 0 como componente nomeado | Gap de design system |

## Onde aparece mais

- Estrutura de shell, cards, tabela e modais: `index.html`
- Renderizacao dinamica de listas/estados: `modules/clientes.js`, `modules/campanhas.js`, `modules/dashboard.js`
- Toast, topbar, fluxo e estados globais: `js/main.js`
- Definicoes visuais e overrides: `css/style.css`

## Diagnostico rapido

- O sistema ja possui quase todos os blocos de um Design System funcional.
- O principal problema nao e ausencia de componente: e duplicidade e concorrencia de regras globais.
- Paginacao ainda nao existe como componente base unificado.
