# Prioridade de Implementação por Impacto

Data: 2026-04-07

## Matriz impacto x esforço

## Prioridade P1 (alto impacto, baixo/médio esforço)
1. Cliente: introduzir modo "Cadastro rápido" (nome + contato + status).
2. Pedido: separar visualmente em blocos sequenciais dentro do modal atual.
3. Campanha: adicionar prévia de elegibilidade antes do CTA final.

Impacto esperado:
- Redução de abandono em modal.
- Menos erros de operação no primeiro uso.
- Ganho de velocidade para usuário recorrente.

## Prioridade P2 (alto impacto, médio esforço)
1. Campanha: CTA único `Salvar e gerar fila` com fallback claro.
2. Pedido: melhorar seleção de cliente (menos texto livre, mais correspondência segura).
3. Cliente: mover resumo para modo condicional (só quando necessário).

Impacto esperado:
- Menor retrabalho entre salvar e executar ação.
- Melhor previsibilidade operacional.

## Prioridade P3 (médio impacto, médio/alto esforço)
1. Campos avançados colapsáveis por perfil de uso (novo vs recorrente).
2. Telemetria de funil por etapa (abertura > avanço > conclusão por fluxo).
3. Testes A/B de ordem de campos em Cliente e Pedido.

Impacto esperado:
- Otimização contínua orientada por dados.

## Plano de validação com usuários (recorrentes e novos)

### Sessão 1 - Recorrentes (30 min)
- 3 tarefas: cadastrar cliente, criar pedido, criar campanha e gerar fila.
- Métricas:
  - tempo por tarefa,
  - número de cliques,
  - erros por tarefa,
  - percepção de clareza (nota 1-5).

### Sessão 2 - Novos usuários (30 min)
- Mesmas tarefas sem treinamento prévio.
- Métricas:
  - tempo até primeira ação correta,
  - pontos de bloqueio,
  - necessidade de ajuda externa.

### Critério de sucesso inicial
- Reduzir tempo médio de execução em 20%.
- Reduzir erros operacionais em 30%.
- Atingir nota >= 4/5 em clareza de fluxo.
