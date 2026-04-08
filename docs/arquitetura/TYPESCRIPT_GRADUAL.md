# TypeScript Gradual

O projeto foi preparado para aceitar TypeScript de forma progressiva, sem migracao total imediata.

## O que entrou

- `typescript` em `devDependencies`
- `tsconfig.json`
  Base permissiva para conviver com `.js` e futuros `.ts`
- `tsconfig.strict.json`
  Trilha mais exigente para evolucao gradual
- `src/types/global.d.ts`
  Declaracoes globais iniciais do runtime

## Como usar

Checagem base:

```powershell
npm run typecheck
```

Checagem mais estrita do que ja estiver tipado:

```powershell
npm run typecheck:strict
```

## Escopo desta fase

Os scripts atuais cobrem o front em `src/`.

As Edge Functions em `supabase/functions/` continuam fora desta checagem base porque usam runtime Deno e imports HTTP, o que pede uma trilha propria de validacao.

## Estrategia recomendada

1. Continuar o app principal em JavaScript por enquanto
2. Migrar primeiro modulos de maior risco de contrato
3. Tipar novas utilidades e novos modulos em `.ts`
4. Adicionar `// @ts-check` em arquivos JS criticos quando fizer sentido

## Prioridade de migracao sugerida

1. `src/app/api.js`
2. `src/features/produtos.js`
3. `src/features/clientes.js`
4. `src/features/pedidos.js`
5. `src/features/dashboard.js`
6. `supabase/functions/*` com configuracao Deno dedicada

## Observacao

Nesta fase, `allowJs` esta ativo e `checkJs` esta desligado no config principal para evitar ruido e permitir adocao controlada.
