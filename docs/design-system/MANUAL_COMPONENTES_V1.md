# Manual de Componentes (V1)

Data: 2026-04-07
Escopo: Design System do Sistema Comercial
Fonte de verdade: `css/style.css`

## Matriz de padrões por componente

| Componente | Anatomia mínima | Estados obrigatórios | Uso principal | Não usar quando |
|---|---|---|---|---|
| Button (`.btn`) | label + variante (`.btn-p/.btn-sm/.btn-gh/.btn-r`) | default, hover, focus-visible, disabled, is-loading | ação primária/secundária | para texto explicativo sem ação |
| Input (`.inp`) | label + campo + feedback | default, focus, is-error, is-success, disabled | entrada de texto/numero/data | escolha de opção fechada (usar select) |
| Select (`.sel`) | label + opções + estado vazio | default, focus, is-error, disabled | escolha controlada | buscar texto livre |
| Modal (`.modal-wrap/.modal-box`) | título + conteúdo + ação primária + cancelar | open/close, scroll-safe mobile, loading | criação/edição e confirmação de tarefa | leitura simples sem ação |
| Card/Panel (`.card/.panel`) | título opcional + conteúdo + CTA opcional | default, hover (desktop), empty | agrupar informação ou bloco de tarefa | listas longas tabulares |
| Tabela (`.tbl`) | thead, tbody, coluna ação | default, hover row, empty fallback | leitura comparativa de registros | mobile com muitos dados (usar mobile-card) |
| Toast (`#toast`) | mensagem curta + severidade | info, success, warning, error | feedback imediato pós-ação | instrução longa complexa |
| Badge (`.bdg`) | rótulo curto semântico | bk, bb, ba, br, bg | status, prioridade, categoria | substituir botão ou ação |
| Empty state (`.empty`) | ícone + título/linha + próximo passo | neutro, com CTA opcional | ausência de dados | erro de sistema crítico |
| Loading (`.is-loading`, `.sk-grid`) | placeholder/skeleton + bloqueio de ação | loading start/end | processamento assíncrono | ações instantâneas |
| Tabs (`.tabs/.tb`) | cabeçalho + conteúdo associado | default, on, focus | alternar contexto na mesma página | steps sequenciais de formulário |
| Mobile Card (`.mobile-card`) | head + meta + tags + ações | default, empty, action states | lista mobile de clientes/campanhas | comparação de muitas colunas |
| Pagination (`c-pagination`) | prev/next + página atual + tamanho | default, disabled | listas extensas > 50 itens | listas curtas |

## Semântica de cor padronizada

- Crítico: vermelho (`br` / erro)
- Atenção: âmbar (`ba` / alerta)
- Oportunidade/Info: azul (`bb`)
- Sucesso: verde (`bg`)
- Neutro: cinza (`bk`)

## Contrato de comportamento entre módulos

- `Clientes`, `Campanhas`, `Dashboard` e `Pedidos` devem usar os mesmos estados visuais para os mesmos significados.
- Toda validação de formulário deve usar:
  - feedback textual padronizado,
  - `is-error` no campo,
  - foco no primeiro campo com erro.
- Toda ação principal deve ter um único CTA dominante por bloco.

## Exemplo correto (padrão)

```html
<div class="fg">
  <div>
    <div class="fl">Nome *</div>
    <input class="inp" id="c-nome">
  </div>
</div>
<div class="modal-actions">
  <button class="btn" type="button">Cancelar</button>
  <button class="btn btn-p" type="button">Salvar</button>
</div>
```

## Exemplo incorreto (fora do padrão)

```html
<input style="border:1px solid red; padding:5px">
<button style="background:purple">Salvar</button>
```
