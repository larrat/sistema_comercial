# Relatório — Cadastro de cliente em página própria

Data: 2026-05-11
Escopo: substituir o fluxo de novo cliente em drawer por página dedicada.

## O que foi feito

- Criada a rota `/app/clientes/novo`.
- Criada a página `ClienteCreateRoutePage`.
- O botão "Novo cliente" da lista agora navega para `/app/clientes/novo`.
- O formulário `ClienteForm` foi reaproveitado sem duplicar validação, campos ou regra de salvamento.
- Após salvar, o sistema navega para a página do cliente criado, na aba `Cadastro`.
- A edição rápida existente via drawer foi mantida para não alterar mais comportamento do que o necessário.

## Arquivos alterados

- `src/react/app/router/AppRouter.tsx`
- `src/react/features/clientes/pages/ClienteCreateRoutePage.tsx`
- `src/react/features/clientes/pages/ClientesRoutePage.tsx`
- `src/react/features/clientes/components/ClientesPilotPage.tsx`
- `src/react/styles.css`
- `docs/status/RELATORIO_CADASTRO_CLIENTE_PAGINA_PROPRIA.md`

## Decisão de UX

O cadastro novo saiu do drawer porque o fluxo exige preencher todos os dados de uma vez. Página própria dá mais espaço, reduz distração da lista ao fundo e mantém o padrão de perfil/detalhe já usado em Clientes.

## O que não foi feito

- Não foram alterados campos do cadastro.
- Não foi alterada a regra de validação.
- Não foi alterada a API de salvar cliente.
- Não foi removido o drawer de edição existente.

## Pontos para o humano verificar

- Clicar em "Novo cliente" abre `/app/clientes/novo`.
- Preencher e salvar cliente navega para a página do cliente criado.
- Cancelar volta para `/app/clientes`.
- A edição de cliente existente continua funcionando.
