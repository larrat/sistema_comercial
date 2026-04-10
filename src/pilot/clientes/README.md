# Piloto de Clientes

## Objetivo

Iniciar a migracao incremental do modulo de clientes em TypeScript estrito, com funcoes puras, cobertura medida e separacao entre regra de dominio e UI.

## Escopo inicial

- normalizacao de identidade
- deteccao de duplicidade
- base para extrair regras hoje espalhadas em `src/features/clientes.js`

## Regras

- nada aqui deve depender de DOM
- toda regra nova entra com teste
- cobertura deste piloto sera medida separadamente do legado
