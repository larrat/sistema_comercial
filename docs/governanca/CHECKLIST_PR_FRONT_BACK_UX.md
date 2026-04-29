# Checklist de PR — Front-end, Back-end e UX

Use este checklist em todo PR ou commit relevante antes de solicitar revisão ou merge.

---

## Front-end

- [ ] Não criei componente duplicado.
- [ ] Reaproveitei componente global quando existia.
- [ ] Não alterei AppShell sem necessidade.
- [ ] Não alterei Router sem necessidade.
- [ ] Não alterei Sidebar/Topbar sem necessidade.
- [ ] Estados loading/error/empty foram tratados.
- [ ] Ação crítica tem confirmação.
- [ ] Ação bem-sucedida tem feedback.
- [ ] Formulário mostra erro próximo do campo.
- [ ] Drawer/Modal segue padrão global.
- [ ] Listagem usa DataTable quando aplicável.
- [ ] Busca/filtros usam FilterBar quando aplicável.
- [ ] Responsividade mínima foi validada.
- [ ] Acessibilidade básica foi validada.

## Back-end / Supabase

- [ ] Validação crítica não ficou apenas no front quando necessário.
- [ ] Permissão foi verificada.
- [ ] RLS/RBAC não foi enfraquecido.
- [ ] Consulta de alto volume tem paginação.
- [ ] Erro tem formato previsível.
- [ ] Ação crítica gera log ou está prevista para auditoria.
- [ ] Nenhum dado sensível foi exposto indevidamente.

## Produto / UX

- [ ] O fluxo ficou mais claro.
- [ ] O usuário não perde contexto.
- [ ] Não aumentei cliques sem necessidade.
- [ ] A mensagem de erro é compreensível.
- [ ] O estado vazio orienta o próximo passo.
- [ ] A ação principal está evidente.
- [ ] A mudança melhora operação real, não apenas aparência.

## Validação

- [ ] Rodei lint, typecheck, test e build quando disponíveis.
- [ ] Testei o fluxo principal afetado.
- [ ] Testei estado vazio.
- [ ] Testei estado de erro quando possível.
- [ ] Testei carregamento.
- [ ] Registrei riscos conhecidos.

---

## Referências

| Documento | Para que serve |
|-----------|----------------|
| `docs/governanca/BASELINE_TECNICO_ATUAL.md` | Mapa da arquitetura atual |
| `docs/governanca/INVENTARIO_COMPONENTES_COMPARTILHADOS.md` | Componentes globais disponíveis |
| `docs/governanca/ENGINEERING_POLICY.md` | Política de qualidade e tipagem |
| `docs/governanca/GOVERNANCA_SQL_RLS.md` | Regras obrigatórias para SQL novo |
| `docs/backend/CONTRATO_MINIMO_SB_V1.md` | Padrão de erro e retorno do layer Supabase |
