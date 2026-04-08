# Revisão da base de código: problemas encontrados e tarefas sugeridas

## 1) Tarefa de correção de erro de digitação
**Problema identificado**
- Há texto de comentário no HTML que parece ter ficado de uma edição anterior: `Link para o seu novo arquivo CSS`. A palavra “novo” tende a ficar incorreta com o tempo e gera ruído de leitura (parece texto provisório).

**Tarefa sugerida**
- Ajustar o comentário para algo permanente e objetivo, por exemplo: `Link para o arquivo CSS principal`.

**Critério de aceite**
- O comentário deixa de conter texto provisório/ambíguo e passa a descrever o propósito do link de forma estável.

**Referência**
- `index.html` (bloco `<head>` com comentário antes do `<link rel="stylesheet" ...>`).

---

## 2) Tarefa de correção de bug
**Problema identificado**
- O JavaScript possui fluxo de navegação e exportação para a seção `campanhas` (`ir('campanhas')` e `exportCSV('campanhas')`), porém o HTML não expõe item de menu/página para campanhas. Isso pode tornar funcionalidade inacessível pela interface e causa inconsistência entre navegação e DOM.

**Tarefa sugerida**
- Alinhar UI e lógica de navegação de campanhas:
  - Opção A: adicionar item de menu e página `pg-campanhas` no `index.html`.
  - Opção B: remover/feature-flag os caminhos de `campanhas` em `js/main.js` até a tela existir.

**Critério de aceite**
- O usuário consegue acessar campanhas via UI **ou** o código não referencia mais uma página/menu inexistente.
- `exportarTudo()` não tenta exportar módulo indisponível.

**Referências**
- `js/main.js` (mapa de navegação `renderMap`, `exportCSV`, `exportarTudo`).
- `index.html` (ausência de `data-p="campanhas"` e `id="pg-campanhas"`).

---

## 3) Tarefa de ajuste de comentário/discrepância de documentação
**Problema identificado**
- A documentação do projeto está praticamente vazia (`README.md` só com o título), mas o código depende de Supabase e de múltiplos módulos (clientes, pedidos, estoque, cotação, campanhas). Isso dificulta onboarding e operação.

**Tarefa sugerida**
- Expandir o `README.md` com:
  - visão geral dos módulos;
  - instruções de execução local;
  - dependências externas (Supabase e planilhas via SheetJS);
  - checklist mínimo de configuração.

**Critério de aceite**
- Um desenvolvedor novo consegue subir a aplicação localmente sem ler o código fonte.
- README explicita claramente dependências e limitações.

**Referências**
- `README.md`.
- `js/api.js` (uso direto de URL/chave Supabase).

---

## 4) Tarefa para melhorar teste
**Problema identificado**
- Não existe suíte de testes automatizados no repositório (não há arquivos de teste nem configuração de runner), e há regras de negócio sensíveis em funções utilitárias.

**Tarefa sugerida**
- Criar testes unitários iniciais para regras puras de campanhas em `js/api.js`, cobrindo:
  - `montarMensagemCampanha()` (substituição de placeholders);
  - `getClientesElegiveisCampanhaAniversario()` (filtro por data/canal/opt-in);
  - casos de borda (campos ausentes, desconto 0, cupom vazio).

**Critério de aceite**
- Suíte de testes executa em CI/local com comando único.
- Cobertura mínima nas funções críticas de regra de negócio.

**Referências**
- `js/api.js` (funções de elegibilidade e montagem de mensagem).
- Estrutura atual do repositório (ausência de pasta/arquivos de teste).
