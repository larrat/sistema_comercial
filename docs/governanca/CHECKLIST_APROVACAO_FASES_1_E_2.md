# Checklist de Aprovacao - Fases 1 e 2

Data base: 2026-04-08  
Uso: marcar e decidir encerramento operacional das fases.

## Fase 1

### Ambiente e RLS
- [ ] `01b` congelado para uso exclusivo de dev/local
- [ ] `02/03/04/05` aplicados e validados
- [ ] `05b_validacao_fase_1_rls_rbac.sql` executado
- [ ] `politicas_anon_abertas = 0`
- [ ] evidencias anexadas

### Edge Functions
- [ ] `campanhas-gerar-fila` publicada
- [ ] `acessos-admin` publicada
- [ ] `acessos-admin-read` publicada

### Smokes obrigatorios
- [ ] `campanhas-gerar-fila` sucesso
- [ ] `campanhas-gerar-fila` autorizacao
- [ ] `acessos-admin` sucesso
- [ ] `acessos-admin` autorizacao
- [ ] `acessos-admin-read` sucesso
- [ ] `acessos-admin-read` autorizacao

### Evidencia final
- [ ] modelo de evidencia preenchido
- [ ] checklist da Fase 1 atualizado
- [ ] decisao final registrada

## Fase 2

### Contrato e integracao
- [ ] `SB.toResult(...)` aplicado nos fluxos criticos
- [ ] campanhas usam backend para gerar fila
- [ ] acessos escrita usam backend
- [ ] acessos leitura usam backend agregado

### Suite minima
- [ ] runner backend da Fase 2 aprovado
- [ ] output do runner anexado
- [ ] checklist da Fase 2 atualizado

### Onda B UI
- [ ] base Playwright preparada no repositório
- [ ] specs `login`, `setup-filial` e `bootstrap-filial` preparados
- [ ] bloqueio atual de browser/execucao registrado, se ainda existir

## Decisao

- [ ] Fase 1 aprovada
- [ ] Fase 2 aprovada pela trilha backend
- [ ] Fase 2 parcialmente aprovada, com Onda B pendente
- [ ] bloqueado para investigacao
