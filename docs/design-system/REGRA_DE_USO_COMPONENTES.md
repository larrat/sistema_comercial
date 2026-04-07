# Regra de Uso dos Componentes

Data: 2026-04-07

## Politica de congelamento

- Fica congelada a criacao de novos padroes visuais fora da base comum.
- E proibido criar estilo global novo sem revisao de Design + Front-end senior.
- Overrides por tela so sao permitidos quando:
  - houver requisito de contexto real,
  - com escopo local (`#pg-*`) e justificativa no PR,
  - sem quebrar token semantico global.

## Fluxo de governanca (obrigatorio)

1. Product Designer define necessidade e criterio de uso.
2. Front-end senior valida reuso de componente existente.
3. Lead/Head de Design aprova semantica visual e consistencia.
4. Implementacao entra na camada base (nao em regra ad-hoc por tela).

## Checklist de PR (Design System)

- Usa componente existente (`Button/Input/Select/...`) sem duplicar padrao?
- Usa token semantico correto (critico/atencao/oportunidade/sucesso)?
- Mantem foco visivel e contraste adequado?
- Funciona em mobile (360px+) sem corte de conteudo?
- Evita novo bloco global duplicado de `.app-topbar`, `.btn`, `.tb`, `.card`, `.modal-box`, `.tbl`, `#toast`?

Se qualquer resposta for "nao", PR volta para ajuste.

## Responsaveis

- Lead/Head de Design: dono da linguagem visual e aprovacao final.
- Front-end senior: dono da arquitetura CSS e da base de componentes.
- Product Designer: dono da logica de uso por fluxo e da semantica de UX.

## Cadencia operacional

- Revisao quinzenal de consistencia visual.
- Auditoria mensal de duplicacoes CSS.
- Relatorio trimestral de maturidade do Design System (adocao + regressao).

## Referencias oficiais

- Matriz e manual: `docs/design-system/MANUAL_COMPONENTES_V1.md`
- Guia de aplicacao: `docs/design-system/GUIA_APLICACAO_COMPONENTES.md`
- Anti-padroes: `docs/design-system/ANTI_PADROES_COMPONENTES.md`
