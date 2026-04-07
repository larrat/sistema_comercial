# Mapa AS-IS e TO-BE - Fluxos Críticos

Data: 2026-04-07
Escopo: Cliente, Campanha, Pedido

## 1) Fluxo Cliente

### AS-IS (atual)
- Entrada: `Clientes` > `+ Novo cliente`.
- Modal em 4 etapas (`Dados`, `Comercial`, `Marketing`, `Resumo`).
- Campo obrigatório real para salvar: `Nome`.
- Vários campos opcionais com densidade alta no meio do fluxo (doc, tipo, status, responsável, segmento, tabela, prazo, cidade/estado, observação, opt-ins, times).
- Validação de consistência (opt-in sem canal) aparece no resumo, não bloqueia claramente a decisão no momento certo.

Fricções:
- Excesso de campos antes do valor principal.
- Etapas com baixa distinção de prioridade.
- Decisões comerciais e marketing misturadas para usuário novo.

### TO-BE (proposto)
- Etapa 1 (essencial): Nome, WhatsApp/Telefone, Status.
- Etapa 2 (comercial): Tabela, Prazo, Segmento.
- Etapa 3 (marketing): Opt-ins + aniversário + times.
- Resumo opcional apenas para edições complexas (não obrigatório em cadastro rápido).

Ganho esperado:
- Menos carga cognitiva inicial.
- Cadastro rápido completo em <= 60s para operação recorrente.

## 2) Fluxo Campanha

### AS-IS (atual)
- Entrada: `Campanhas` > `+ Nova campanha`.
- Modal único com campos de configuração e texto.
- Ação operacional principal acontece depois, no botão `Gerar fila` na lista.
- Fluxo tem forte dependência de condições dos clientes (opt-ins, canais, data aniversário), gerando “sem elegíveis”.

Fricções:
- Momento de diagnóstico vem tarde (após salvar e tentar gerar fila).
- Campos de oferta (`cupom`, `desconto`) não guiam claramente quando são obrigatórios para objetivo da campanha.
- Usuário novo pode não entender por que não há elegíveis.

### TO-BE (proposto)
- Wizard curto em 3 passos:
  1. Objetivo e canal (aniversário + WhatsApp/e-mail/sms)
  2. Oferta e mensagem
  3. Prévia de elegibilidade antes de salvar (`x clientes aptos`, `y sem canal`, `z fora da janela`)
- Salvar + CTA imediato: `Salvar e gerar fila agora`.

Ganho esperado:
- Redução de tentativa e erro.
- Melhor previsibilidade da geração de fila.

## 3) Fluxo Pedido

### AS-IS (atual)
- Entrada: `Pedidos` > `+ Novo pedido`.
- Modal único com cabeçalho do pedido + bloco de itens.
- Ação de item é separada (`+ Adicionar item`) e depois salvar pedido.
- Validações mínimas: cliente obrigatório, pelo menos um item.

Fricções:
- Duas zonas de decisão no mesmo modal (dados do pedido e montagem de item) competem visualmente.
- Sem “caminho guiado” para usuário novo (ordem mental não explícita).
- Campo cliente em texto livre (datalist) pode gerar erro de digitação/cliente inexistente.

### TO-BE (proposto)
- Fluxo em 3 blocos visuais sequenciais (sem trocar de modal):
  1. Cabeçalho (cliente/data/status)
  2. Itens (adicionar, revisar, editar)
  3. Fechamento (pagamento/prazo/observação + total + salvar)
- CTA contextual em cada bloco (`Continuar para itens`, `Revisar total`, `Salvar pedido`).
- Cliente com seleção assistida mais rígida (evitar nome livre quando possível).

Ganho esperado:
- Menos ambiguidade e retrabalho de item.
- Melhor taxa de conclusão em primeiro intento.

## 4) Síntese de problemas transversais (AS-IS)
- Densidade de campo acima da necessidade no primeiro contato.
- Feedback já melhorou, mas decisões continuam espalhadas em momentos diferentes do fluxo.
- Resumo existe, porém em alguns casos deveria virar “checkpoint opcional” e não etapa obrigatória.

## 5) Princípios TO-BE únicos para os 3 fluxos
- Primeiro passo sempre com campos mínimos de conclusão.
- Diagnóstico antecipado (antes de salvar quando possível).
- Ação primária explícita em cada etapa.
- Opções avançadas em bloco secundário/expansível.
