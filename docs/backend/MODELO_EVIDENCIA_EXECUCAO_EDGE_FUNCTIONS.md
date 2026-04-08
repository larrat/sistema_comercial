# Modelo de Evidencia - Execucao de Edge Functions

Data base: 2026-04-08  
Uso: preencher no dia do deploy/validacao

## Identificacao da execucao

- Data:
- Hora inicio:
- Hora fim:
- Responsavel:
- Ambiente:
- Maquina:
- Branch:
- Commit:
- Supabase project ref:

## Pre-check

- `git --version`:
- `supabase --version`:
- `supabase login`: ok / falhou
- `supabase link --project-ref ...`: ok / falhou

## Deploy

### campanhas-gerar-fila

- Status: ok / falhou
- Comando:

```powershell
supabase functions deploy campanhas-gerar-fila
```

- Output:

```text
cole aqui
```

### acessos-admin

- Status: ok / falhou
- Comando:

```powershell
supabase functions deploy acessos-admin
```

- Output:

```text
cole aqui
```

### acessos-admin-read

- Status: ok / falhou
- Comando:

```powershell
supabase functions deploy acessos-admin-read
```

- Output:

```text
cole aqui
```

## Smoke - sucesso

### campanhas-gerar-fila

- Papel usado:
- Status esperado:
- Status obtido:
- Comando:

```powershell
.\scripts\smoke\campanhas-gerar-fila.ps1 ...
```

- Output:

```text
cole aqui
```

### acessos-admin

- Papel usado:
- Status esperado:
- Status obtido:
- Comando:

```powershell
.\scripts\smoke\acessos-admin.ps1 ...
```

- Output:

```text
cole aqui
```

### acessos-admin-read

- Papel usado:
- Status esperado:
- Status obtido:
- Comando:

```powershell
.\scripts\smoke\acessos-admin-read.ps1 ...
```

- Output:

```text
cole aqui
```

## Smoke - autorizacao

### campanhas-gerar-fila

- Papel usado:
- Status esperado:
- Status obtido:
- Comando:

```powershell
.\scripts\smoke\campanhas-gerar-fila.ps1 ...
```

- Output:

```text
cole aqui
```

### acessos-admin

- Papel usado:
- Status esperado:
- Status obtido:
- Comando:

```powershell
.\scripts\smoke\acessos-admin.ps1 ...
```

- Output:

```text
cole aqui
```

### acessos-admin-read

- Papel usado:
- Status esperado:
- Status obtido:
- Comando:

```powershell
.\scripts\smoke\acessos-admin-read.ps1 ...
```

- Output:

```text
cole aqui
```

## Resultado final

- [ ] aprovado
- [ ] bloqueado para investigacao
- [ ] rollback necessario

## Motivo da decisao

```text
descreva aqui
```

## Pendencias abertas

```text
descreva aqui
```

## Referencias

- [CHECKLIST_DEPLOY_EDGE_FUNCTIONS.md](/e:/Programas/sistema_comercial/docs/backend/CHECKLIST_DEPLOY_EDGE_FUNCTIONS.md)
- [RUNBOOK_DEPLOY_EDGE_FUNCTIONS_V1.md](/e:/Programas/sistema_comercial/docs/backend/RUNBOOK_DEPLOY_EDGE_FUNCTIONS_V1.md)
- [CHECKLIST_EXECUCAO_FASE_1.md](/e:/Programas/sistema_comercial/docs/governanca/CHECKLIST_EXECUCAO_FASE_1.md)
