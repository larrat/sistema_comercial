# Relatorio de CI local — 2026-04-28

Data da execucao: 2026-04-29 15:24:32 -03

| Comando | Status | Resultado | Observação |
|---|---|---|---|
| `npm run lint` | falhou | `82 problemas` (`7 errors`, `75 warnings`) | Ha erros reais de lint espalhados no codebase; nao e um bloco localizado de uma unica feature |
| `npm run typecheck` | ok | `tsc --noEmit` concluiu sem erros | Integridade de tipos preservada |
| `npm run test` | indisponivel | script nao existe no `package.json` | Nao executado |
| `npm run test:react` | ok | `17` arquivos, `153` testes passando | Ajustes pequenos feitos em testes de `Clientes` e `App` |
| `npm run build` | indisponivel | script nao existe no `package.json` | Nao executado |

## 1. Erros encontrados

### Lint

Principais erros encontrados em `npm run lint`:

1. regra ausente de ESLint:
   - `src/react/app/filial/FilialSwitcher.tsx`
   - `Definition for rule 'react-hooks/exhaustive-deps' was not found`

2. expressoes soltas:
   - `src/react/features/campanhas/components/WhatsAppPreviewModal.tsx`
   - `@typescript-eslint/no-unused-expressions`

3. whitespace irregular:
   - `src/react/features/cotacao/services/cotacaoImportService.ts`
   - `no-irregular-whitespace`

4. `prefer-const`:
   - `src/react/features/cotacao/services/cotacaoImportService.ts`

5. erro de preservacao de causa:
   - `src/react/features/estoque/services/estoqueApi.ts`
   - `preserve-caught-error`

6. grande volume de warnings de `no-unused-vars` espalhados em:
   - `src/app/main.js`
   - stores React de `campanhas`, `cotacao`, `dashboard`, `estoque`, `rcas`, `relatorios`
   - adapters legados

### Testes React

Falhas iniciais encontradas:

1. testes de `Clientes` quebrados apos:
   - navegacao para perfil dedicado;
   - instrumentacao de analytics com hook que depende de router;
2. teste de `App` com expectativa antiga de texto `Login`;
3. teste de reload de `useClienteData` com ordem de mocks desatualizada em relacao ao fluxo atual.

## 2. Correções feitas

Foram corrigidos apenas erros simples e diretamente ligados às mudancas recentes:

- [src/react/features/clientes/components/ClientesPilotPage.test.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/clientes/components/ClientesPilotPage.test.tsx:1)
  - mock de `useAnalytics`
  - alinhamento dos testes ao fluxo atual de navegacao para perfil dedicado
  - ajuste de comandos legacy ainda suportados
  - remocao de expectativa antiga de detalhe inline

- [src/react/features/clientes/hooks/useClienteData.test.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/clientes/hooks/useClienteData.test.tsx:1)
  - correcao da ordem dos mocks de `fetch` no cenario de reload apos falha

- [src/react/App.test.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/App.test.tsx:1)
  - expectativa atualizada para o CTA real de login (`Entrar`)

## 3. Pendencias

1. `lint` ainda nao esta verde.
2. o bloco de lint falho nao esta concentrado num unico modulo; mistura:
   - legado morto/arquivos bridge
   - stores geradas com warnings antigos
   - alguns erros reais em `campanhas`, `cotacao`, `estoque` e `FilialSwitcher`
3. `build` e `test` com esses nomes exatos nao existem no `package.json`.

## 4. Recomendação de próxima etapa

1. abrir uma rodada curta so de saneamento de `lint`, separando:
   - erros reais de execucao/qualidade
   - warnings historicos de legado morto
2. priorizar primeiro os `errors` de lint:
   - `FilialSwitcher`
   - `WhatsAppPreviewModal`
   - `cotacaoImportService`
   - `estoqueApi`
3. depois decidir se vale:
   - limpar warnings antigos de vez;
   - ou ajustar a configuracao de lint para nao misturar legado morto com alvo React ativo.

## 5. Resumo executivo

- `typecheck`: verde
- `test:react`: verde
- `lint`: vermelho
- `test`: indisponivel
- `build`: indisponivel

Leitura honesta: o estado atual esta tecnicamente melhor do que o `lint` faz parecer, porque tipos e testes React passaram. O principal debito imediato agora e saneamento de lint, nao regressao funcional recente.
