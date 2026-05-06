# Plano Operacional — Padronização de Pedidos

> **Para quem:** IA executora (Claude Code, Cursor, ou equivalente).
> **Operador humano:** revisa ao final de cada fase. Nada avança sem aprovação explícita.
> **Horizonte:** ~10 semanas, em 6 fases.
> **Referência de padrão:** `src/react` — Clientes (`/app/clientes`) e Produtos (`/app/produtos`).

---

## 0. Regras absolutas (válidas em toda a execução)

Estas regras valem do início ao fim. Se qualquer instrução de fase parecer entrar em conflito com elas, **a IA executora deve parar e perguntar**, não decidir sozinha.

### 0.1 Não regredir o que já funciona

São consideradas áreas estáveis e **não podem ter comportamento, layout ou contrato alterado** durante este plano, exceto quando a fase explicitamente autorizar:

- **Clientes** (`/app/clientes`, `/app/clientes/:clienteId`) — referência de padrão.
- **Produtos** (`/app/produtos`, `/app/produtos/:produtoId`) — referência de padrão.
- **Estoque** (`/app/estoque`).
- **Contas a Receber** (`/app/receber`).
- **PDV** (`/app/pdv`) — só é tocado na Fase 5, e ainda assim em modo aditivo.
- **Dashboard** (`/app/dashboard`).
- **Login / Setup / Filiais**.

"Não regredir" significa, no mínimo:

1. Mesmo comportamento funcional observável (mesmos campos, mesmas ações, mesmos resultados).
2. Mesmo layout visual nas telas referência (Clientes e Produtos não mudam pra "ficar parecido com Pedidos novo" — é o contrário).
3. Mesmas RPCs, com mesmas assinaturas. Se uma RPC precisa evoluir, é versão nova, não substituição.
4. Nenhum import compartilhado de `shared/` é renomeado, removido ou tem assinatura alterada sem aviso explícito.

### 0.2 Não inventar padrão novo

Toda decisão visual, de componente ou de estrutura de arquivo deve **espelhar o que já existe em Clientes ou Produtos**. Se não existe lá, a IA executora **não cria padrão novo nesta tarefa** — ela registra a divergência num "Pendências de padrão" e segue com a opção mais próxima do que já existe.

### 0.3 Não misturar fases

Cada fase tem escopo fechado. Se a IA executora identificar uma melhoria fora do escopo da fase atual, ela **registra em `PENDENCIAS.md`** e segue. Não faz "de brinde".

### 0.4 Não tocar em SQL fora da Fase 4

Fases 0 a 3 e Fase 5 são frontend e service-layer. Migração de schema só na Fase 4. Se outra fase parecer precisar de SQL, é sinal de escopo errado — parar e perguntar.

### 0.5 Não tocar em PDV fora da Fase 5

Mesmo que pareça "só um detalhinho". PDV é intocável até a Fase 5.

### 0.6 Saída esperada de cada fase

Toda fase termina com:

1. Código aplicado.
2. Um arquivo `docs/status/FASE_<n>_RELATORIO.md` curto (até 1 página) com: o que foi feito, o que **não** foi feito e por quê, lista de arquivos alterados, pendências geradas.
3. Lista de pontos para o humano verificar (em linguagem clara, sem comandos).
4. Pausa. **Não inicia a próxima fase.**

---

## Fase 0 — Diagnóstico e baseline (Semana 1)

**Objetivo:** Ter inventário antes de mexer em uma linha de código de produto.

### O que fazer

1. Listar todos os arquivos sob `src/react` que pertencem ao módulo Pedidos (lista, detalhe, formulário, modais, hooks, services, types).
2. Para cada arquivo, identificar:
   - Componentes locais que duplicam algo já existente em `shared/`.
   - Imports de `modal-shell-*` ou modais ad-hoc.
   - Trechos com regra de negócio dentro de componente de tela (validação, cálculo, formatação financeira).
3. Listar todas as queries/RPCs usadas pelo módulo Pedidos. Marcar quais tocam o campo agregado `pedido.itens`.
4. Comparar visualmente (descritivamente, em texto) lista de Pedidos atual com lista de Clientes e lista de Produtos. Apontar as 5 maiores divergências.
5. Capturar o estado atual de tipagem do módulo (quantos erros, onde) — só pra ter base de comparação nas fases seguintes.

### O que **não** fazer nesta fase

- Não alterar nenhum arquivo de produto.
- Não criar componentes novos.
- Não tocar em SQL.

### Entregável

Arquivo `docs/status/INVENTARIO_PEDIDOS.md` com:

- Tabela de arquivos do módulo.
- Tabela de duplicações com `shared/`.
- Lista de RPCs e quais tocam `pedido.itens`.
- Top 5 divergências em relação a Clientes/Produtos, ordenadas por impacto visual.
- Baseline de tipagem (números, não correções).

### Pontos para o humano verificar no fim da Fase 0

- O inventário cobre tudo que você lembra que existe em Pedidos?
- As 5 divergências apontadas batem com sua percepção de uso real?
- Falta alguma RPC crítica na lista?

---

## Fase 1 — Lista de Pedidos no padrão (Semanas 2–3)

**Objetivo:** A tela `/app/pedidos` (lista) ficar visualmente irmã de `/app/clientes` e `/app/produtos`, sem mudar nada de detalhe ou de PDV ainda.

### O que fazer

1. Substituir o cabeçalho da lista por `PageHeader` no padrão de Clientes/Produtos.
2. Migrar a tabela atual para o `DataTable` compartilhado, replicando o conjunto de recursos visto em Produtos: ordenação, paginação, estados de loading/vazio.
3. Padronizar a barra de filtros (status, período, vendedor, cliente) usando os controles compartilhados. Se um filtro específico de Pedidos não existir no compartilhado, **estender o componente compartilhado** uma vez, com cuidado, em vez de recriar local.
4. Adicionar `StatCard`s de topo equivalentes aos de Produtos. Sugestão de métricas (a confirmar com o humano se houver dúvida): total do mês, ticket médio, em aberto.
5. Ação primária única no header (ex.: "Novo pedido"). Botões redundantes saem.
6. Manter o clique numa linha abrindo o detalhe **antigo** ainda — a página nova de detalhe é Fase 2.

### O que **não** fazer nesta fase

- Não criar `/app/pedidos/:pedidoId`.
- Não mexer em formulário de criação/edição de pedido.
- Não mexer em modais.
- Não mexer em PDV.
- Não mexer em SQL.

### Trava de não-regressão

- Clientes, Produtos, Estoque, Receber e PDV continuam idênticos.
- Componentes `shared/` que foram estendidos: se alteração quebrar uso em outro módulo, reverter e registrar como pendência.
- Nenhum `shared/` renomeado.

### Entregável

- Código da Fase 1 aplicado.
- `docs/status/FASE_1_RELATORIO.md`.

### Pontos para o humano verificar no fim da Fase 1

- Lista de Pedidos parece "da mesma família" que lista de Clientes e Produtos?
- Filtros funcionam pelo menos tão bem quanto antes?
- Clientes, Produtos, Estoque, Receber e PDV estão visualmente e funcionalmente intactos?

---

## Fase 2 — Detalhe de Pedido em página própria (Semanas 4–5)

**Objetivo:** Existir `/app/pedidos/:pedidoId` no padrão `/app/clientes/:clienteId`, mostrando o pedido completo. Ainda **só leitura rica + ações já existentes**, sem reescrever formulário.

### O que fazer

1. Criar rota `/app/pedidos/:pedidoId` espelhando a estrutura de `/app/clientes/:clienteId`.
2. Implementar abas: **Itens**, **Pagamento**, **Entrega/Logística**, **Histórico**, **Cadastro**.
3. Reaproveitar componentes de cabeçalho/perfil do padrão Clientes.
4. Adicionar drawer de detalhe rápido na lista (igual ao de Clientes), com link "Abrir página completa".
5. Ações já existentes (cancelar, editar, etc.) continuam funcionando como antes — ainda chamando os modais antigos. Modais entram na Fase 3.
6. Para dados que não existem hoje (ex.: alguma informação de pagamento ou histórico), exibir "—". **Não inventar dado, não preencher de mock.** Registrar a falta em `PENDENCIAS.md`.

### O que **não** fazer

- Não reescrever formulário de pedido.
- Não trocar modais.
- Não mexer em SQL.
- Não mexer em PDV.

### Trava de não-regressão

- Página de detalhe nova mostra **exatamente** os mesmos dados que a tela antiga mostrava. Nada a mais inventado, nada a menos.
- Detalhe de Cliente continua idêntico.
- Detalhe de Produto continua idêntico.

### Entregável

- Código da Fase 2 aplicado.
- `docs/status/FASE_2_RELATORIO.md`.
- `PENDENCIAS.md` atualizado com dados que apareceram como "—".

### Pontos para o humano verificar

- Abrir 5 pedidos diferentes (com características diferentes: à vista, prazo, com desconto, cancelado, parcelado) e conferir paridade total com a tela antiga.
- Drawer de detalhe rápido está coerente com o de Clientes?
- Nenhuma informação importante virou "—" sem aviso?

---

## Fase 3 — Formulários e modais padronizados (Semanas 6–7)

**Objetivo:** Eliminar `modal-shell-*` em Pedidos e padronizar formulário de criação/edição. Aqui regras de negócio saem do componente de tela.

### O que fazer

1. Mapear todos os modais locais de Pedidos (cancelar, aplicar desconto, alterar vendedor, estornar, etc.).
2. Migrar cada um para o `Modal` compartilhado, com confirmação dupla onde houver impacto financeiro (mesmo padrão usado em Contas a Receber).
3. Padronizar formulário de criação/edição de pedido seguindo o formato de cadastro de Cliente/Produto: seções claras, validação local, feedback de salvamento.
4. Mover regras de validação e cálculo (desconto, frete, totalização) para hooks/services dedicados. **Não alterar a regra**, apenas mudar onde ela mora.
5. Garantir que confirmações de ações destrutivas usam o mesmo padrão do Receber.

### O que **não** fazer

- Não mudar **nenhuma** regra de negócio. Se uma regra parece errada, registra em `PENDENCIAS.md` e mantém o comportamento atual.
- Não tocar em SQL.
- Não tocar em PDV.

### Trava de não-regressão

- Para cada regra movida (desconto, frete, total): comportamento de antes e de depois deve ser idêntico em casos de teste manual definidos pelo humano.
- Receber continua intocado, mesmo que compartilhe pedaços de UI.
- Nenhum `modal-shell-*` deve restar em arquivos do módulo Pedidos.

### Entregável

- Código da Fase 3 aplicado.
- `docs/status/FASE_3_RELATORIO.md` listando: cada modal migrado (de → para), cada regra movida (arquivo origem → arquivo destino).

### Pontos para o humano verificar

- Criar, editar e cancelar pedido funcionam como antes?
- Desconto e frete batem com o que batiam antes em alguns casos reais?
- Confirmação dupla aparece para ações destrutivas?
- Receber continua igual?

---

## Fase 4 — Normalização de `pedido.itens` (Semana 8)

**Objetivo:** Existir tabela normalizada de itens de pedido, populada por backfill, lida em paralelo ao agregado, **sem remover o agregado**.

> Esta é a fase de maior risco. Se houver qualquer dúvida em qualquer passo, a IA executora deve **parar e perguntar**.

### O que fazer

1. Criar/ajustar tabela `pedido_itens` com FK para `pedidos` e `produtos`. Seguir a convenção de numeração de SQL do projeto (ver tabela em `docs/status/STATUS_GERAL_2026-05-06.md`).
2. Escrever script SQL **idempotente** que popule a nova tabela a partir do agregado existente.
3. Atualizar leitura no frontend (lista, detalhe, relatórios) para usar a tabela normalizada **com fallback** para o agregado quando a tabela ainda não tiver dados de um pedido específico.
4. **Manter o campo agregado**. Apenas marcar como deprecated nos comentários do código que escreve nele.
5. Não alterar PDV ainda (PDV continua gravando como sempre gravou).

### Validação cruzada obrigatória antes de declarar a fase concluída

Para uma amostra representativa de pedidos (mínimo: 50, cobrindo pedidos antigos, recentes, cancelados, parcelados):

- Total do pedido via soma da nova tabela = total registrado no pedido.
- Soma de "em aberto" por cliente em Receber: idêntica antes e depois.
- Movimentações de estoque por pedido: idênticas antes e depois.

Se qualquer item dessa lista falhar em qualquer pedido da amostra, a fase **não está concluída**. Reverter leitura para 100% agregado e reportar.

### Trava de não-regressão

- Receber continua com os mesmos saldos.
- Estoque continua com a mesma posição.
- PDV continua gravando exatamente como antes.
- Tela de Pedidos continua mostrando os mesmos dados (origem da leitura mudou, conteúdo não).

### Entregável

- SQL aplicado em homologação (não em produção nesta fase).
- Código de leitura com fallback.
- `docs/status/FASE_4_RELATORIO.md` com a tabela de validação cruzada (antes/depois) da amostra.

### Pontos para o humano verificar

- Resultados da validação cruzada batem em 100% da amostra?
- Você consegue confirmar que o ambiente de homologação tem dados suficientemente parecidos com produção pra essa validação ter valor?
- Está confortável com a decisão de manter o agregado por mais tempo?

---

## Fase 5 — Integração com PDV e estabilização (Semanas 9–10)

**Objetivo:** PDV passa a gravar **também** na tabela normalizada, em modo aditivo, controlado por flag. Nada visível pro operador da loja.

### O que fazer

1. PDV grava itens **em ambos**: agregado (como hoje) e tabela normalizada (novo). Controlado por feature flag, ligada por padrão **em homologação**, desligada em produção até o humano autorizar.
2. Tela de comprovante e fluxo de pagamento: **idênticos**. Nenhuma mudança visível pro operador.
3. Hardening do módulo Pedidos: revisar estados de erro, mensagens padronizadas, telemetria mínima de falhas (se já existir padrão no projeto).
4. Ajustar relatórios que tocavam `pedido.itens` agregado para preferir a tabela normalizada quando disponível (fallback continua).
5. Atualizar `docs/status/STATUS_GERAL_2026-05-06.md` (ou substituto) removendo Pedidos da lista de dívidas visuais e incluindo Pedidos junto com Clientes/Produtos como referência.

### Trava de não-regressão

- PDV não muda visualmente. Operador não percebe nada.
- Comprovante de venda idêntico.
- Movimentação de estoque ao fechar venda: idêntica.
- Geração de Receber ao fechar venda: idêntica.
- Tempo de fechamento de venda no PDV: não pode piorar de forma perceptível.

### Entregável

- Código da Fase 5 aplicado, com flag desligada em produção.
- `docs/status/FASE_5_RELATORIO.md`.
- Documentação de status atualizada.

### Pontos para o humano verificar

- Em homologação: fechar 10+ vendas reais simuladas e conferir que aparecem corretamente em ambas as fontes.
- Operador da loja, ao usar produção, percebe **alguma** diferença? (resposta esperada: não.)
- Receber e Estoque continuam batendo após vendas novas?
- Documentação de status reflete a realidade?

---

## Anexos operacionais

### A. Sobre `PENDENCIAS.md`

Arquivo único, mantido em `docs/status/PENDENCIAS.md`. Toda vez que a IA executora encontrar algo fora do escopo da fase atual mas que mereça atenção, registra ali com:

- Data.
- Fase em que foi encontrado.
- Descrição curta.
- Por que está fora do escopo atual.

Não é TODO de longo prazo. É registro de coisas que apareceram e foram conscientemente deixadas pra depois.

### B. O que fazer quando travar

Se a IA executora encontrar:

- Conflito entre instruções desta fase e regras absolutas (seção 0).
- Necessidade de mexer em área proibida pela fase.
- Dado faltando que parece importante pra decidir.
- Comportamento atual do sistema que parece bug, não feature.

Ela **para, registra a dúvida em `PENDENCIAS.md` e pergunta ao humano**. Não decide sozinha.

### C. Ordem de revisão do humano ao final de cada fase

1. Ler o relatório da fase.
2. Conferir os "pontos para o humano verificar" listados na fase.
3. Verificar pessoalmente as áreas marcadas como não-regressão.
4. Aprovar (segue pra próxima) ou reprovar (IA executora corrige antes de seguir).

Sem essa aprovação explícita, a próxima fase **não inicia**.

---

_Última atualização: 2026-05-06._
