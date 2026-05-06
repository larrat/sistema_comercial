# UI Components — Guia de uso (React)

Componentes compartilhados em `src/react/shared/ui/`. Use-os em toda tela nova; não recrie localmente o que já existe aqui.

---

## Componentes disponíveis

### `PageHeader`
Cabeçalho de módulo. Use no topo de cada page/módulo React.

```tsx
<PageHeader
  kicker="Compras"          // contexto pequeno acima do título
  title="Cotação"           // h1 da página
  description="..."         // descrição curta, sem jargão técnico
  actions={<button ...>}    // CTA primário do módulo
  meta={<StatusBadge ...>}  // filial ativa, status ou badge
/>
```

**Quando usar:** toda página que tem título, descrição e/ou ação principal.
**Não usar:** dentro de seções internas (use `FormSection`).

---

### `FilterBar`
Barra de filtros + ações. Agrupa inputs de busca, selects de filtro e botão de ação primária.

```tsx
<FilterBar actions={<button className="btn btn-p btn-sm">+ Novo</button>}>
  <input className="inp" placeholder="Buscar..." value={q} onChange={...} />
  <select className="inp sel" value={status} onChange={...}>...</select>
</FilterBar>
```

**Quando usar:** acima de toda lista/tabela com filtros.
**Quando não usar:** em formulários ou seções sem filtros.
**Variação permitida:** `className` para ajuste local de layout dos campos, como `produtos-filter-bar`.

---

### `DataTable`
Tabela de dados com loading skeleton, empty state e error integrados.

```tsx
<DataTable
  columns={[
    { key: 'nome', header: 'Nome', render: (r) => r.nome },
    { key: 'status', header: 'Status', align: 'right', render: (r) => <StatusBadge ...> }
  ]}
  rows={dados}
  rowKey={(r) => r.id}
  loading={status === 'loading'}
  error={storeError ?? undefined}
  emptyTitle="Nenhum registro encontrado."
  emptyAction={<button ...>Criar</button>}
/>
```

**Quando usar:** toda lista/tabela operacional em desktop.
**Para mobile:** use cards personalizados (ver `ProdutoListMobile` como referência).

---

### `EmptyState`
Estado vazio, erro ou instrução de first-run.

```tsx
<EmptyState
  title="Nenhum resultado encontrado."
  description="Ajuste os filtros para ver mais resultados."
  action={<button className="btn btn-sm">Limpar filtros</button>}
  compact  // versão inline (sem ico visual grande)
/>
```

**Quando usar:** em listas sem dados, em estados de erro, em first-run de módulo.

---

### `StatusBadge`
Badge semântico de status. Sempre use em vez de classe `.bdg` manual.

```tsx
<StatusBadge tone="success">Ativo</StatusBadge>
<StatusBadge tone="warning">Em análise</StatusBadge>
<StatusBadge tone="danger">Cancelado</StatusBadge>
<StatusBadge tone="info">Confirmado</StatusBadge>
<StatusBadge tone="neutral">Orçamento</StatusBadge>
```

| Tone | Uso |
|------|-----|
| `success` | ativo, entregue, aprovado, disponível |
| `warning` | pendente, em separação, em análise |
| `danger` | cancelado, crítico, vencido |
| `info` | confirmado, informativo |
| `neutral` | rascunho, orçamento, inativo |

---

### `StatCard`
Card de métrica/KPI. Agrupe em `rf-ui-stat-grid`, `rf-ui-stat-grid--3` ou `rf-ui-stat-grid--2`.

```tsx
<section className="rf-ui-stat-grid--3">
  <StatCard label="Total" value={100} />
  <StatCard label="Em alerta" value={5} tone="warning" foot="Abaixo do mínimo" />
  <StatCard label="Zerados" value={2} tone="danger" />
</section>
```

**Grades disponíveis:** `rf-ui-stat-grid` (4 colunas), `rf-ui-stat-grid--3` (3), `rf-ui-stat-grid--2` (2).
Todas são responsivas: 2 colunas em ≤980px, 1 coluna em ≤600px.
Produtos usa `rf-produtos-metrics` para manter os 3 cards lado a lado em desktop/tablet largo.

---

### `FormSection`
Seção interna de formulário ou conteúdo estruturado dentro de uma página.

```tsx
<FormSection
  title="Dados do fornecedor"
  description="Preencha as informações principais."
  aside={<button ...>Ação</button>}
>
  {/* campos do formulário */}
</FormSection>
```

**Quando usar:** para dividir uma página longa em seções nomeadas.
**Não usar:** no topo de uma página (use `PageHeader`).

---

### `Modal`
Overlay modal com título, corpo e rodapé.

```tsx
<Modal
  open={open}
  title="Confirmar exclusão"
  onClose={handleClose}
  closeOnOverlay={!saving}   // false quando submitting
  footer={
    <>
      <button className="btn btn-sm" onClick={handleClose} disabled={saving}>Cancelar</button>
      <button className="btn btn-r btn-sm" onClick={handleConfirm} disabled={saving}>
        {saving ? 'Excluindo...' : 'Excluir'}
      </button>
    </>
  }
>
  <p>Esta ação não pode ser desfeita.</p>
</Modal>
```

**Escape fecha o modal** automaticamente (quando `closeOnOverlay=true`).
**Ordem dos botões no footer:** cancelar à esquerda, ação destrutiva/primária à direita.

---

### `Drawer`
Painel lateral deslizante. Mesma API do Modal.

```tsx
<Drawer open={open} title="Detalhe do cliente" onClose={handleClose}>
  {/* conteúdo */}
</Drawer>
```

---

## Princípios visuais

### Hierarquia de títulos
- `h1` — título da página (via `PageHeader`)
- `h2` — título de seção (via `FormSection`)
- `h3` — título de subsecção (`.rf-ui-section-title`)
- Não pule níveis

### Spacing padrão
- Entre blocos de página: `gap: 16px` (classe `rf-ui-stack`)
- Padding interno de cards/painéis: `16–24px`
- Não use `margin` ad-hoc; prefira `gap` em containers flex/grid

### Ações
- CTA primário: `btn btn-p` (ou `btn btn-p btn-sm` na FilterBar)
- Ação secundária: `btn btn-sm`
- Ação destrutiva: `btn btn-r btn-sm`
- Sempre desabilite (`disabled`) durante operações em andamento
- Mostre estado de progresso: `{saving ? 'Salvando...' : 'Salvar'}`

### Textos de interface
- Mensagens vazias: assertivas, sem "nenhum X cadastrado no sistema"
- Mensagens de erro: descritivas, sem stack trace
- Descrições de `PageHeader`/`FormSection`: orientadas ao usuário, sem jargão técnico ("já roda em React", "migração em andamento")
- Placeholders: exemplos curtos, não instruções

---

## Regras para novas telas

1. **Toda tela nova começa com `PageHeader`** (sem exceção)
2. **Toda lista tem `FilterBar` + `DataTable` ou lista de cards** (sem tabela manual)
3. **Todo estado vazio usa `EmptyState`** (nunca `<div className="empty">` manual)
4. **Todo status usa `StatusBadge`** (nunca `.bdg .bg` manual)
5. **Todo overlay usa `Modal` ou `Drawer`** (nunca `modal-wrap` manual)
6. **Métricas agrupadas em `StatCard` + grid** (nunca `.bento-band .met` manual)
7. **Nenhum texto de interface menciona arquitetura interna do sistema**

---

## O que evitar

| Padrão legado | Use em vez |
|---|---|
| `<div className="bento-band"><div className="met">` | `StatCard` em `rf-ui-stat-grid` |
| `<div className="empty"><div className="ico">` | `<EmptyState>` |
| `<span className="bdg bg">` | `<StatusBadge tone="success">` |
| `<div className="modal-wrap">` | `<Modal>` |
| `<table className="tbl">` manual | `<DataTable>` |
| `<div className="fg">` para layout | `rf-ui-form-grid` ou `rf-ui-stack` |

---

## Componentes ausentes em shared/ui

`Toast`, `Snackbar` e `LoadingOverlay` **não existem** em `shared/ui/`. Use os padrões já disponíveis:

| Necessidade | Padrão atual |
|-------------|-------------|
| Notificação de sucesso | Fechar modal + redirecionar para o detalhe |
| Erro de fetch | `<EmptyState compact>` ou `rf-error-banner` inline |
| Loading de página/lista | `<EmptyState compact>` ou estado integrado no `DataTable` |
| Loading de botão | `disabled` + texto descritivo (`'Salvando…'`) |
| Confirmação destrutiva | `<Modal>` com `btn-r` — nunca `window.confirm()` |

Não criar `Toast` ou `LoadingOverlay` local. Se a necessidade for real e recorrente em ≥ 2 módulos, propor à governança antes de implementar.
