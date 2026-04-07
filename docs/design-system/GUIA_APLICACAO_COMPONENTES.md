# Guia de Aplicação de Componentes

Data: 2026-04-07

## Quando usar e quando não usar

## Button
- Usar: disparar ação explícita.
- Não usar: como etiqueta/status.

## Input e Select
- Usar Input: dado livre.
- Usar Select: opção restrita pré-definida.
- Não usar Input para lista fixa de escolhas.

## Modal
- Usar: tarefas com confirmação e contexto isolado.
- Não usar: navegação principal entre páginas.

## Card vs Tabela
- Usar Tabela: comparação lado a lado (desktop).
- Usar Mobile Card: consumo em tela pequena.
- Não usar Tabela no mobile sem alternativa em card.

## Toast
- Usar: confirmação rápida e erro com próximo passo.
- Não usar: conteúdo longo ou documentação.

## Badge
- Usar: classificação rápida (status/prioridade).
- Não usar: botões disfarçados.

## Padrão de feedback obrigatório

- `success`: ação concluída.
- `warning`: atenção com continuidade possível.
- `error`: bloqueio + impacto + ação recomendada.
- `info`: contexto sem bloqueio.

## Exemplo de aplicação por fluxo

- Cadastro cliente:
  - Campo obrigatório ausente: `warning` + foco no campo.
  - Falha ao salvar: `error` com impacto e recuperação.
  - Sucesso ao salvar: `success` curto e claro.

- Campanha:
  - Sem elegíveis: `info` com diagnóstico resumido.
  - Falha de persistência: `error` com ação no Supabase.

## Regras de implementação

1. Sempre começar por componente existente.
2. Só criar novo componente com aprovação de governança.
3. Evitar inline style para cor, tipografia e spacing.
4. Validar desktop + mobile antes de merge.
