# Feedback e Erros - Padrão V1

Data: 2026-04-07

## 1) Biblioteca de mensagens

Fonte única:
- `core/messages.js`

Estrutura:
- `SEVERITY`: `success`, `warning`, `error`, `info`
- `guidedMessage({ what, impact, next })`: formato padrão para erros e alertas
- `MSG`: catálogo por domínio (`forms`, `campanhas`, `jogos`)

Princípio obrigatório para erro:
- O que aconteceu
- Impacto
- O que fazer agora

Exemplo:
- `Erro: falha ao salvar campanha (...) Impacto: ... Ação: ...`

## 2) Padrão de severidade

Implementado no toast global:
- `core/utils.js` -> `notify(message, severity)`
- `css/style.css` -> classes:
  - `#toast.toast-success`
  - `#toast.toast-warning`
  - `#toast.toast-error`
  - `#toast.toast-info`

Comportamentos:
- Severidade aplicada via classe CSS e evento `sc:toast`.
- Toast com largura adaptativa e quebra de linha para mensagens guiadas.

## 3) Fluxos críticos revisados

### Campanhas
Arquivo: `modules/campanhas.js`

Aplicado:
- Validação de campos obrigatórios com mensagem guiada + foco no campo.
- Erros de persistência com impacto e ação recomendada.
- Resultado de geração de fila com severidade dinâmica (sucesso/atenção).
- Falha de WhatsApp sem destino com orientação de recuperação.

### Agenda de jogos / sincronização
Arquivo: `modules/dashboard.js`

Aplicado:
- Falta de filial/URL tratada com mensagem guiada.
- Erro de API externa com impacto e próximo passo.
- Resultado de sincronização com severidade por falhas.
- Formulário de jogo com foco no campo pendente.

### Formulários críticos de cadastro
Arquivos:
- `modules/clientes.js`
- `modules/pedidos.js`
- `modules/produtos.js`

Aplicado:
- Campos obrigatórios com mensagem guiada e foco.
- Erro de persistência com orientação clara.
- Sucesso padronizado com severidade `success`.

## 4) Governança de uso

Regra prática:
1. Para validação: `notify(..., warning)`
2. Para falha operacional: `notify(..., error)`
3. Para confirmação: `notify(..., success)`
4. Para contexto sem bloqueio: `notify(..., info)`

Evitar:
- mensagens genéricas tipo `Erro: ...` sem impacto e ação
- textos longos sem orientação prática
