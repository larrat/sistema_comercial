# Modulo Piloto Oficial - Clientes

## Decisao

O modulo piloto oficial da migracao incremental e `clientes`.

## Justificativa

`clientes` foi escolhido porque conecta as principais regras de negocio que mais sofrem com o legado atual:

- cadastro
- identidade unica / duplicidade
- relacionamento comercial
- pedidos
- fidelidade
- RCA

Isso torna `clientes` o melhor modulo para validar a arquitetura alvo sem precisar reescrever o sistema inteiro.

## Escopo da primeira onda

### Entrar agora

- regra de identidade e duplicidade em TypeScript puro
- cobertura do modulo piloto
- estrutura inicial da nova feature
- testes unitarios da regra critica
- store React de clientes coberto por testes
- hook React de carregamento coberto por testes
- stores-base de auth e filial cobertos por testes

### Nao entrar agora

- substituicao completa da UI de clientes
- troca total do runtime atual
- integracao React final do fluxo inteiro

## Criterio de sucesso desta onda

- o piloto existe em estrutura separada do legado
- a primeira regra critica foi extraida para codigo testavel
- o coverage do piloto pode ser medido isoladamente
- o legado continua funcionando sem regressao
- a primeira fatia React do piloto roda com testes e coverage acima do threshold
