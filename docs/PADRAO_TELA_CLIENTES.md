# Padrão de Tela — Clientes

Última atualização: 04/05/2026
Referência principal: tela de Clientes em React.

Este documento define o padrão visual e funcional que deve ser usado como referência para outras telas do sistema comercial.
A tela de Clientes é a base porque já cobre bem os fluxos de listar, buscar, criar, editar, visualizar detalhes e confirmar ações sensíveis.

## Ideia central

Toda tela importante do sistema deve permitir que eu faça o trabalho sem procurar caminho.
A tela precisa deixar claro:

- Onde estou.
- O que posso fazer agora.
- Como encontro um registro.
- Como crio um registro novo.
- Como edito um registro existente.
- Como vejo detalhes sem me perder.
- O que aconteceu quando algo deu erro, carregou ou ficou vazio.

## Estrutura padrão da tela de lista

A tela de lista deve seguir esta ordem:

1. Cabeçalho da página.
2. Ação principal no cabeçalho.
3. Abas internas, se fizer sentido.
4. Barra de busca e filtros.
5. Ações secundárias da lista.
6. Tabela ou lista principal.
7. Menu de ações por linha.
8. Estado vazio útil.
9. Estado de carregamento.
10. Estado de erro com tentativa de recarregar.

## Cabeçalho

Usar o mesmo padrão do `PageHeader`.

O cabeçalho deve ter:

- Kicker curto, como categoria da área.
- Título direto.
- Descrição curta explicando o uso da tela.
- Botão principal à direita.
- Informação de contexto quando ajudar, como total de registros ou página atual.

Exemplo de intenção:

- Kicker: Relacionamento.
- Título: Clientes.
- Descrição: explica o que a pessoa faz ali.
- Ação principal: Novo cliente.
- Meta: total e paginação.

## Ação principal

A ação principal deve ficar no cabeçalho.

Regras:

- Deve ser um botão primário.
- Deve começar com verbo ou intenção clara.
- Deve abrir o fluxo de criação.
- Deve existir também no estado vazio quando a lista não tiver registros.

Exemplos:

- Novo cliente.
- Novo produto.
- Nova conta.
- Novo fornecedor.

Evitar:

- Botão duplicado em lugares diferentes sem necessidade.
- Dois botões primários competindo na mesma tela.
- Ação principal escondida dentro de menu.

## Busca e filtros

Usar o mesmo padrão do `FilterBar`.

A tela deve ter busca quando houver volume de registros.
Os filtros devem ser poucos e úteis para atendimento real.

Na tela de Clientes, o padrão é:

- Campo de busca.
- Filtro por segmento.
- Filtro por status.
- Botão Limpar quando houver filtro ativo.
- Ação secundária Exportar CSV.

Para outras telas, adaptar sem exagerar.
Se o filtro não ajuda a encontrar algo no uso diário, não entra.

## Tabela principal

Usar o mesmo padrão do `DataTable`.

A tabela deve ter:

- Coluna principal com identificação forte.
- Colunas secundárias com dados úteis.
- Status traduzido para texto humano.
- Valores vazios como `—` ou texto claro.
- Clique na linha abrindo detalhe, quando existir detalhe.
- Menu de ações por linha.
- Paginação quando houver muitos registros.

Na tela de Clientes, a coluna principal mostra:

- Iniciais/avatar simples.
- Nome.
- Apelido, quando existe.

Esse padrão pode virar:

- Produto: nome + código/SKU.
- Fornecedor: nome + contato.
- Conta: descrição + cliente/pedido.
- Pedido: número + cliente.

## Menu de ações por linha

Usar o mesmo padrão do `ActionMenu`.

A ordem preferencial é:

1. Ver detalhes.
2. Editar.
3. Ações específicas da tela.
4. Excluir ou cancelar, sempre por último e marcado como perigoso.

Ações destrutivas não devem executar direto.
Devem abrir modal de confirmação.

## Novo e edição

Usar drawer lateral quando o formulário for parte da rotina da lista.

Na tela de Clientes:

- `Novo cliente` abre drawer.
- `Editar` abre o mesmo formulário em modo edição.
- Salvar fecha o drawer.
- Depois de salvar, a tela recarrega e abre o detalhe do registro salvo.
- Cancelar fecha sem salvar.

Esse é o padrão preferido para cadastros simples e médios.

Usar página própria só quando o formulário for grande demais ou tiver etapas complexas.

## Formulário

Usar o mesmo padrão de `ClienteForm`:

- Separar campos por seções.
- Colocar primeiro o que é essencial.
- Usar labels humanos.
- Marcar obrigatório só quando for obrigatório de verdade.
- Validar antes de salvar.
- Mostrar erro no formulário, não em alerta solto.
- Manter botões de ação no final, de forma previsível.

Ordem recomendada para cadastros:

1. Essencial.
2. Comercial ou operacional.
3. Localização, observações ou detalhes complementares.

Campos técnicos devem virar texto humano.
Exemplo:

- `em_separacao` vira `Em separação`.
- `a_vista` vira `À vista`.
- `ativo` vira `Ativo`.

## Detalhe do registro

Quando uma tela tiver detalhe, seguir o padrão do perfil do cliente.

O detalhe deve ter:

- Voltar para lista.
- Título forte com nome ou identificação do registro.
- Status visível.
- Ações principais no topo.
- KPIs ou cards quando ajudarem a decidir algo.
- Abas quando houver blocos diferentes de informação.
- Resumo primeiro.
- Cadastro editável em uma aba ou seção própria.

Na tela de Clientes, as abas são:

- Resumo.
- Pedidos.
- Financeiro.
- Notas.
- Cadastro.

Outras telas não precisam copiar essas abas.
Devem copiar a lógica: resumo primeiro, detalhes depois.

## Estados obrigatórios

Toda tela padronizada deve tratar quatro estados:

- Carregando.
- Erro.
- Vazio.
- Com dados.

Estado vazio precisa orientar a próxima ação.
Exemplo:

- Nenhum cliente cadastrado ainda.
- Cadastre o primeiro cliente para começar a operar por aqui.
- Botão: Novo cliente.

Erro precisa ter mensagem clara e, quando possível, botão para tentar novamente.

## Confirmações

Ações perigosas devem usar modal, não `window.confirm`.

A confirmação deve dizer:

- O que será feito.
- Qual registro será afetado.
- Se a ação é definitiva ou reversível.
- Botão de cancelar.
- Botão perigoso com texto específico.

Exemplo:

- Excluir cliente.
- Cancelar conta.
- Remover produto.

## Atalhos de teclado

Atalhos são opcionais, mas a tela de Clientes já tem um bom padrão:

- `/` foca a busca.
- `n` abre novo cadastro.
- `Escape` fecha o drawer.
- `Enter` salva quando o formulário está aberto, exceto em textarea.

Só adicionar atalhos em telas de uso frequente.

## Checklist para padronizar uma tela

Antes de mexer em uma tela, comparar com Clientes:

- A tela tem um cabeçalho claro?
- A ação principal está no mesmo lugar?
- Existe botão duplicado sem necessidade?
- A busca funciona e tem placeholder claro?
- Os filtros são úteis no uso diário?
- A tabela mostra a informação principal primeiro?
- Status técnicos aparecem como texto humano?
- Datas aparecem em formato brasileiro?
- A linha abre detalhe quando isso faz sentido?
- O menu da linha tem ações na ordem certa?
- Excluir/cancelar usa modal?
- Novo e editar usam o mesmo formulário?
- O formulário está separado em seções?
- Erros aparecem dentro da tela?
- O vazio ajuda a tomar a próxima ação?
- Carregamento e erro estão tratados?

## Ordem sugerida de aplicação

Aplicar esse padrão uma tela por vez.

Ordem recomendada:

1. Produtos.
2. Contas a Receber.
3. Fornecedores, se existir fluxo ativo.
4. Pedidos.
5. PDV, apenas nos pontos que ajudam atendimento rápido.

Não padronizar tudo ao mesmo tempo.
A regra é: uma tela, valida em produção, depois a próxima.

## O que não copiar cegamente

Nem toda tela precisa ter:

- Abas.
- Exportar CSV.
- KPIs.
- Gráfico.
- Perfil completo.
- Atalho de teclado.
- Drawer.

Copiar a lógica, não o enfeite.
A pergunta é sempre: isso ajuda a atender cliente ou operar a loja melhor?

## Decisão prática

A tela de Clientes passa a ser o padrão de referência.
Quando houver dúvida em outra tela, seguir Clientes primeiro.
Se a outra tela tiver uma necessidade real diferente, adaptar sem criar complexidade desnecessária.
