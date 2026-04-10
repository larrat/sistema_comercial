# Piloto de Clientes

## Objetivo

Migração incremental do módulo de clientes em TypeScript estrito,
com funções puras, cobertura medida separadamente do legado e separação
clara entre regra de domínio, adapter e UI.

## Escopo atual

### Domínio

- `normalize.ts` — normalização de doc, email, telefone
- `identity.ts` — detecção de duplicidade por doc, e-mail, tel, WhatsApp
- `filter.ts` — filtragem de lista por texto, segmento e status + extração de segmentos únicos
- `types.ts` — tipos do domínio piloto (`ClientePilotRecord`, `ClienteIdentityConflict`, `ClienteFiltro`)

### Integração com o legado

- `adapter.ts` — bridge entre `Cliente` (domain.d.ts) e o piloto; o legado chama o adapter, o piloto não sabe do legado

### UI

- `ui/ClienteCard.ts` — card simples: avatar, nome, status, contato principal
- `ui/ClienteListItem.ts` — item de lista responsivo: mobile card + desktop `<tr>` com todos os campos
- `ui/ClienteEmptyState.ts` — estado vazio distinguindo `no-data` de `no-match`
- `ui/ClienteList.ts` — composição completa: `filterClientes` + renderização + empty state, retorna `{ html, total, visible, segmentos }`

## Regras

- nada aqui depende de DOM ou estado global
- toda função nova entra com teste
- ações de UI usam `data-action` + `data-id`, sem `onclick` inline
- cobertura medida separadamente via `npm run test:pilot:clientes:coverage`

## Comandos

```bash
npm run test:pilot:clientes           # roda testes sem coverage
npm run test:pilot:clientes:coverage  # roda com coverage (thresholds ativos)
```

## Próximos passos

- Wiring: legado chamando adapter para identidade e filtro
- Extrair validações de formulário (`salvarCliente`)
- Extrair lógica de métricas
