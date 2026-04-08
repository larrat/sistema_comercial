# Governança Visual (Design System v1)

## Objetivo
Manter a interface premium, consistente e escalável sem regressão visual entre módulos.

## Fonte da Verdade
- Arquivo base: `src/styles/style.css`
- Camadas ativas:
1. tokens e componentes globais;
2. fluxos críticos (dashboard/clientes/campanhas);
3. consolidação final (`DESIGN SYSTEM V1 - CONSOLIDAÇÃO FINAL`).

## Semântica de cor por prioridade
- Crítico: vermelho (`--color-critical-*`)
- Atenção: âmbar (`--color-warning-*`)
- Oportunidade: azul (`--color-opportunity-*`)
- Sucesso: verde (`--color-success-*`)

## Estados obrigatórios
- Interação: `hover`, `focus-visible`, `active`
- Disponibilidade: `disabled`
- Processo: `is-loading`
- Feedback: `is-error`, `is-success`

## Regras para novas features
- Reusar classes-base: `.btn`, `.inp`, `.sel`, `.bdg`, `.card`, `.panel`, `.tbl`, `.modal-box`, `.tb`.
- Evitar inline style para tipografia, cor e spacing (usar tokens/classes).
- Mobile-first: garantir CTA primário com toque fácil (`min-height >= 44px` no mobile).
- Em listas críticas:
  - desktop: tabela legível;
  - mobile: `mobile-card` com ações visíveis.

## Checklist de qualidade (PR)
- [ ] CTA primário do módulo está claro na topbar.
- [ ] Contraste de texto e status está legível.
- [ ] Estados `focus-visible` e `disabled` foram testados.
- [ ] Fluxo mobile concluído com uma mão (sem botão escondido).
- [ ] Tabela desktop e card mobile mostram a mesma informação-chave.
- [ ] Não foram adicionados seletores duplicados sem necessidade.
- [ ] Comando `/ auditoria visual` retorna sem falhas críticas.

## Rotina de validação
1. Abrir `Clientes` e `Campanhas` em desktop e mobile.
2. Rodar comando rápido: `/ auditoria visual`.
3. Validar criação/edição em modal e ação principal por módulo.
4. Confirmar semântica de prioridade (crítico/atenção/oportunidade/sucesso).

## Governança de release UX/UI (obrigatório)
- Checklist de release: `docs/release/CHECKLIST_RELEASE_UX_UI.md`
- Critério de aceite por feature: `docs/release/CRITERIO_ACEITE_UX_UI_POR_FEATURE.md`
- Ritual de revisão por sprint/release: `docs/release/RITUAL_REVISAO_SPRINT_RELEASE_UX_UI.md`

Gate de publicação:
- Nenhuma release com impacto em UI/UX pode ser publicada sem aprovação do responsável UX/UI da release.
- Itens bloqueantes do checklist devem estar 100% concluídos.
