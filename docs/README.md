# Documentação do Sistema Comercial

Este é o índice prático da documentação.
Use este arquivo para saber qual documento ainda vale e qual é apenas histórico.

## Leitura rápida

| Documento | Uso |
|---|---|
| [NORTE.md](NORTE.md) | Estado executivo atual e próximas decisões. |
| [PLANO_SIMPLES.md](PLANO_SIMPLES.md) | Regra de trabalho enxuta para uma pessoa e uma loja. |
| [status/STATUS_GERAL_2026-05-06.md](status/STATUS_GERAL_2026-05-06.md) | Análise geral atual do sistema, telas, regras, UX/UI e banco. |
| [ORGANIZACAO_DOCUMENTACAO.md](ORGANIZACAO_DOCUMENTACAO.md) | Como separar docs por tipo/status sem quebrar tudo. |

## Em andamento

| Documento | Uso |
|---|---|
| [andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md](andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md) | Plano faseado para padronizar Pedidos sem regredir Clientes, Produtos, Receber, Estoque e PDV. |

## Referências de UX/UI

| Documento | Uso |
|---|---|
| [PADRAO_TELA_CLIENTES.md](PADRAO_TELA_CLIENTES.md) | Padrão de tela usado como referência para outras áreas. |
| [design-system/UI_COMPONENTS.md](design-system/UI_COMPONENTS.md) | Guia de componentes React compartilhados. |
| [design-system/GOVERNANCA_VISUAL.md](design-system/GOVERNANCA_VISUAL.md) | Critérios de pronto visual e checklist de UX/UI. |
| [feedback/FEEDBACK_ERROS_PADRAO_V1.md](feedback/FEEDBACK_ERROS_PADRAO_V1.md) | Padrão de mensagens de erro. |

## Backend, banco e segurança

| Documento | Uso |
|---|---|
| [backend/CONTRATO_MINIMO_SB_V1.md](backend/CONTRATO_MINIMO_SB_V1.md) | Contrato mínimo da camada Supabase legada. |
| [backend/CHECKLIST_RBAC_IMPLANTACAO.md](backend/CHECKLIST_RBAC_IMPLANTACAO.md) | Checklist de implantação RBAC. |
| [backend/PLANO_IMPLANTACAO_RBAC_V2_AUDITORIA_PROD.md](backend/PLANO_IMPLANTACAO_RBAC_V2_AUDITORIA_PROD.md) | Plano de RBAC v2 + auditoria. |
| [governanca/GOVERNANCA_SQL_RLS.md](governanca/GOVERNANCA_SQL_RLS.md) | Regras para SQL, RLS e mudanças de banco. |
| [governanca/MATRIZ_PERMISSOES.md](governanca/MATRIZ_PERMISSOES.md) | Matriz de permissões. |

## Engenharia e qualidade

| Documento | Uso |
|---|---|
| [governanca/ENGINEERING_POLICY.md](governanca/ENGINEERING_POLICY.md) | Política de engenharia. |
| [governanca/CHECKLIST_PR_FRONT_BACK_UX.md](governanca/CHECKLIST_PR_FRONT_BACK_UX.md) | Checklist de PR. |
| [arquitetura/TYPESCRIPT_GRADUAL.md](arquitetura/TYPESCRIPT_GRADUAL.md) | Estratégia de TypeScript gradual. |
| [release/CHECKLIST_RELEASE_UX_UI.md](release/CHECKLIST_RELEASE_UX_UI.md) | Gate de release para mudanças de UI. |

## Mapeamentos úteis

| Documento | Uso |
|---|---|
| [governanca/MAPEAMENTO_MODULO_PEDIDOS.md](governanca/MAPEAMENTO_MODULO_PEDIDOS.md) | Mapa de Pedidos. |
| [governanca/MAPEAMENTO_MODULO_CONTAS_RECEBER.md](governanca/MAPEAMENTO_MODULO_CONTAS_RECEBER.md) | Mapa de Contas a Receber. |
| [governanca/MAPEAMENTO_MODULO_ESTOQUE.md](governanca/MAPEAMENTO_MODULO_ESTOQUE.md) | Mapa de Estoque. |
| [governanca/MAPEAMENTO_AUDITORIA_ACOES_CRITICAS.md](governanca/MAPEAMENTO_AUDITORIA_ACOES_CRITICAS.md) | Ações críticas e confirmação/auditoria. |

## Histórico

Os documentos abaixo existem para consulta, mas não são a fonte principal do estado atual:

- `docs/governanca/STATUS_REAL_2026-04-28.md`
- `docs/governanca/STATUS_REAL_ENTREGAS_E_PENDENCIAS_2026-04-23.md`
- Planos de sprint antigos em `docs/governanca/PLANO_*`.
- Checklists antigos em `docs/governanca/CHECKLIST_EXECUCAO_*`.

Regra: se houver conflito entre um histórico e o `NORTE.md`, vale o `NORTE.md`.
