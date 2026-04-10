# Proposta Objetiva de Branch Protection

## Objetivo

Definir uma configuracao minima e pragmatica de protecao da branch principal para este projeto.

## Branch alvo

- `main`

## Regras recomendadas

### 1. Pull Request obrigatorio

- Exigir PR para todo merge em `main`
- Bloquear push direto em `main`

### 2. Reviews obrigatorios

- Minimo de `1` aprovacao para PR comum
- Mudancas criticas devem exigir `2` aprovacoes

Considerar como mudanca critica:

- auth
- acessos / RBAC
- migrations SQL
- fidelidade
- pedidos
- campanhas / envios

### 3. Status checks obrigatorios

Exigir sucesso destes checks antes do merge:

- `quality`
- `e2e-ui-core`

Se novos checks forem adicionados depois, revisar esta lista para nao criar bypass sem querer.

### 4. Branch atualizada antes do merge

- Exigir branch atualizada com a base antes do merge

### 5. Conversation resolution

- Exigir resolucao de todas as conversas do PR antes do merge

### 6. Merge strategy

Recomendado:

- permitir `Squash merge`
- desabilitar `Merge commit`
- desabilitar `Rebase merge` se a equipe quiser historico mais previsivel

### 7. Administradores

Recomendado:

- aplicar as mesmas regras aos administradores

Justificativa:

- evita bypass por urgencia mal gerida
- melhora disciplina de engenharia

### 8. Force push e delete

- bloquear `force push`
- bloquear delete da branch protegida

## Configuracao pratica sugerida no GitHub

### Required pull request reviews

- [x] Require a pull request before merging
- [x] Require approvals: `1`
- [x] Dismiss stale approvals when new commits are pushed
- [x] Require review from Code Owners

Observacao:

O repositorio ja possui um `CODEOWNERS` inicial em [`.github/CODEOWNERS`](../../.github/CODEOWNERS).

### Require status checks to pass before merging

- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging

Checks:

- `quality`
- `e2e-ui-core`

### Additional settings

- [x] Require conversation resolution before merging
- [x] Do not allow bypassing the above settings
- [x] Restrict who can push to matching branches
- [x] Allow force pushes: `off`
- [x] Allow deletions: `off`

## Fase recomendada de adocao

### Agora

- PR obrigatorio
- 1 aprovacao
- checks obrigatorios:
  - `quality`
  - `e2e-ui-core`
- sem push direto

### Depois

- `2` aprovacoes para areas criticas
- coverage threshold como check obrigatorio

## Resultado esperado

Com essa configuracao, nenhum codigo entra em `main` sem:

- CI verde
- revisao humana
- historico de mudanca via PR
- conversa resolvida

Isso e o minimo necessario para manter a migracao incremental sob controle.
