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
- adapter React de leitura/escrita de clientes extraido e coberto por testes
- formulario React de cliente plugado no adapter com fluxo de salvar/editar
- remocao real de cliente plugada no piloto React
- resumo contextual do cliente adicionado para aproximar o fluxo do legado
- abas leves de detalhe iniciadas no piloto React
- notas/historico iniciados no detalhe do cliente com API coberta por testes
- fidelidade iniciada como primeira subarea de alto valor no detalhe React

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
- o contrato de leitura/escrita ja pode ser plugado na UI nova sem depender de `fetch` espalhado
- a primeira UI real de escrita ja salva e edita clientes pelo fluxo React
- o piloto React ja cobre leitura, escrita, edicao e exclusao com testes
- o detalhe do cliente ja comeca a convergir para o legado sem perder blindagem de cobertura
- a primeira subarea de fidelidade ja carrega saldo, historico e lancamento manual no piloto
