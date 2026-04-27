# Governança Visual — Produto (React)

Critérios práticos de qualidade visual, checklists de PR e novas telas, e regras de evolução.

**Referência de componentes:** [UI_COMPONENTS.md](./UI_COMPONENTS.md)
**Inconsistências mapeadas:** [AUDITORIA_INCONSISTENCIAS.md](./AUDITORIA_INCONSISTENCIAS.md)

---

## Definição de Pronto — UI/UX

Uma tela está **pronta** quando os critérios abaixo são verdadeiros.
Exceções precisam estar documentadas em `AUDITORIA_INCONSISTENCIAS.md`.

| Critério | Padrão obrigatório |
|----------|--------------------|
| Shell | `<main className="rf-content rf-ui-stack">` |
| Título e contexto | `PageHeader` com título, descrição e CTA principal |
| Listas | `FilterBar` + `DataTable` ou lista de cards |
| Vazio | `EmptyState` com ação ou orientação clara |
| Loading | `EmptyState compact` ou estado integrado ao `DataTable` |
| Erro | `EmptyState compact` ou `rf-error-banner` inline |
| CTA principal | Exatamente 1 `btn btn-p` por tela ou modal |
| Ação destrutiva | `<Modal>` de confirmação com `btn-r` antes de executar |
| Em progresso | Botão `disabled` + texto descritivo — nunca `'...'` |
| Status semântico | `StatusBadge` — sem `.bdg` manual para status de entidade |
| Métricas | `StatCard` em `rf-ui-stat-grid` — sem `.bento-band .met` |
| Overlays | `<Modal>` ou `<Drawer>` compartilhado — sem `modal-wrap` manual |
| Microcopy | Sem jargão técnico; erros descrevem problema e próximo passo |

---

## 1. Princípios

O produto é um ERP/SaaS B2B operacional. Cada decisão visual deve satisfazer:

- **Previsível** — mesma ação, mesmo visual em todos os módulos
- **Eficiente** — informação relevante visível sem scroll desnecessário
- **Orientadora** — estados vazios, erros e confirmações indicam o próximo passo
- **Neutra** — sem embelezamento gratuito; cada elemento justifica sua presença

---

## 2. Composição de páginas

### Página operacional (lista + detalhe)

```
PageHeader  (título, descrição sem jargão, CTA primário do módulo)
StatCard grid  (opcional — métricas relevantes)
FilterBar  (busca + filtros + ação secundária)
DataTable ou lista de cards
EmptyState  (quando lista vazia ou sem resultado)
```

### Página administrativa (CRUD)

```
PageHeader  (título, descrição, ações)
StatCard grid  (opcional)
Grade de cards  (FilialCard, RcaCard...)
EmptyState  (quando vazio)
Modal  (para criar/editar)
```

### Wrapper obrigatório

Toda page de módulo usa `<main className="rf-content rf-ui-stack">`.
Pages que vivem dentro de um shell com wrapper próprio (PilotPages) usam `<div className="rf-content">`.

---

## 3. Estados e feedbacks

| Estado | Como tratar |
|--------|------------|
| Carregando | `<EmptyState title="Carregando..." compact />` |
| Vazio (sem dados) | `<EmptyState title="..." action={<button>Criar</button>} />` |
| Sem resultado | `<EmptyState title="Nenhum resultado." description="Ajuste os filtros." action={<button>Limpar filtros</button>} />` |
| Erro de API | `<EmptyState title={mensagem} compact />` ou banner inline |
| Operação em curso | Botão `disabled` com texto `'Salvando…'` / `'Aguarde…'` / `'Excluindo…'` |
| Sucesso após save | Fechar modal + redirecionar para detalhe |
| Confirmação destrutiva | `<Modal>` com botão `btn-r` — nunca `window.confirm()` em produção |

**Regras absolutas:**
- Nunca `'...'` como loading indicator em botões
- Sempre `disabled` durante operações em andamento
- `btn-danger` não existe — use `btn-r`

---

## 4. Hierarquia de CTAs

```
btn btn-p           → ação primária do módulo (1 por tela)
btn btn-p btn-sm    → ação primária em FilterBar / toolbar
btn btn-sm          → ação secundária
btn btn-r btn-sm    → ação destrutiva (excluir, cancelar irreversível)
```

Footer de Modal: **Cancelar** (neutro, esquerda) → **Confirmar** (primário ou destrutivo, direita).

---

## 5. QA visual — checklist de PR

Use antes de abrir ou revisar qualquer PR com mudança em UI.

### Estrutura
- [ ] Toda page nova tem `PageHeader` com título e descrição sem jargão técnico
- [ ] Toda lista usa `FilterBar` + `DataTable` ou cards (sem `<table>` manual)
- [ ] Lista vazia usa `EmptyState` (sem `<div className="empty">`)
- [ ] Wrapper externo é `rf-content rf-ui-stack`

### Componentes
- [ ] Status semântico usa `StatusBadge` (sem `.bdg bg/.bdg br` para status)
- [ ] Métricas usam `StatCard` em grid (sem `.bento-band .met`)
- [ ] Modais usam `<Modal>` compartilhado (sem `modal-wrap`/`modal-bg` manual)

### Estados e feedback
- [ ] Loading, erro e vazio tratados em toda lista/fetch
- [ ] Botões com operação em curso usam texto descritivo (`'Salvando…'`, não `'...'`)
- [ ] Ações destrutivas têm `<Modal>` de confirmação antes de executar
- [ ] Botões ficam `disabled` durante operações em andamento

### Hierarquia visual
- [ ] Exatamente 1 CTA `btn-p` claro por tela ou modal
- [ ] Ação destrutiva usa `btn-r` (não `btn-danger`)
- [ ] Footer de modal: Cancelar esquerda, Ação direita

### Acessibilidade mínima
- [ ] `focus-visible` funcional nos elementos interativos principais
- [ ] Modais têm Escape e `role="dialog"` (garantido pelo `<Modal>` compartilhado)
- [ ] Botões têm texto descritivo ou `aria-label`

### Microcopy
- [ ] Nenhum texto menciona arquitetura interna ("React", "legado", "shell", "bridge")
- [ ] Mensagens de erro descrevem o problema e o próximo passo
- [ ] Placeholders são exemplos curtos, não instruções longas

---

## 6. Checklist — nova tela

Responda antes de implementar:

**Estrutura**
- Precisa de `PageHeader`? → Sim, sempre que for page de módulo
- Tem lista? → `FilterBar` + `DataTable` ou lista de cards
- Tem formulário? → `Modal` com `FormSection`, ou page dedicada
- Tem métricas? → `StatCard` em `rf-ui-stat-grid--3` ou `--2`

**Estados**
- O que aparece enquanto carrega? → `<EmptyState compact />`
- O que aparece se a lista estiver vazia? → `<EmptyState action={...} />`
- O que aparece se der erro? → `<EmptyState title={erro} compact />`
- A ação principal tem feedback de progresso e conclusão?

**CTAs**
- Qual é o CTA primário? → `btn btn-p`
- Tem ação destrutiva? → Confirmar via `<Modal>` com `btn-r`
- Tem operação em curso? → `disabled` + texto `'Aguarde…'` / `'Salvando…'`

**Shared vs feature-local** (ver seção 7)

---

## 7. Shared vs feature-local

**Vai para `shared/ui/`:**
- Presentacional, sem estado próprio
- Usado em ≥ 2 módulos, ou claramente reutilizável
- Sem dependência de stores de feature
- API estável com props bem definidas

**Fica na feature:**
- Fortemente acoplado ao domínio do módulo
- Usa store ou hooks da feature
- Improvável de ser reutilizado

**Quando criar variante:**
- Variante muda comportamento → componente separado com nome distinto
- Variante é só visual (tamanho, cor) → prop no componente existente
- Nunca fork silencioso

**Quando NÃO abstrair:**
- Dois componentes similares sem histórico de coevolução → wait and see
- A abstração aumenta complexidade da API sem benefício claro
- O componente tem ≤ 20 linhas e 1 único uso

---

## 8. Evolução sustentável

1. Componente novo em `shared/ui/` exige atualização de `index.ts` e `UI_COMPONENTS.md`
2. Mudança em classe CSS de componente compartilhado → testar no mínimo Clientes, Pedidos e Estoque
3. Cores e espaçamento via variável CSS (`--acc`, `--line`, `--panel`, `--muted`, `--err`, `--ok`, `--warn`) — nunca hardcoded
4. Classes mortas que não devem ser usadas em código novo: `screen-content`, `form-gap-lg`, `btn-danger`
5. Antes de criar componente novo: verificar se `EmptyState`, `DataTable`, `Modal` ou `FormSection` já resolve com props
6. Inconsistências encontradas fora do escopo de um PR → registrar em `AUDITORIA_INCONSISTENCIAS.md`, não corrigir inline
7. A trilha de consolidação visual UX-1 a UX-10 está encerrada. Toda manutenção segue esta governança — sem rodadas especiais.
