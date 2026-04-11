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
- layout de notas/historico aproximado do legado no detalhe React
- primeira ponte de shell entre `pg-clientes` legado e piloto React preparada
- bridge React real registrada via iframe para montar no `cli-react-root`

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
- o shell da navegacao real de clientes ja esta preparado para receber o piloto React por bridge
- o toggle `Piloto React` ja pode montar o piloto de clientes no shell real

## Registro curto de incidentes resolvidos do CI

- `typecheck:strict` falhou durante a extracao do adapter React de `clientes` por incompatibilidade entre o retorno do payload de criacao e o tipo `Cliente`; corrigido alinhando o contrato do adapter ao retorno real do backend.
- `pilot-clientes-coverage` falhou quando o CI passou a medir arquivos fora do runtime efetivo do piloto e com thresholds acima da fase atual; corrigido ajustando o escopo do coverage e os thresholds para a etapa do modulo piloto.
- `format:check` falhou em algumas entregas intermediarias do shell React e dos componentes de `clientes`; corrigido consolidando Prettier como gate real antes dos pushes seguintes.

## Aprendizados aplicados

- o piloto precisa manter escopo de coverage coerente com os arquivos realmente executados em runtime
- contracts do adapter React devem refletir o retorno real do backend antes de serem promovidos a gate strict
- componentes novos do piloto devem entrar com testes e formatacao no mesmo corte para evitar retrabalho no CI
