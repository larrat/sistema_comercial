# Lista de Inconsistencias (Design System)

Data: 2026-04-07

## 1) Duplicacao de seletores globais

Contagem de redefinicoes por seletor (aprox. por bloco CSS):

- `.app-topbar`: 3 blocos
- `.inp`: 3 blocos
- `.modal-box`: 3 blocos
- `#toast`: 4 blocos
- `.tabs`: 3 blocos
- `.tb`: 2 blocos
- `.bdg`: 2 blocos
- `.tbl th`: 2 blocos
- `.tbl td`: 2 blocos

Impacto:
- regressao visual em ajustes locais,
- dificuldade de manutencao,
- comportamento inconsistente entre telas e breakpoints.

## 2) Variacoes indevidas por tela

- Overrides por pagina para tabela e botoes (`#pg-clientes`, `#pg-campanhas`) sem contrato unico.
- Regras locais de toolbar e topbar que conflitam com o shell global.
- Estados de foco/loading/disabled definidos mais de uma vez em blocos distintos.

## 3) Semantica de componentes incompleta

- `Badge` com uso misto de status, prioridade e categoria sem mapa oficial de significado.
- `Toast` sem matriz oficial de tipo (info/sucesso/erro/atencao/oportunidade) com tokens obrigatorios.
- `Empty state` existe, mas sem guideline formal de titulo, descricao, CTA e iconografia.

## 4) Governanca fraca para novos estilos

- Insercao recorrente de regras globais sem ponto unico de verdade.
- Ausencia de checklist de PR para impedir criacao de novos padroes fora da base comum.

## 5) Gap funcional de sistema

- Paginacao nao esta consolidada como componente reutilizavel.

## Priorizacao recomendada

1. Curto prazo: reduzir duplicacoes de `.app-topbar`, `.modal-box`, `#toast`, `.inp`, `.tabs/.tb`.
2. Curto prazo: congelar novos estilos fora da camada base.
3. Medio prazo: padronizar `Badge`, `Toast`, `Empty state` e criar `Pagination`.
4. Medio prazo: limpar overrides por tela com migracao por blocos.
