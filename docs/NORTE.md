# Norte do Projeto — Sistema Comercial

**Atualizado em:** 2026-04-21

Este é o documento central. Ele descreve o estado real do sistema, o que estamos fazendo agora e onde encontrar cada referência ativa. Qualquer doc que não esteja listado aqui foi cancelado.

---

## Estado atual do sistema

### Módulos React (migration status)

| Módulo | Status | Próxima ação |
|--------|--------|-------------|
| Pedidos | React-only — legado é stub vazio | Nenhuma |
| Clientes | React-only — fallbacks removidos (2026-04-18) | Remover `#cli-legacy-shell` do HTML + deletar `clientes.js` |
| Dashboard | React ativo por padrão — shell legado presente | Remover `#dash-legacy-content` do HTML + deletar `dashboard.js` |
| Contas Receber | SQL 16 aplicado — RPCs ativas | Validar no ambiente → flip flag → remover `#cr-legacy-shell` |
| Estoque | Legado puro — sem React equivalente | Fase 2 da migração |
| Produtos | Legado puro — sem React equivalente | Fase 2 da migração |
| Cotação | Legado puro — sem React equivalente | Fase 2 da migração |
| Relatórios | Legado puro — sem React equivalente | Fase 2 da migração |
| Campanhas | Legado puro — sem React equivalente | Fase 2 da migração (maior complexidade) |
| RCAs / Oportunidades | Legado puro — baixa complexidade | Fase 2 da migração |

### RBAC / Backend

| Item | Status |
|------|--------|
| RLS de produção (`02_rls_producao.sql`) | Aplicado |
| RBAC v1 + seed (`03`, `03b`) | Aplicado |
| Matriz de permissões publicada | Aplicada |
| RBAC v2 admin-only (`04_rbac_v2_admin_only.sql`) | **Pendente em produção** |
| Auditoria RBAC (`05_rbac_auditoria_acessos.sql`) | **Pendente em produção** |
| Edge Functions (campanhas, acessos-admin) | **Não deployadas** |

---

## O que estamos fazendo agora

### Imediato (Bloco 1 do sprint)

1. ~~Aplicar `sql/16_contas_receber_backend_consistencia.sql` em produção~~ — feito 2026-04-21
2. Validar RPCs no ambiente real: `rpc_registrar_baixa`, `rpc_estornar_baixa`, `rpc_marcar_conta_pendente`
3. Flipar `receber.defaultValue: false → true` em `src/legacy/bridges/feature-flags.js`
4. Remover `#cr-legacy-shell` do `index.html` + deletar `src/features/contas-receber.js`
5. Remover `#cli-legacy-shell` + deletar `src/features/clientes.js`
6. Remover `#dash-legacy-content` + deletar `src/features/dashboard.js`

### Depois (UX — Bloco 1 continuação)

7. Separar fluxo de entrada: login / criar empresa / escolher filial
8. Reduzir e reorganizar menu principal
9. Redesenhar primeira dobra do dashboard
10. Criar estados vazios acionáveis nos módulos principais

---

## Documentos ativos

### Roadmap e execução

| Documento | Para que serve |
|-----------|---------------|
| [governanca/PLANO_REMOCAO_LEGADO.md](governanca/PLANO_REMOCAO_LEGADO.md) | Checklists granulares por módulo para remoção do legado |
| [governanca/CHECKLIST_EXECUCAO_UX_E_PRODUTO_2026-04-21.md](governanca/CHECKLIST_EXECUCAO_UX_E_PRODUTO_2026-04-21.md) | Tracker das 8 fases de UX — marcar itens conforme concluídos |
| [governanca/PLANO_SPRINT_UX_E_PRODUTO_2026-04-21.md](governanca/PLANO_SPRINT_UX_E_PRODUTO_2026-04-21.md) | Blocos 1/2/3 do sprint atual |
| [governanca/CHECKLIST_EXECUCAO_FASES_3_E_4.md](governanca/CHECKLIST_EXECUCAO_FASES_3_E_4.md) | Registro histórico da migração técnica com datas |
| [governanca/BACKLOG_DEBT_CONTROL_UX_UI.md](governanca/BACKLOG_DEBT_CONTROL_UX_UI.md) | Débito técnico de UX/UI — itens a resolver |

### Backend e banco

| Documento | Para que serve |
|-----------|---------------|
| [backend/CHECKLIST_RBAC_IMPLANTACAO.md](../backend/CHECKLIST_RBAC_IMPLANTACAO.md) | 4 itens de RBAC ainda pendentes em produção |
| [backend/RBAC_MATRIZ_PERMISSOES_2026-04-07.md](../backend/RBAC_MATRIZ_PERMISSOES_2026-04-07.md) | Referência de papéis: admin / gerente / operador |
| [backend/CONTRATO_MINIMO_SB_V1.md](../backend/CONTRATO_MINIMO_SB_V1.md) | Contrato do layer SB — padrão de erro e retorno |
| [governanca/GOVERNANCA_SQL_RLS.md](governanca/GOVERNANCA_SQL_RLS.md) | Regras obrigatórias para qualquer SQL novo |

### Engenharia e qualidade

| Documento | Para que serve |
|-----------|---------------|
| [governanca/ENGINEERING_POLICY.md](governanca/ENGINEERING_POLICY.md) | Política de engenharia — tipagem, qualidade, commits, segurança |
| [governanca/CODE_REVIEW_CHECKLIST.md](governanca/CODE_REVIEW_CHECKLIST.md) | Checklist de PR — usar em todo review |
| [governanca/COVERAGE_THRESHOLD_PROPOSTA.md](governanca/COVERAGE_THRESHOLD_PROPOSTA.md) | Thresholds de cobertura por fase (ativo no CI) |
| [arquitetura/TYPESCRIPT_GRADUAL.md](../arquitetura/TYPESCRIPT_GRADUAL.md) | Estratégia de adoção gradual de TypeScript |
| [arquitetura/ADR_TEMPLATE.md](../arquitetura/ADR_TEMPLATE.md) | Template para registrar decisões de arquitetura |

### UX e release

| Documento | Para que serve |
|-----------|---------------|
| [release/CHECKLIST_RELEASE_UX_UI.md](../release/CHECKLIST_RELEASE_UX_UI.md) | Gate obrigatório antes de qualquer release com UI |
| [release/CRITERIO_ACEITE_UX_UI_POR_FEATURE.md](../release/CRITERIO_ACEITE_UX_UI_POR_FEATURE.md) | Critério de aceite por feature de produto |
| [design-system/GOVERNANCA_VISUAL.md](../design-system/GOVERNANCA_VISUAL.md) | Regras de design system — o que usar e o que evitar |
| [feedback/FEEDBACK_ERROS_PADRAO_V1.md](../feedback/FEEDBACK_ERROS_PADRAO_V1.md) | Padrão de mensagens de erro para o usuário |

---

## Regras que não mudam

- Todo PR passa pelo `CODE_REVIEW_CHECKLIST.md`
- Todo SQL novo segue a `GOVERNANCA_SQL_RLS.md`
- Toda feature com UI passa pelo `CHECKLIST_RELEASE_UX_UI.md`
- Nenhuma regra de negócio financeira fica só no frontend
- Commits seguem o padrão `feat/fix/refactor/docs(escopo): mensagem`
- Novo módulo React = cria pilot com flag `defaultValue: false` → valida → flipa → remove legado

---

## Próximas frentes (após Bloco 1)

| Ordem | Frente | Estimativa |
|-------|--------|-----------|
| 1 | Remover shells legados (clientes, dashboard, contas-receber) | Imediato após SQL 16 |
| 2 | UX: fluxo de entrada e menu | Bloco 1 cont. |
| 3 | React: Produtos (base para Estoque e Cotação) | Mês 1 |
| 4 | React: Estoque + Cotação (paralelo) | Mês 1–2 |
| 5 | React: RCAs + Relatórios | Mês 2 |
| 6 | React: Campanhas | Mês 3 |
| 7 | Remover infraestrutura bridge (`src/legacy/`) | Após fase 6 |
