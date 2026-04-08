# Nova Organizacao do Repositorio

Data base: 2026-04-08  
Objetivo: reduzir bagunca na raiz, separar runtime por responsabilidade e manter o projeto funcional durante a reorganizacao.

## Estrutura adotada

```text
src/
  app/
  shared/
  features/
    cotacao/
  styles/
docs/
  arquitetura/
  backend/
  dashboard/
  design-system/
  feedback/
  fluxos/
  governanca/
  mobile/
  release/
  telemetria/
scripts/
tests/
sql/
supabase/
```

## Criterios usados

- `src/app/`: ponto de entrada, estado, acesso a dados e bootstrap local
- `src/shared/`: utilitarios e infraestrutura reaproveitada por varios dominios
- `src/features/`: modulos funcionais do produto
- `src/styles/`: camada visual principal
- `docs/`: documentacao e governanca fora da raiz

## Decisoes importantes

### 1. Runtime movido para `src/`

Motivo:
- separar codigo de aplicacao de scripts, docs e infra
- reduzir acoplamento com a raiz
- deixar o caminho de evolucao para arquitetura por dominio mais claro

### 2. Pastas antigas vazias nao devem continuar crescendo

As pastas antigas `core/`, `js/`, `modules/`, `cotacao/` e `css/` deixaram de ser origem de runtime.

### 3. Arquivos sem remocao segura foram arquivados, nao apagados

Arquivos sem uso real confirmado e sem valor de runtime foram preservados em `docs/arquivo-legado/` quando o risco de exclusao definitiva nao valia a pena.

## Pendencias conscientemente aceitas

- Parte da documentacao historica ainda cita caminhos antigos (`js/main.js`, `css/style.css`, `core/*`).
- Isso nao afeta o runtime, mas merece normalizacao documental em uma etapa futura.

## Resultado esperado

- raiz menor e mais previsivel
- runtime agrupado por responsabilidade
- menor risco de novos arquivos de aplicacao serem espalhados sem criterio
