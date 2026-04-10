# Contribuindo

## Fluxo padrao

1. Crie uma branch no padrao:
   - `feat/nome-curto`
   - `fix/nome-curto`
   - `refactor/nome-curto`
   - `docs/nome-curto`
   - `test/nome-curto`
   - `chore/nome-curto`
2. Implemente a mudanca com teste e documentacao minima.
3. Rode validacoes locais antes de abrir PR.
4. Abra PR preenchendo contexto, risco e plano de teste.
5. Aguarde aprovacao antes do merge.

## Commits

Use Conventional Commits:

- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `test:`
- `chore:`

## Validacoes locais recomendadas

```powershell
npm run typecheck
npm run typecheck:strict
npm run test:e2e:login
```

## Regras

- nao commitar secrets
- nao aumentar debito tecnico sem justificativa
- nao misturar refactor amplo com hotfix urgente
- documentar decisoes arquiteturais em ADR
