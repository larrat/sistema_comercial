# Relatório — Correção do Modal compartilhado

Data: 2026-05-11
Escopo: posicionamento do componente `Modal` base.

## O que foi feito

- O componente `Modal` compartilhado passou a renderizar via React Portal em `document.body`.
- O overlay do modal passou a usar `position: fixed`, `inset: 0`, `z-index: 1000`, fundo escuro e centralização por flex.
- O painel do modal recebeu classe base `modal-panel` com largura máxima, altura máxima, scroll interno e padding.
- A API do componente foi mantida: `open`, `onClose`, `closeOnOverlay`, `title`, `children` e `footer` continuam iguais.

## Arquivos alterados

- `src/react/shared/ui/Modal.tsx`
- `src/react/styles.css`
- `docs/status/RELATORIO_CORRECAO_MODAL.md`

## Portal

O Modal não usava `createPortal` antes da correção.
Agora o conteúdo é renderizado diretamente no `document.body`, fora da árvore do componente pai.

## Verificação de ancestrais

Foi feita busca por `transform`, `filter` e `will-change` nos estilos React.
Não foi encontrado `transform` ou `will-change` que explicasse o problema.
Foram encontrados apenas usos pontuais de `filter: brightness(...)` em estados visuais, sem indicação de ancestral estrutural do modal.

## Modais impactados

Como a correção foi feita no componente base, ela se aplica aos modais que usam `src/react/shared/ui/Modal.tsx`, incluindo:

- Confirmar entrega em Pedidos.
- Confirmação de cancelamento em Pedidos.
- Baixa/confirmacões em Contas a Receber.
- Ajustes e confirmações em Estoque.
- Confirmações de Clientes e Produtos.

## O que não foi feito

- Não foi criado componente Modal novo.
- Não foi alterado conteúdo, lógica ou callback dos modais existentes.
- Não foi alterado z-index da sidebar ou topbar.
- Não houve validação visual em navegador neste turno.

## Pontos para o humano verificar

- Abrir o modal "Confirmar entrega" em Pedidos e confirmar que aparece centralizado.
- Clicar fora do painel e confirmar que o modal fecha.
- Testar em tela menor e confirmar que o modal não fica cortado.
