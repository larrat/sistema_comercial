# Inventário de Componentes Compartilhados

> Gerado em: 2026-04-28 · Atualizado em: 2026-04-28  
> Base: `src/react/shared/ui/` — barrel em `src/react/shared/ui/index.ts`

---

## Componentes existentes em `shared/ui`

| Componente | Arquivo | Props principais | Onde é usado (módulos, excl. testes) | Status | Recomendação |
|---|---|---|---|---|---|
| `PageHeader` | `shared/ui/PageHeader.tsx` | `title`, `description?`, `kicker?`, `actions?`, `meta?` | campanhas¹, clientes, cotacao, estoque², filiais, rcas, relatorios | **parcial** | Adotar em dashboard, pedidos, produtos, contas-receber, acessos (hoje usam HTML manual ou sem header) |
| `FilterBar` | `shared/ui/FilterBar.tsx` | `search?`, `filters[]?`, `actions?`, `children?` | clientes, contas-receber, estoque, produtos | **parcial** | Adotar em pedidos e relatorios quando tiverem filtros; remover de `ClienteListView` (dead code) |
| `DataTable` | `shared/ui/DataTable.tsx` | `columns`, `data/rows`, `rowKey?`, `loading?`, `error?`, `onRetry?`, `emptyTitle/Description/Action/Icon?`, `onRowClick?`, `renderActions?`, `getRowClassName?`, `page/pageSize/total/onPage/onPageSize`, `density?`, `sortKey?`, `sortDir?`, `onSort?` | analytics, clientes, cotacao (FornecedorList, TotalsByFornecedor), estoque (HistoryTable, PositionTable) | **parcial** | Atualizada (2026-04-28) com density, sorting e onRetry. Adotar em pedidos (PedidoRow inline) e rcas (rrow inline) |
| `ActionMenu` | `shared/ui/ActionMenu.tsx` | `items[]`, `label?`, `align?`, `buttonClassName?`, `buttonTestId?` | clientes (via `renderActions` do DataTable) | **parcial** | Adotar nos demais módulos que têm botões de ação por linha (rcas, campanhas) |
| `Drawer` | `shared/ui/Drawer.tsx` | `open`, `title?`, `subtitle?`, `action?`, `footer?`, `withOverlay?`, `closeOnOverlayClick?`, `onClose` | clientes | **parcial** | Adotar em pedidos (`PedidoForm` e `PedidoDetailPanel` usam `modal-shell-*` CSS próprio — inconsistência de UX) |
| `Modal` | `shared/ui/Modal.tsx` | `open`, `title?`, `footer?`, `closeOnOverlay?`, `onClose` | contas-receber, cotacao (FornecedorForm, ImportMapModal), estoque (MovementModal, DeleteConfirmModal), filiais (FilialModal), produtos, rcas, relatorios | **parcial** | Adotar em campanhas (`CampanhaModal` e `WhatsAppPreviewModal` usam `modal-overlay` CSS direto sem gestão de Escape/focus) |
| `StatusBadge` | `shared/ui/StatusBadge.tsx` | `children`, `tone?: 'neutral'│'info'│'success'│'warning'│'danger'` | clientes³, contas-receber, cotacao (5 arquivos), dashboard, estoque (4 arquivos), pedidos (2 arquivos), produtos | **parcial** | Converter uso inline de `span` Tailwind em `ClientesPilotPage` para o componente; é o padrão canônico |
| `EmptyState` | `shared/ui/EmptyState.tsx` | `title`, `description?`, `action?`, `icon?`, `compact?` | clientes, contas-receber, cotacao (6 arquivos), dashboard, estoque (3 arquivos), filiais, pedidos (2 arquivos), produtos (2 arquivos), rcas, relatorios (4 arquivos) | **consolidado** | Componente mais adotado. Prop `icon` adicionada (2026-04-28) para estados com ícone visual |
| `LoadingState` | `shared/ui/LoadingState.tsx` | `title?`, `description?`, `compact?` | **nenhum** | **não encontrado em uso** | Props completas. Módulos preferem `EmptyState compact` ou `sk-card/sk-line` — adotar gradualmente no lugar de `EmptyState` com texto de carregamento |
| `ErrorState` | `shared/ui/ErrorState.tsx` | `title?`, `description?`, `action?`, `onRetry?`, `retryLabel?`, `technicalMessage?`, `compact?` | **nenhum** | **não encontrado em uso** | Props expandidas (2026-04-28): `onRetry` renderiza botão embutido; `technicalMessage` exibe detalhe técnico muted. Módulos usam `div.rf-error-banner` inline — adotar este componente no lugar |
| `StatCard` | `shared/ui/StatCard.tsx` | `label`, `value`, `foot?`, `tone?: 'default'│'success'│'warning'│'danger'` | analytics, campanhas¹, clientes (ClienteListView — dead code), contas-receber, cotacao, estoque, filiais, produtos, relatorios (3 arquivos) | **consolidado** | Bem adotado — corrigir import de `CampanhasPage` (usa path direto em vez de barrel) |
| `FormSection` | `shared/ui/FormSection.tsx` | `title`, `description?`, `aside?`, `children` | cotacao (3 arquivos), estoque | **parcial** | Não adotado por forms de clientes, pedidos, rcas — esses usam `label.form-field` CSS direto |
| `FormField` | `shared/ui/FormField.tsx` | `label`, `htmlFor?`, `required?`, `hint?`, `error?`, `children` | **nenhum** | **não encontrado em uso** | Existe mas nenhum módulo o usa; `ClienteForm` usa `label.form-field` CSS sem o componente — avaliar adoção ou remoção |
| `FormError` | `shared/ui/FormError.tsx` | `message?`, `className?` | **nenhum** | **não encontrado em uso** | Existe mas nenhum módulo o usa — avaliar adoção ou remoção |

> ¹ `CampanhasPage` importa por path direto (`from '../../../shared/ui/PageHeader'`) em vez de via barrel `index.ts`.  
> ² `EstoquePage` não usa `PageHeader` diretamente — usa wrapper local `EstoquePageHeader`, que importa o componente.  
> ³ `ClientesPilotPage` usa `span` Tailwind inline (`rounded-full px-2 py-0.5 text-xs`) em vez do componente `StatusBadge`.

---

## Componentes solicitados que NÃO existem em `shared/ui`

| Componente pedido | Situação real | Equivalente atual | Recomendação |
|---|---|---|---|
| `FormActions` | **Não existe** em `shared/ui` | Nenhum — cada módulo usa `div` ou `footer` próprios com botões inline | Criar se/quando o padrão de formulários for padronizado globalmente |
| `Toast` | **Não existe** como componente reutilizável | `GlobalToastHost` em `app/ui/GlobalToastHost.tsx` (interno ao AppShell). Acionado por `emitToast(msg, severity)` de `app/legacy/events.ts` — usado por contas-receber, filiais | Não recriar; usar `emitToast()` para disparar toasts |
| `Banner` | **Não existe** como componente global | `div.rf-error-banner` usada inline em 5 módulos (campanhas, contas-receber, filiais, rcas, relatorios) e `CotacaoLockBanner` específico de domínio | Criar componente global `Banner` apenas se o padrão precisar de variações (warning, success, info). Por ora, `div.rf-error-banner` é suficiente para erros |

---

## Padrões paralelos identificados (duplicação)

| Padrão | Componente global correto | Quem usa o padrão paralelo | Impacto |
|---|---|---|---|
| `modal-overlay` / `modal-box` CSS inline | `Modal` | `CampanhaModal`, `WhatsAppPreviewModal` (campanhas) | Sem gestão de Escape/focus padronizada |
| `modal-shell-head` / `modal-shell-body` CSS inline | `Drawer` | `PedidoForm`, `PedidoDetailPanel`, `PedidoItemAdd` (pedidos) | Comportamento de scroll/Escape diferente do Drawer |
| `span` Tailwind inline para badge | `StatusBadge` | `ClientesPilotPage` | Inconsistência visual se o tema mudar |
| `div.rf-error-banner` inline | Não existe componente; `ErrorState` poderia cobrir | campanhas, contas-receber, filiais, rcas, relatorios | 5 locais a atualizar se o estilo mudar |
| `label.form-field` CSS inline | `FormField` | `ClienteForm` (14 campos), `RcaModal` | Inconsistência com o componente existente |
| `rrow` + classes `rf-rca-*` | `DataTable` | `RcasPage` | Linha de lista ad-hoc sem paginação |
| Import de componente por path direto | `from '../../../shared/ui'` (barrel) | `CampanhasPage` (PageHeader e StatCard por path direto) | Quebra tree-shaking e refactor path |

---

## Componentes que NÃO devem ser recriados

Já existem em `src/react/shared/ui/` e devem ser **reaproveitados**:

- **`PageHeader`** — para cabeçalho de qualquer página com título + descrição + ações
- **`FilterBar`** — para toolbar de busca + filtros + ações (search, filters[], actions)
- **`DataTable`** — para qualquer listagem tabular com suporte a paginação, row click, actions menu e skeleton loading
- **`ActionMenu`** — para menu de ações por linha (⋯) com click-outside e Escape nativos
- **`Drawer`** — para painéis laterais deslizantes (detalhe, form de edição)
- **`Modal`** — para diálogos de confirmação, forms rápidos, previews
- **`StatusBadge`** — para badges de status com 5 tons (neutral/info/success/warning/danger)
- **`EmptyState`** — para estado vazio de listas e erros de carregamento (prop `compact` para inline)
- **`StatCard`** — para cards de métricas/KPIs com label, valor e tone
- **`FormSection`** — para agrupar campos de formulários com título e descrição
- **`FormField`** — para campo de formulário com label, hint e error (subaproveitado)
- **`FormError`** — para mensagem de erro de campo isolado (subaproveitado)

> **Regra de ouro:** antes de criar qualquer componente de UI, verificar esta lista e o baseline em `BASELINE_TECNICO_ATUAL.md`. Se o componente necessário já existe, usar o existente e adaptar via props — não duplicar.

---

## Resumo de adoção por status

| Status | Componentes |
|---|---|
| **Consolidado** | `EmptyState`, `StatCard` |
| **Parcial** (existe, mas subadotado) | `PageHeader`, `FilterBar`, `DataTable`, `ActionMenu`, `Drawer`, `Modal`, `StatusBadge`, `FormSection` |
| **Não encontrado em uso** | `LoadingState`, `ErrorState`, `FormField`, `FormError` |
| **Não existe** | `FormActions`, `Toast` (como componente), `Banner` (como componente) |

---

## Guia de uso — estados visuais globais

### EmptyState

Use quando não há dados para exibir ou após uma ação que resulta em lista vazia.

```tsx
import { EmptyState } from '../../../shared/ui';

// Mínimo
<EmptyState title="Nenhum cliente encontrado." />

// Com descrição e ação
<EmptyState
  title="Nenhum resultado para o filtro aplicado."
  description="Tente ajustar os critérios de busca."
  action={<button className="btn btn-sm btn-p" onClick={clearFiltro}>Limpar filtros</button>}
/>

// Com ícone
<EmptyState
  icon={<span aria-hidden="true">📭</span>}
  title="Nenhuma campanha ativa."
  description="Crie uma campanha para começar."
/>

// Compacto (inline, sem padding grande)
<EmptyState title="Carregando..." compact />
```

**Não usar** `EmptyState` para erros de API — use `ErrorState` ou `div.rf-error-banner`.

---

### LoadingState

Use para indicar carregamento em progresso. Prefira `compact` dentro de seções, sem `compact` em tela cheia.

```tsx
import { LoadingState } from '../../../shared/ui';

// Padrão
<LoadingState />

// Com mensagem personalizada
<LoadingState title="Carregando clientes..." />

// Compacto (dentro de seção)
<LoadingState title="Atualizando..." compact />
```

**Quando não usar:** se já há dados carregados e só há atualização parcial, use skeleton (`sk-card` / `sk-line`) ou indicador inline. `LoadingState` é para tela em branco esperando o primeiro dado.

---

### ErrorState

Use quando uma chamada de API falha e o módulo não consegue exibir dados. Sempre ofereça `onRetry` quando a operação pode ser repetida.

```tsx
import { ErrorState } from '../../../shared/ui';

// Com retry embutido (recomendado)
<ErrorState
  title="Não foi possível carregar as contas."
  description="Verifique a conexão e tente novamente."
  onRetry={() => reload()}
/>

// Com label de retry personalizado
<ErrorState
  title="Falha ao salvar."
  onRetry={() => handleSave()}
  retryLabel="Salvar novamente"
/>

// Com detalhe técnico (para modo debug / admin)
<ErrorState
  title="Erro interno."
  description="Entre em contato com o suporte se o problema persistir."
  technicalMessage={error.code ?? error.message}
/>

// Com ação customizada (quando onRetry não é suficiente)
<ErrorState
  title="Sessão expirada."
  action={<button className="btn btn-sm btn-p" onClick={logout}>Fazer login novamente</button>}
/>

// Compacto
<ErrorState title={storeError} compact />
```

**Preferir `ErrorState` em vez de `div.rf-error-banner`** quando o erro substitui o conteúdo da tela. Use `div.rf-error-banner` apenas para alertas não-bloqueantes acima de conteúdo que já está visível.

---

### Toast (`emitToast`)

Não existe como componente importável. É disparado via função utilitária e exibido pelo `GlobalToastHost` no AppShell.

```tsx
import { emitToast } from '../../../app/legacy/events';

// Severidades disponíveis: 'info' | 'success' | 'warning' | 'error'
emitToast('Cliente salvo com sucesso.', 'success');
emitToast('Não foi possível excluir.', 'error');
emitToast('Filtro ativo — resultados limitados.', 'warning');
```

**Não criar** um componente `Toast` — o sistema de toast já existe via `GlobalToastHost`.

---

### Banner (`div.rf-error-banner`)

Não existe como componente global. Use o padrão inline para alertas não-bloqueantes:

```tsx
{error && <div className="rf-error-banner">{error}</div>}
```

Usado atualmente em: campanhas, contas-receber, filiais, rcas, relatorios.

**Não criar** um componente `Banner` a menos que sejam necessárias variações (warning, success, info). Por ora, `div.rf-error-banner` cobre o caso de uso existente.

---

### Skeleton (`sk-card` / `sk-line`)

Não existe como componente React. É um padrão CSS inline:

```tsx
// Skeleton de lista (padrão usado em Clientes)
{status === 'loading' && (
  <div className="sk-card">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="sk-line" />
    ))}
  </div>
)}
```

**Não criar** um componente `Skeleton` — o padrão CSS já está definido e é suficiente para o uso atual.

---

### DataTable

Use para qualquer listagem tabular. Gerencie loading/error/sort fora do componente e passe via props.

```tsx
import { DataTable } from '../../../shared/ui';
import type { DataTableColumn } from '../../../shared/ui';

// Mínimo
<DataTable
  columns={[
    { key: 'nome', label: 'Nome', render: (row) => row.nome }
  ]}
  data={items}
  rowKey={(row) => row.id}
/>

// Com loading e erro + retry
<DataTable
  columns={columns}
  data={items}
  rowKey={(row) => row.id}
  loading={status === 'loading'}
  error={status === 'error' ? errorMessage : undefined}
  onRetry={() => reload()}
/>

// Com estado vazio customizado
<DataTable
  columns={columns}
  data={items}
  rowKey={(row) => row.id}
  emptyTitle="Nenhum pedido encontrado."
  emptyDescription="Crie um novo pedido para começar."
  emptyIcon={<span aria-hidden="true">📋</span>}
  emptyAction={<button className="btn btn-sm btn-p" onClick={openNew}>+ Novo pedido</button>}
/>

// Com paginação server-side
<DataTable
  columns={columns}
  data={items}
  rowKey={(row) => row.id}
  page={page}
  pageSize={pageSize}
  total={total}
  onPageChange={setPage}
  onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
/>

// Com row click e ações
<DataTable
  columns={columns}
  data={items}
  rowKey={(row) => row.id}
  onRowClick={(row) => openDetail(row.id)}
  renderActions={(row) => (
    <ActionMenu
      items={[
        { key: 'editar', label: 'Editar', onClick: () => openEdit(row.id) },
        { key: 'excluir', label: 'Excluir', danger: true, onClick: () => handleDelete(row.id) }
      ]}
    />
  )}
/>

// Com sorting controlado externamente
<DataTable
  columns={[
    { key: 'nome', label: 'Nome', sortable: true, render: (row) => row.nome },
    { key: 'data', label: 'Data', sortable: true, render: (row) => row.data }
  ]}
  data={items}
  rowKey={(row) => row.id}
  sortKey={sortKey}
  sortDir={sortDir}
  onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
/>

// Compacto (density)
<DataTable columns={columns} data={items} rowKey={(row) => row.id} density="compact" />
```

**Não reinventar** tabelas com `<table className="tbl">` manual quando `DataTable` já cobre o caso.
