# Ritual de Revisão UX/UI por Sprint/Release

Data base: 2026-04-07
Cadência recomendada: semanal (sprint) + checkpoint final de release

## Objetivo
Garantir qualidade consistente de UX/UI antes de publicar, reduzindo dependência de validação informal.

## Papéis e responsabilidade

- Aprovador UX/UI de release (responsável final):
  - Lead/Head de Design (titular)
  - Front-end Sênior (co-aprovador técnico)
  - Product Designer (co-aprovador de fluxo)

## Ritual da Sprint (30-45 min)

1. Revisão de mudanças da sprint (telas/fluxos impactados).
2. Checagem rápida de consistência visual e semântica.
3. Verificação mobile-first e acessibilidade mínima.
4. Registro de gaps com prioridade (bloqueante, alta, média).

Saída da sprint:
- Lista de pendências UX/UI por severidade.
- Definição do que precisa estar pronto antes do release.

## Ritual de Release (45-60 min)

1. Rodar checklist obrigatório de release.
2. Validar critérios de aceite por feature crítica.
3. Executar smoke visual desktop + mobile.
4. Formalizar decisão:
   - Aprovado
   - Aprovado com ressalvas (não bloqueantes)
   - Reprovado (com bloqueios)

## Critérios de bloqueio de release

Bloqueia publicação se houver:
- erro crítico sem recuperação guiada;
- quebra de responsividade em 360px+;
- ausência de foco visível em fluxo crítico;
- inconsistência grave de componente/semântica de cor;
- fluxo crítico incompleto (clientes, pedidos, campanhas, dashboard).

## Evidências mínimas da revisão

- Checklist preenchido.
- Lista de features avaliadas com status.
- Nome do aprovador UX/UI.
- Data/hora da decisão.

## Registro padrão da decisão

Release: __________________________

- Status: [ ] Aprovado [ ] Aprovado com ressalvas [ ] Reprovado
- Aprovador UX/UI: __________________________
- Co-aprovadores: __________________________
- Bloqueios identificados: __________________________
- Plano de correção (se aplicável): __________________________
- Data/hora: __________________________
