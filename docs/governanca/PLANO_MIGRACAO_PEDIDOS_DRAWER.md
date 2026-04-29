# Plano de Migração — Pedidos para Drawer Global

**Data:** 2026-04-29
**Escopo:** Migrar `PedidoForm` e `PedidoDetailPanel` do container `card.card-shell` inline para o componente global `Drawer`.
**Status:** Planejamento — nenhum código funcional alterado ainda.

---

## 1. Contexto

`PedidosPilotPage` renderiza tanto o formulário de edição quanto o painel de detalhes como blocos inline dentro da página, usando classes `.card.card-shell` + `.modal-shell-head` + `.modal-shell-body`. Essas classes são CSS legado do `style.css` misturado com `react/styles.css` e produzem uma interface inconsistente com o restante do sistema, que já usa o componente global `Drawer` em Clientes.

O objetivo é unificar o padrão: ambos os componentes passam a ser filho do `Drawer`, que fornece sobreposição, header, scroll de body e footer fixo. Os componentes mantêm toda a lógica interna intacta.

---

## 2. Estado Atual

### `PedidosPilotPage.tsx` — máquina de estados

```
editingId: string | null   → 'new' | pedidoId | null
detailId:  string | null   → pedidoId | null
```

- Ambos mutuamente exclusivos.
- Controlados por state local + mensagens de bridge (`pedidos-legacy-shell`).
- `onSaved(pedido)` → `setEditingId(null); setDetailId(pedido.id)` — fecha form, abre detalhe.
- `onCancel()` → `setEditingId(null)`.
- `onClose()` → `setDetailId(null)`.

### `PedidoForm.tsx` — estrutura HTML atual

```
<div className="card card-shell">          ← container raiz (vira Drawer)
  <div className="form-shell-head">        ← header (substituído pelo header do Drawer)
    <div className="form-shell-kicker">Operacao</div>
    <div className="modal-shell-head">
      <div className="mt">{titulo}</div>   ← title prop do Drawer
      <p className="form-shell-copy">…</p> ← subtitle prop do Drawer
    </div>
  </div>

  <form>
    <div className="modal-shell-body">     ← vira children do Drawer (body scrollável)
      …FormSection, FormField, itens…
    </div>

    <div className="form-sticky-actions">  ← vira footer prop do Drawer
      <FormActions …>
        <button>Voltar</button>
        <button type="submit">Salvar</button>
      </FormActions>
    </div>
  </form>
</div>
```

Props do componente:
```ts
type Props = {
  initialPedido: Pedido | null;
  onSaved: (pedido: Pedido) => void;
  onCancel: () => void;
  analyticsOrigin?: string;
};
```

### `PedidoDetailPanel.tsx` — estrutura HTML atual

```
<div className="card card-shell">            ← container raiz (vira Drawer)
  <div className="modal-shell-head">         ← header (substituído pelo Drawer)
    <div>
      <div className="mt">Pedido #{num}</div> ← title prop do Drawer
      <div …chips com StatusBadge + badges…>  ← subtitle ou slot interno
    </div>
    <div style="display:flex; gap:0.5rem">
      <button onClick={onEditar}>Editar</button>   ← action prop do Drawer
      <button onClick={onClose}>Fechar</button>    ← botão nativo do Drawer
    </div>
  </div>

  <div className="modal-shell-body">          ← children do Drawer (body scrollável)
    …campos do pedido, itens, seção financeira…
    <div className="modal-actions" …>         ← footer prop do Drawer
      <button>Avançar status</button>
      <button>Cancelar pedido</button>
      …
    </div>
  </div>

  <PedidoCancelConfirmModal …/>              ← permanece dentro do componente
</div>
```

Props do componente:
```ts
type Props = {
  pedido: Pedido;
  onEditar: (id: string) => void;
  onClose: () => void;
};
```

---

## 3. API do Drawer Global

Arquivo: `src/react/shared/ui/Drawer.tsx`

```ts
type DrawerProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  action?: ReactNode;          // botões extras no header (ao lado do "Fechar" nativo)
  children: ReactNode;         // body scrollável (overflow-y: auto)
  footer?: ReactNode;          // fixed ao fundo (grid row auto)
  size?: 'sm' | 'md' | 'lg';  // padrão md = 400–480px; lg = 520–680px
  loading?: boolean;
  withOverlay?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;        // padrão true — já gerencia ESC internamente
  onClose: () => void;
};
```

CSS relevante:
- `.rf-ui-drawer`: `display: grid; grid-template-rows: auto 1fr auto; overflow: hidden`
- `.rf-ui-drawer__body`: `overflow-y: auto; min-height: 0; display: grid; gap: 16px`
- `.rf-ui-drawer__footer`: `display: flex; gap: 8px; justify-content: flex-end`
- `.rf-ui-drawer--lg`: `width: clamp(520px, 46vw, 680px)`

---

## 4. Mapeamento de Migração

### 4.1 `PedidoDetailPanel`

| O que é hoje | O que vira |
|---|---|
| `<div className="card card-shell">` | `<Drawer open={...} onClose={onClose} ...>` em PedidosPilotPage |
| `.modal-shell-head` inteiro | removido do componente |
| `.mt` → "Pedido #{num}" | `title` prop do Drawer |
| `.cli-react-shell__chips` com status/data/total | `subtitle` como string simples OU mover para início do body |
| `<button onClick={onEditar}>Editar</button>` | `action` prop do Drawer |
| `<button onClick={onClose}>Fechar</button>` | substituído pelo botão nativo do Drawer |
| `.modal-shell-body` | children do Drawer (body já scrollável) |
| `.modal-actions` final (avançar/cancelar/reabrir/gerar conta) | `footer` prop do Drawer |
| `<PedidoCancelConfirmModal …/>` | permanece dentro do componente, após o body |

**Assinatura após migração — componente interno:**
```tsx
// PedidoDetailPanel não tem mais wrapper externo — retorna diretamente o conteúdo do body
export function PedidoDetailPanel({ pedido, onEditar, onClose }: Props) {
  // todo o estado interno permanece igual
  return (
    <>
      {/* body content — sem wrapper card-shell */}
      <div className="fg c3">…campos…</div>
      <PedidoItemsSection … />
      <div className="panel" …>…seção financeira…</div>
      {/* modal-actions migradas para footer no Drawer pai */}

      <PedidoCancelConfirmModal … />
    </>
  );
}
```

**PedidosPilotPage — uso após migração:**
```tsx
<Drawer
  open={!!detailId}
  title={detailPedido ? `Pedido #${detailPedido.num}` : ''}
  subtitle={detailPedido ? `${statusLabel} · ${detailPedido.data}` : undefined}
  action={
    detailPedido ? (
      <button className="btn btn-sm" onClick={() => setEditingId(detailPedido.id)}>
        Editar
      </button>
    ) : undefined
  }
  footer={
    detailPedido ? (
      <PedidoDetailActions pedido={detailPedido} … />
    ) : undefined
  }
  size="md"
  onClose={() => setDetailId(null)}
>
  {detailPedido && <PedidoDetailPanel pedido={detailPedido} onEditar={…} onClose={…} />}
</Drawer>
```

> **Alternativa mais simples**: manter `PedidoDetailPanel` com a prop `onClose` e `onEditar`, mas mover os botões de ação do rodapé para um slot `footer` no Drawer — o componente exporta suas ações finais como `renderFooter?: () => ReactNode` ou como subcomponente separado `PedidoDetailActions`.

### 4.2 `PedidoForm`

| O que é hoje | O que vira |
|---|---|
| `<div className="card card-shell">` | `<Drawer open={...} onClose={onCancel} ...>` em PedidosPilotPage |
| `.form-shell-head` + `.form-shell-kicker` + `.modal-shell-head` | removidos do componente |
| `titulo` ("Novo pedido" / "Editar pedido #N") | `title` prop do Drawer |
| `"Operacao"` (kicker) | `subtitle` prop do Drawer (opcional) |
| `.modal-shell-body` (todo o form content) | children do Drawer — `<form>…</form>` sem wrapper shell |
| `.form-sticky-actions` com `<FormActions>` | `footer` prop do Drawer |

**PedidoForm — estrutura interna após migração:**
```tsx
export function PedidoForm({ initialPedido, onSaved, onCancel, analyticsOrigin }: Props) {
  // estado interno idêntico ao atual
  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      {formLoading && <LoadingState … />}
      {formError && <ErrorState … />}
      {!formLoading && !formError && (
        <>
          <FormError message={errors.geral} />
          {/* warn prazo */}
          <FormSection title="Resumo rápido" …>…</FormSection>
          <FormSection title="Essencial" …>…</FormSection>
          <FormSection title="Condições do pedido" …>…</FormSection>
          <details className="form-advanced-block" …>…</details>
        </>
      )}
    </form>
  );
}
```

**PedidosPilotPage — uso após migração:**
```tsx
<Drawer
  open={!!editingId}
  title={editingId === 'new' ? 'Novo pedido' : `Editar pedido #${editingPedido?.num ?? ''}`}
  subtitle="Operação"
  size="lg"
  closeOnOverlayClick={false}   // evita fechar acidentalmente form com dados
  onClose={onCancel}
  footer={
    <FormActions
      onCancel={onCancel}
      loading={saving}
      submitLabel={isEdit ? 'Salvar alterações' : 'Salvar pedido'}
    />
  }
>
  <PedidoForm … />
</Drawer>
```

> Problema: `saving` e `isEdit` são estado interno do `PedidoForm`. Para colocar `FormActions` no `footer` do Drawer pai, o formulário precisa elevar esse estado (via prop `renderFooter`) ou usar um padrão de ref imperativo. A alternativa mais simples é manter `FormActions` dentro do próprio `PedidoForm`, usando o slot `footer` do Drawer para renderizá-lo, passado como `renderFooter?: (actions: ReactNode) => void` callback — ou manter o rodapé interno ao form e usar `bodyClassName` no Drawer para habilitar padding extra no fundo.

**Solução recomendada:** manter `FormActions` dentro do `PedidoForm` como `<div className="rf-ui-drawer__footer-inline">` ao fim do `<form>`. O Drawer não usa o `footer` prop para o formulário. O body do Drawer já tem scroll, então o rodapé do form fica visível ao rolar ao fim — comportamento aceitável para o formulário de pedido que é longo.

---

## 5. Registro de Riscos

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | `D` (store legado) em `PedidoDetailPanel` | Alto | `D.contasReceber[filialId]` e `D.contasReceberBaixas[filialId]` são lidos diretamente do objeto global. A migração não altera isso. O `refreshContaFinanceira()` já busca via API quando token disponível e atualiza `D` — padrão permanece funcional enquanto o shell legado existir. Risco real: se o shell legado for removido antes de `D` ser refatorado. |
| R2 | Eventos legados em `PedidoDetailPanel` | Médio | Componente assina `sc:contas-receber-sync` e `sc:conta-receber-criada`, emite `sc:contas-receber-sync`. Esses eventos devem ser preservados na integração com o módulo Contas a Receber. A migração para Drawer não altera esse comportamento. |
| R3 | Bridge de mensagens em `PedidosPilotPage` | Médio | O subscriber `pedidos-legacy-shell` controla `editingId`/`detailId` — permanece em `PedidosPilotPage`. O Drawer wrapping é transparente para a bridge. Verificar que fechar o Drawer via ESC ou overlay também emite o estado correto para a bridge (`pedidos:estado-changed`). |
| R4 | `closeOnOverlayClick` no formulário | Baixo | Formulário com dados preenchidos pode ser fechado acidentalmente por clique no overlay. Usar `closeOnOverlayClick={false}` no Drawer que envolve o `PedidoForm`. |
| R5 | `PedidoCancelConfirmModal` dentro do Drawer | Baixo | O modal de confirmação de cancelamento é renderizado dentro do `PedidoDetailPanel`. Quando o Drawer está aberto, o modal sobrepõe corretamente pois usa z-index próprio. Confirmar z-index do modal vs. z-index 90 do Drawer. |
| R6 | Scroll e height do form | Baixo | `PedidoForm` é longo (5 FormSection). O `.rf-ui-drawer__body` tem `overflow-y: auto; min-height: 0` — scroll correto. Com `size="lg"` (520–680px) há espaço lateral suficiente para o grid de campos. Validar em mobile (Drawer vira full-width ≤ 768px pela media query existente). |
| R7 | Classes CSS orfãs após migração | Baixo | `.form-shell-head`, `.form-shell-kicker`, `.modal-shell-head`, `.modal-shell-body`, `.form-sticky-actions` ficam em `style.css` sem consumidores em Pedidos. Podem ser removidas em limpeza posterior (não nesta migration). |

---

## 6. Execução — Ordem de Passos

### Fase A — Pré-condições (não bloqueantes, validar antes de começar)

- [ ] `PedidoCancelConfirmModal` tem z-index superior a 90 (Drawer) — confirmar ou ajustar.
- [ ] Media query do Drawer em mobile (`≤ 768px`) comporta formulário sem overflow horizontal.
- [ ] Nenhum outro módulo importa diretamente `PedidoForm` ou `PedidoDetailPanel` além de `PedidosPilotPage`.

```bash
grep -rn "PedidoForm\|PedidoDetailPanel" src/ --include="*.tsx" --include="*.ts" | grep -v "PedidosPilotPage\|PedidoForm.tsx\|PedidoDetailPanel.tsx\|\.test\."
```

### Fase B — Migrar `PedidoDetailPanel` (menor risco)

1. Extrair do componente o bloco `.modal-shell-head` inteiro (header com título + chips + botões).
2. Extrair o bloco `.modal-actions` final para um subcomponente local `PedidoDetailFooter` ou passar como prop `renderFooter`.
3. Remover o wrapper `.card.card-shell` — componente retorna diretamente o conteúdo do body.
4. Em `PedidosPilotPage`, envolver o render do detalhe em `<Drawer open={!!detailId} …>`.
5. Passar `title`, `subtitle`, `action` e `footer` como props do Drawer.
6. Verificar que a bridge ainda funciona: abrir detalhe via bridge → Drawer abre; fechar via Drawer ESC → `setDetailId(null)` é chamado.

### Fase C — Migrar `PedidoForm` (maior complexidade)

1. Extrair do componente o bloco `.form-shell-head` + `.modal-shell-head` (header).
2. Remover o wrapper `.card.card-shell` — componente retorna diretamente `<form>`.
3. Remover `.modal-shell-body` wrapper — conteúdo do form é filho direto de `<form>`.
4. Decidir destino de `FormActions`:
   - **Opção A (simples):** manter `FormActions` dentro do `<form>`, ao fim, sem sticky. Body do Drawer rola.
   - **Opção B (elevação):** expor `saving` via prop `onSavingChange?: (saving: boolean) => void` e construir o footer no Drawer pai.
   - **Recomendação:** Opção A para esta iteração. Opção B em refatoração futura se o UX de rolar ao fim for problemático.
5. Em `PedidosPilotPage`, envolver em `<Drawer size="lg" closeOnOverlayClick={false} …>`.
6. Verificar que `onSaved` ainda faz `setEditingId(null); setDetailId(pedido.id)` — o Drawer fecha e abre o detalhe em sequência.

### Fase D — Limpeza (após validação)

- Remover classes CSS orfãs de Pedidos de `style.css`: `.form-shell-head`, `.form-shell-kicker`, `.modal-shell-body` (verificar que não há outros consumidores antes de remover).
- Atualizar `BASELINE_TECNICO_ATUAL.md` — Pedidos: UI pattern = Drawer.

---

## 7. Arquivos Envolvidos

| Arquivo | Tipo de mudança |
|---|---|
| `src/react/features/pedidos/components/PedidosPilotPage.tsx` | Wrapping em Drawer (lógica de open/close já existe — só encapsula no componente) |
| `src/react/features/pedidos/components/PedidoDetailPanel.tsx` | Remove wrapper externo e header; body do componente se torna children do Drawer |
| `src/react/features/pedidos/components/PedidoForm.tsx` | Remove wrapper externo, header e `form-sticky-actions`; form vira children do Drawer |
| `src/react/shared/ui/Drawer.tsx` | Nenhuma mudança |
| `src/react/styles.css` | Nenhuma mudança nesta fase (limpeza posterior) |

---

## 8. Critérios de Aceitação

- [ ] Abrir "Novo pedido" via botão ou bridge → Drawer `size="lg"` abre com título correto.
- [ ] Preencher form e salvar → Drawer fecha, Drawer do detalhe abre com o pedido criado.
- [ ] Cancelar form (botão Voltar ou ESC) → Drawer fecha sem salvar.
- [ ] Clicar no overlay do form → Drawer **não** fecha (`closeOnOverlayClick={false}`).
- [ ] Abrir detalhe de pedido existente → Drawer `size="md"` abre com título "Pedido #N".
- [ ] Botão "Editar" no detalhe → Drawer do detalhe fecha, Drawer do form abre no mesmo pedido.
- [ ] Seção financeira no detalhe carrega conta a receber e baixas normalmente.
- [ ] Botões de ação (avançar status, cancelar, reabrir, gerar conta) funcionam e atualizam o estado.
- [ ] `PedidoCancelConfirmModal` abre sobre o Drawer sem ser cortado.
- [ ] Bridge: `pedidos:editar`, `pedidos:detalhe`, `pedidos:novo` abrem os Drawers corretos.
- [ ] ESC fecha o Drawer ativo sem erros.
- [ ] `npm run typecheck:strict` e `npm run lint` passam sem erros.

---

## 9. O Que NÃO Muda

- Lógica de `submitPedido`, validações, cálculo de total e `handleSubmit` em `PedidoForm`.
- Hooks: `usePedidoMutations`, `usePedidoFormData`, `usePedidoStore`.
- Leitura de `D.contasReceber` / `D.contasReceberBaixas` em `PedidoDetailPanel`.
- `refreshContaFinanceira()` e assinaturas de eventos legados.
- Bridge em `PedidosPilotPage` — subscribers e publishers de `pedidos-legacy-shell`.
- `PedidoCancelConfirmModal` — não mexer.
- `PedidoItemsSection` — não mexer.
- Toda a lógica de paginação, filtro e tabela em `PedidosPilotPage`.
