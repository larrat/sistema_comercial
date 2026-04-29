# Checklist de PR — Front-end, Back-end e UX

> Use este checklist antes de abrir qualquer PR ou marcar uma tarefa como concluída.  
> Itens que não se aplicam ao escopo da mudança devem ser marcados com `N/A` e justificados brevemente.

---

## Front-end

- [ ] Não criei componente duplicado.
- [ ] Reaproveitei componente global quando existia (`PageHeader`, `FilterBar`, `DataTable`, `ActionMenu`, `Drawer`, `Modal`, `StatusBadge`, `EmptyState`, `StatCard`, `FormSection`, `FormField`, `FormError`).
- [ ] Não alterei AppShell sem necessidade.
- [ ] Não alterei Router sem necessidade.
- [ ] Não alterei Sidebar/Topbar sem necessidade.
- [ ] Estados loading/error/empty foram tratados.
- [ ] Ação crítica tem confirmação.
- [ ] Ação bem-sucedida tem feedback.
- [ ] Formulário mostra erro próximo do campo.
- [ ] Drawer/Modal segue padrão global (`Drawer.tsx` / `Modal.tsx` de `shared/ui`).
- [ ] Listagem usa `DataTable` quando aplicável.
- [ ] Busca/filtros usam `FilterBar` quando aplicável.
- [ ] Responsividade mínima foi validada.
- [ ] Acessibilidade básica foi validada (`aria-label`, `role`, `tabIndex` quando interativo).

---

## Back-end / Supabase

- [ ] Validação crítica não ficou apenas no front quando necessário.
- [ ] Permissão foi verificada.
- [ ] RLS/RBAC não foi enfraquecido.
- [ ] Consulta de alto volume tem paginação.
- [ ] Erro tem formato previsível (ver `docs/backend/CONTRATO_MINIMO_SB_V1.md`).
- [ ] Ação crítica gera log ou está prevista para auditoria.
- [ ] Nenhum dado sensível foi exposto indevidamente.

---

## Produto / UX

- [ ] O fluxo ficou mais claro.
- [ ] O usuário não perde contexto.
- [ ] Não aumentei cliques sem necessidade.
- [ ] A mensagem de erro é compreensível.
- [ ] O estado vazio orienta o próximo passo.
- [ ] A ação principal está evidente.
- [ ] A mudança melhora operação real, não apenas aparência.

---

## Validação

- [ ] Rodei lint, typecheck, test e build quando disponíveis.
- [ ] Testei o fluxo principal afetado.
- [ ] Testei estado vazio.
- [ ] Testei estado de erro quando possível.
- [ ] Testei carregamento.
- [ ] Registrei riscos conhecidos.

---

## Referências

| Documento | Quando consultar |
|---|---|
| `docs/governanca/BASELINE_TECNICO_ATUAL.md` | Antes de criar componente ou modificar estrutura |
| `docs/governanca/ENGINEERING_POLICY.md` | Dúvidas sobre tipagem, commits e qualidade |
| `docs/governanca/GOVERNANCA_SQL_RLS.md` | Qualquer SQL novo ou alteração de RLS |
| `docs/backend/CONTRATO_MINIMO_SB_V1.md` | Formato de erro e retorno de API |
| `docs/design-system/GOVERNANCA_VISUAL.md` | Dúvidas de identidade visual |
