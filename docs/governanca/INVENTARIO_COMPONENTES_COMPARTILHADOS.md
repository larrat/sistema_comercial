# Inventário de Componentes Compartilhados

> Gerado em: 2026-04-28 · Atualizado em: 2026-04-28  
> Base: `src/react/shared/ui/` — barrel em `src/react/shared/ui/index.ts`

---

## Componentes existentes em `shared/ui`

| Componente | Arquivo | Props principais | Onde é usado (arquivos de feature, excl. testes) | Status | Recomendação |
|---|---|---|---|---|---|
| `PageHeader` | `shared/ui/PageHeader.tsx` | `title`, `description?`, `kicker?`, `actions?`, `meta?` | campanhas, clientes, cotacao, estoque (via wrapper `EstoquePageHeader`), filiais, rcas, relatorios | **parcial** | Adotar em dashboard, pedidos, produtos, contas-receber — hoje usam HTML manual ou nenhum header |
| `FilterBar` | `shared/ui/FilterBar.tsx` | `search?`, `filters[]?`, `actions?`, `children?`, `onClearFilters?`, `activeFilterCount?` | clientes (2: ClienteListView dead¹ + ClientesPilotPage), contas-receber, estoque (`EstoqueFilters`), produtos | **parcial** | Atualizada (2026-04-28): `onClearFilters` e `activeFilterCount` adicionados; defaults de className corrigidos para `inp`/`inp sel`. Adotar em pedidos e relatorios quando tiverem filtros |
| `DataTable` | `shared/ui/DataTable.tsx` | `columns`, `data/rows`, `rowKey?`, `loading?`, `error?`, `onRetry?`, `emptyTitle/Description/Action/Icon?`, `onRowClick?`, `renderActions?`, `getRowClassName?`, `page/pageSize/total/onPageChange/onPageSizeChange`, `density?`, `sortKey?`, `sortDir?`, `onSort?` | analytics, clientes, cotacao (FornecedorList, TotalsByFornecedor), estoque (HistoryTable, PositionTable) | **parcial** | Adotar em pedidos (usa `PedidoRow` inline) e rcas (usa `rrow` inline) |
| `ActionMenu` | `shared/ui/ActionMenu.tsx` | `items[]`, `label?`, `align?`, `buttonClassName?`, `buttonTestId?` | clientes (ClientesPilotPage via `renderActions` do DataTable) | **parcial** | Adotar em todos os módulos com ações por linha; rcas e campanhas têm botões inline |
| `Drawer` | `shared/ui/Drawer.tsx` | `open`, `onClose`, `title?`, `subtitle?`, `action?`, `children`, `footer?`, `size?: 'sm'│'md'│'lg'`, `loading?`, `withOverlay?`, `closeOnOverlayClick?`, `closeOnEsc?`, `bodyClassName?` | clientes (ClientesPilotPage — 2 instâncias) | **parcial** | Atualizado (2026-04-28): `size`, `loading`, `closeOnEsc`, `aria-labelledby`, export de `DrawerProps`. Pedidos usa `modal-shell-head/body` CSS direto — migrar na Sprint 5 |
| `Modal` | `shared/ui/Modal.tsx` | `open`, `title?`, `footer?`, `closeOnOverlay?`, `onClose` | contas-receber, cotacao (FornecedorForm, ImportMapModal), estoque (MovementModal, DeleteConfirmModal), filiais (FilialModal), produtos, rcas (RcaModal), relatorios (ValidacaoModal) | **parcial** | Campanhas e produtos usam `modal-overlay` CSS direto sem gestão de Escape/focus — migrar para Modal |
| `StatusBadge` | `shared/ui/StatusBadge.tsx` | `children`, `tone?: 'neutral'│'info'│'success'│'warning'│'danger'` | clientes (ClienteCard, ClientesPilotPage²), contas-receber, cotacao (5 arquivos), dashboard, estoque (4 arquivos), pedidos (PedidoDetailPanel, PedidoRow), produtos | **parcial** | Corrigir `ClientesPilotPage` que usa `span` Tailwind inline em vez do componente |
| `EmptyState` | `shared/ui/EmptyState.tsx` | `title`, `description?`, `action?`, `icon?`, `compact?`, `data-testid?` | clientes, contas-receber, cotacao (6 arquivos), dashboard, estoque (3 arquivos), filiais, pedidos (2 arquivos), produtos (2 arquivos), rcas, relatorios (4 arquivos) | **consolidado** | Componente mais adotado. Prop `icon` adicionada (2026-04-28). Não usar para erros de API — usar `ErrorState` |
| `LoadingState` | `shared/ui/LoadingState.tsx` | `title?`, `description?`, `compact?` | **nenhum módulo** | **não encontrado em uso** | Existe e está no barrel. Módulos preferem `EmptyState compact` ou `sk-card/sk-line` — adotar gradualmente |
| `ErrorState` | `shared/ui/ErrorState.tsx` | `title?`, `description?`, `action?`, `onRetry?`, `retryLabel?`, `technicalMessage?`, `compact?`, `data-testid?` | **nenhum módulo** | **não encontrado em uso** | Expandida (2026-04-28): `onRetry` renderiza botão embutido; `technicalMessage` exibe detalhe técnico muted. Módulos usam `div.rf-error-banner` inline — este é o destino correto para erros de carregamento |
| `StatCard` | `shared/ui/StatCard.tsx` | `label`, `value`, `foot?`, `tone?: 'default'│'success'│'warning'│'danger'` | analytics, campanhas³, clientes (ClienteListView — dead code¹), contas-receber, cotacao (CotacaoMetricsReadOnly), estoque (EstoqueMetrics), filiais, produtos (ProdutoMetrics), relatorios (3 arquivos) | **consolidado** | Bem adotado. Campanhas importa por path direto em vez do barrel — corrigir quando tocar no arquivo |
| `FormSection` | `shared/ui/FormSection.tsx` | `title`, `description?`, `aside?`, `children` | cotacao (3 arquivos: CotacaoFornecedoresPage, CotacaoImportPage, CotacaoTabelaPage), estoque (EstoquePage) | **parcial** | Não adotado por clientes, pedidos, rcas — esses usam `form-section-card` CSS legado |
| `FormField` | `shared/ui/FormField.tsx` | `label`, `htmlFor?`, `required?`, `hint?`, `error?`, `disabled?`, `children` | **nenhum módulo** | **não encontrado em uso** | Atualizado (2026-04-28): `disabled` adiciona `rf-ui-form-field--disabled` (visual only — input filho precisa de `disabled` no próprio elemento). `ClienteForm` usa `label.form-field` CSS legado |
| `FormError` | `shared/ui/FormError.tsx` | `message?`, `className?`, `data-testid?` | **nenhum módulo** | **não encontrado em uso** | Existe, está no barrel. Módulos usam `div.rf-error-banner` ou `div.alert.alert-error` — adotar no lugar |
| `FormActions` | `shared/ui/FormActions.tsx` | `onCancel?`, `cancelLabel?`, `submitLabel?`, `loading?`, `disabled?`, `align?`, `children?` | **nenhum módulo** | **criado (2026-04-28)** | Novo. Padroniza botões salvar/cancelar. `loading` troca label para "Salvando…" e desabilita botões. `children` sobrescreve os botões automáticos para layouts customizados |

> ¹ `ClienteListView.tsx` e `ClienteCard.tsx` são dead code — substituídos por `ClientesPilotPage` com DataTable. Os arquivos ainda existem com testes.  
> ² `ClientesPilotPage` usa `span` Tailwind inline (`rounded-full px-2 py-0.5 text-xs`) em paralelo ao componente.  
> ³ `CampanhasPage` importa `PageHeader` e `StatCard` via path direto (`from '../../../shared/ui/PageHeader'`) em vez do barrel.

---

## Componentes solicitados que NÃO existem em `shared/ui`

| Componente pedido | Situação real | Equivalente atual | Recomendação |
|---|---|---|---|
| `FormActions` | **Não existe** em nenhum lugar do projeto | Cada módulo usa `div` ou `footer` inline com botões | Criar apenas se o padrão de formulários for padronizado globalmente; por ora não é bloqueante |
| `Toast` | **Não existe** como componente importável | `GlobalToastHost` em `app/ui/GlobalToastHost.tsx` (interno ao AppShell). Acionado por `emitToast(msg, severity)` de `app/legacy/events.ts` — usado por campanhas, contas-receber, cotacao (3 hooks), dashboard, estoque, filiais, rcas, relatorios | Não recriar como componente. Usar `emitToast()` diretamente |
| `Banner` | **Não existe** como componente global | Padrão `div.rf-error-banner` usado inline em campanhas, clientes, contas-receber, cotacao (CotacaoLockBanner de domínio + CotacaoTabelaPage), filiais, rcas, relatorios | Não criar por ora. Criar apenas se surgirem variações (warning, success, info). Erros bloqueantes devem usar `ErrorState` |

---

## Padrões paralelos identificados (duplicação)

| Padrão paralelo | Componente global correto | Onde está sendo usado | Impacto |
|---|---|---|---|
| `modal-overlay` / `modal-box` CSS inline | `Modal` | `CampanhaModal`, `WhatsAppPreviewModal` (campanhas); `ProdutosPilotPage` (2 modais inline) | Sem gestão padronizada de Escape/focus/scroll |
| `modal-shell-head` / `modal-shell-body` CSS inline | `Drawer` | `PedidoForm`, `PedidoDetailPanel` (pedidos) | Comportamento de Escape e overlay diferente do Drawer |
| `span` Tailwind inline para badge de status | `StatusBadge` | `ClientesPilotPage` | Inconsistência visual se o tema de cores mudar |
| `div.rf-error-banner` inline | Não existe componente; `ErrorState` cobre casos bloqueantes | campanhas, clientes, contas-receber, cotacao, filiais, rcas, relatorios | 7 locais a atualizar se o estilo mudar |
| `label.form-field` CSS inline sem `FormField` | `FormField` | `ClienteForm` (14 campos), `RcaModal` | Inconsistência com o componente existente |
| `rrow` + classes `rf-rca-*` ad-hoc | `DataTable` | `RcasPage` (lista de RCAs), `relatorios` (ClientesTab, PerformanceTab) | Listas sem paginação, skeleton ou estado vazio padronizado |
| Import de componente por path direto em vez de barrel | `from '../../shared/ui'` (barrel) | `CampanhasPage` (PageHeader e StatCard) | Quebra tree-shaking e dificulta refactor de path |

---

## Componentes que NÃO devem ser recriados

Já existem em `src/react/shared/ui/` e estão exportados pelo barrel (`index.ts`). **Devem ser reaproveitados**:

- **`PageHeader`** — cabeçalho de qualquer página com título, descrição e ações
- **`FilterBar`** — toolbar de busca + filtros + ações
- **`DataTable`** — toda listagem tabular com paginação, row click, actions, skeleton e sort
- **`ActionMenu`** — menu de ações por linha (⋯) com click-outside e Escape nativos
- **`Drawer`** — painéis laterais deslizantes (detalhe, form de edição)
- **`Modal`** — diálogos de confirmação, forms rápidos, previews
- **`StatusBadge`** — badges de status com 5 tons: `neutral` / `info` / `success` / `warning` / `danger`
- **`EmptyState`** — estado vazio de listas; suporta `icon`, `description`, `action`, `compact`
- **`ErrorState`** — erro de carregamento/API; suporta `onRetry`, `technicalMessage`, `compact`
- **`LoadingState`** — estado de carregamento de tela inteira ou seção
- **`StatCard`** — cards de métricas/KPIs com label, valor, foot e tone
- **`FormSection`** — agrupamento de campos com título e descrição
- **`FormField`** — campo de formulário com label, hint e error (subaproveitado, mas existe)
- **`FormError`** — mensagem de erro de campo isolado (subaproveitado, mas existe)

> **Regra:** antes de criar qualquer componente de UI, verificar esta lista. Se existe, adaptar via props — não duplicar.

---

## Resumo por status

| Status | Componentes |
|---|---|
| **Consolidado** (ampla adoção) | `EmptyState`, `StatCard` |
| **Parcial** (existe, mas subadotado ou com duplicatas) | `PageHeader`, `FilterBar`, `DataTable`, `ActionMenu`, `Drawer`, `Modal`, `StatusBadge`, `FormSection` |
| **Não encontrado em uso** (existe no barrel, zero adoção em features) | `LoadingState`, `ErrorState`, `FormField`, `FormError`, `FormActions` |
| **Não existe como componente** | `Toast` (usar `emitToast()`), `Banner` (usar `div.rf-error-banner`) |

---

## Guia de uso — Formulários

### FormField

Wrapper de campo individual: label, hint e erro próximo ao campo.

```tsx
import { FormField } from '../../../shared/ui';

// Mínimo
<FormField label="Nome" htmlFor="nome">
  <input id="nome" className="inp" value={values.nome} onChange={...} />
</FormField>

// Obrigatório + erro de validação
<FormField label="E-mail" htmlFor="email" required error={errors.email}>
  <input id="email" className="inp" type="email" value={values.email} onChange={...} />
</FormField>

// Com hint
<FormField label="Apelido" htmlFor="apelido" hint="Como o cliente prefere ser chamado.">
  <input id="apelido" className="inp" value={values.apelido} onChange={...} />
</FormField>

// Campo desabilitado (visual only — aplicar disabled também no input filho)
<FormField label="CNPJ" disabled>
  <input className="inp" value={values.cnpj} disabled />
</FormField>
```

**Atenção:** `disabled` no `FormField` é apenas visual (opacidade + pointer-events). O `disabled` no elemento filho (`<input>`, `<select>`) ainda deve ser aplicado para semântica HTML correta.

---

### FormSection

Agrupa campos relacionados em um cartão com título e descrição.

```tsx
import { FormSection } from '../../../shared/ui';

<FormSection title="Dados essenciais" description="Identificação principal do cliente.">
  <div className="grid grid-2">
    <FormField label="Nome" htmlFor="nome" required>
      <input id="nome" className="inp" value={values.nome} onChange={...} />
    </FormField>
    <FormField label="E-mail" htmlFor="email">
      <input id="email" className="inp" value={values.email} onChange={...} />
    </FormField>
  </div>
</FormSection>

// Com slot aside (ex: badge ou ação)
<FormSection title="Comercial" aside={<span className="bdg bb">Opcional</span>}>
  {/* campos */}
</FormSection>
```

---

### FormError

Exibe erro geral do formulário (nível do form, não de campo).

```tsx
import { FormError } from '../../../shared/ui';

// Aparece somente quando message não é null/undefined/''
<FormError message={formError} data-testid="form-error" />
```

Preferir `FormError` em vez de `div.rf-error-banner` para erros de formulário. `div.rf-error-banner` fica reservado para alertas de página não-bloqueantes.

---

### FormActions

Padroniza os botões de salvar/cancelar no rodapé de formulários.

```tsx
import { FormActions } from '../../../shared/ui';

// Caso simples — dentro de <form onSubmit={...}>
<form onSubmit={handleSubmit}>
  {/* campos */}
  <FormActions
    onCancel={onCancel}
    submitLabel={initialItem ? 'Salvar alterações' : 'Salvar'}
    loading={saving}
  />
</form>

// Apenas submit (sem cancelar)
<FormActions submitLabel="Confirmar" loading={loading} />

// Layout customizado (children substitui os botões automáticos)
<FormActions align="start">
  <button type="button" className="btn btn-sm btn-danger" onClick={handleDelete}>
    Excluir
  </button>
  <button type="submit" className="btn btn-p btn-sm" disabled={saving}>
    Salvar
  </button>
</FormActions>

// Dentro do footer de um Drawer
<Drawer
  open={open}
  title="Editar cliente"
  onClose={onClose}
  footer={
    <FormActions
      onCancel={onClose}
      submitLabel="Salvar cliente"
      loading={saving}
    />
  }
>
  <form id="cliente-form" onSubmit={handleSubmit}>
    {/* campos */}
  </form>
</Drawer>
```

**Regras:**
- `FormActions` não precisa estar dentro do `<form>` se o submit button usar `form="form-id"`.
- `loading={true}` troca o label do submit para "Salvando…" e desabilita ambos os botões.
- Não colocar lógica de negócio dentro do componente — `onCancel` e `submitLabel` são responsabilidade do módulo.
- `children` sobrescreve os botões automáticos — use para layouts que não cabem no padrão cancelar/salvar.

---

## Guia de uso — Drawer

```tsx
import { Drawer } from '../../../shared/ui';
import type { DrawerProps } from '../../../shared/ui';

// Detalhe (padrão: md, ESC ativo, overlay com click-to-close)
<Drawer
  open={!!detalhe}
  title={detalhe?.nome ?? ''}
  subtitle={detalhe?.status}
  onClose={() => setDetalhe(null)}
>
  <MeuDetailPanel item={detalhe} />
</Drawer>

// Form de criação/edição com footer fixo
<Drawer
  open={!!editingId}
  title={editingId === 'new' ? 'Novo item' : 'Editar item'}
  onClose={() => setEditingId(null)}
  footer={
    <>
      <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
      <button className="btn btn-sm btn-p" form="meu-form" type="submit">Salvar</button>
    </>
  }
>
  <MeuForm id="meu-form" onSaved={() => setEditingId(null)} />
</Drawer>

// Com loading (ex: carregando detalhe assíncrono)
<Drawer open={open} title="Carregando..." onClose={onClose} loading={loadingDetalhe}>
  <MeuConteudo />
</Drawer>

// Tamanhos
<Drawer size="sm" ...>  {/* 300–380px — painéis simples */}
<Drawer size="md" ...>  {/* 400–480px — padrão (default) */}
<Drawer size="lg" ...>  {/* 520–680px — formulários complexos */}

// Sem fechar no ESC (ex: formulário em progresso)
<Drawer open={open} onClose={onClose} closeOnEsc={false} closeOnOverlayClick={false}>
  <FormComAlteracoesNaoSalvas />
</Drawer>

// Ação no cabeçalho (ex: botão Editar no painel de detalhe)
<Drawer
  open={open}
  title="Detalhe do cliente"
  action={<button className="btn btn-p btn-sm" onClick={abrirEdicao}>Editar</button>}
  onClose={onClose}
>
  <ClienteDetailPanel />
</Drawer>
```

**Regras:**
- Usar `Drawer` para painéis de detalhe, criação e edição vindos de listagens — não criar `modal-shell-*` ou `card card-shell` inline.
- `footer` é fixo no rodapé (CSS grid) — ideal para botões de salvar/cancelar.
- `closeOnEsc={false}` + `closeOnOverlayClick={false}` para formulários com alterações não salvas; o controle de dirty state fica no módulo.
- `size="lg"` para formulários com muitos campos ou DataTable interno.
- Não colocar lógica de negócio dentro do Drawer.

**Padrões paralelos a migrar (por módulo):**
- Pedidos: `PedidoDetailPanel` e `PedidoForm` usam `modal-shell-head/body` CSS inline → migrar para `<Drawer>` na Sprint 5
- Produtos: `ProdutoDetailPanel` renderizado em `modal-overlay + modal-box` → usar `<Drawer size="lg">` quando migrado

---

## Guia de uso — FilterBar

```tsx
import { FilterBar } from '../../../shared/ui';

// Modo children (livre) — usar quando os inputs já existem no módulo
<FilterBar actions={<button className="btn btn-p btn-sm">+ Novo</button>}>
  <input className="inp" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
  <select className="inp sel" value={status} onChange={(e) => setStatus(e.target.value)}>
    <option value="">Todos</option>
    <option value="ativo">Ativo</option>
  </select>
</FilterBar>

// Modo config — usar quando o módulo quer API declarativa
<FilterBar
  search={{
    value: filtro.q,
    onChange: (value) => setFiltro({ q: value }),
    placeholder: 'Buscar cliente...',
    ariaLabel: 'Buscar clientes',
    testId: 'busca-input'
  }}
  filters={[
    {
      key: 'status',
      value: filtro.status,
      onChange: (value) => setFiltro({ status: value }),
      ariaLabel: 'Filtrar por status',
      options: [
        { value: '', label: 'Todos os status' },
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' }
      ]
    }
  ]}
  actions={<button className="btn btn-p btn-sm">+ Novo</button>}
/>

// Com limpar filtros — botão aparece automaticamente junto aos campos
<FilterBar
  search={{ value: q, onChange: setQ, placeholder: 'Buscar...' }}
  filters={[{ key: 'status', value: status, onChange: setStatus, options: statusOpts }]}
  onClearFilters={() => { setQ(''); setStatus(''); }}
  activeFilterCount={[q, status].filter(Boolean).length}
/>
```

**Regras:**
- Modo `children` e modo `search/filters` são mutuamente exclusivos — se `search` ou `filters.length > 0`, `children` é ignorado.
- `onClearFilters` sem `activeFilterCount` sempre exibe o botão "Limpar filtros".
- `onClearFilters` com `activeFilterCount={0}` esconde o botão — use isso para mostrar só quando há filtro ativo.
- Não colocar regra de negócio (opções dinâmicas de segmento, status por domínio) dentro do componente — passe via `filters[].options`.

---

## Guia de uso — estados visuais globais

### EmptyState

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
/>

// Compacto (inline)
<EmptyState title="Sem registros." compact />
```

Não usar para erros de API — usar `ErrorState`.

---

### LoadingState

```tsx
import { LoadingState } from '../../../shared/ui';

<LoadingState />
<LoadingState title="Carregando clientes..." />
<LoadingState title="Atualizando..." compact />
```

Use quando a tela está em branco aguardando o primeiro dado. Para atualizações parciais, prefira `sk-card`/`sk-line`.

---

### ErrorState

```tsx
import { ErrorState } from '../../../shared/ui';

// Com retry embutido (recomendado)
<ErrorState
  title="Não foi possível carregar as contas."
  description="Verifique a conexão e tente novamente."
  onRetry={() => reload()}
/>

// Com label de retry personalizado
<ErrorState title="Falha ao salvar." onRetry={handleSave} retryLabel="Salvar novamente" />

// Com detalhe técnico
<ErrorState
  title="Erro interno."
  technicalMessage={error.code ?? error.message}
/>

// Compacto
<ErrorState title={storeError} compact />
```

Preferir `ErrorState` quando o erro substitui o conteúdo da tela. `div.rf-error-banner` é para alertas não-bloqueantes acima de conteúdo já visível.

---

### Toast (`emitToast`)

Não existe como componente. Disparar via função — o `GlobalToastHost` no AppShell exibe automaticamente.

```tsx
import { emitToast } from '../../../app/legacy/events';

emitToast('Cliente salvo com sucesso.', 'success');
emitToast('Não foi possível excluir.', 'error');
emitToast('Filtro ativo — resultados limitados.', 'warning');
```

Severidades: `'info' | 'success' | 'warning' | 'error'`.

---

### Banner (`div.rf-error-banner`)

Não existe como componente. Usar padrão inline para alertas não-bloqueantes:

```tsx
{error && <div className="rf-error-banner">{error}</div>}
```

---

### Skeleton (`sk-card` / `sk-line`)

Não existe como componente React. As classes CSS estão definidas em `src/styles/style.css` (arquivo legado compartilhado com o runtime vanilla JS). Padrão de uso inline:

```tsx
{status === 'loading' && (
  <div className="sk-card">
    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="sk-line" />)}
  </div>
)}
```

Usado em: setup, dashboard, clientes (ClienteDetailPanel, ClienteFidelidadePanel, ClienteListView), app-level (routeAccess, GlobalLoadingOverlay). O DataTable gera seu próprio skeleton interno quando `loading={true}` — não é necessário usar `sk-card` externamente ao DataTable.

---

### DataTable

```tsx
import { DataTable } from '../../../shared/ui';
import type { DataTableColumn } from '../../../shared/ui';

// Mínimo
<DataTable
  columns={[{ key: 'nome', label: 'Nome', render: (row) => row.nome }]}
  data={items}
  rowKey={(row) => row.id}
/>

// Com loading, erro e retry
<DataTable
  columns={columns}
  data={items}
  rowKey={(row) => row.id}
  loading={status === 'loading'}
  error={status === 'error' ? errorMessage : undefined}
  onRetry={() => reload()}
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

// Com row click e ActionMenu
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

// Com sorting externo
<DataTable
  columns={[
    { key: 'nome', label: 'Nome', sortable: true, render: (row) => row.nome }
  ]}
  data={items}
  rowKey={(row) => row.id}
  sortKey={sortKey}
  sortDir={sortDir}
  onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
/>

// Compacto
<DataTable columns={columns} data={items} rowKey={(row) => row.id} density="compact" />
```

Não reinventar `<table className="tbl">` manual quando `DataTable` cobre o caso.
