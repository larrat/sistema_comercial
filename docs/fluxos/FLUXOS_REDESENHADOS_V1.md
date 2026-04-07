# Fluxos Redesenhados (V1)

Data: 2026-04-07

## Cliente (novo padrão)

### Caminho rápido (padrão)
1. Nome
2. Contato principal (WhatsApp ou telefone)
3. Status
4. Salvar cliente

### Caminho completo (opcional)
- Comercial: tabela, prazo, segmento
- Marketing: aniversário, opt-ins, times
- Observações

Regras:
- Mostrar aviso contextual se opt-in for marcado sem canal.
- Resumo final apenas quando houver inconsistência relevante.

## Campanha (novo padrão)

### Passo 1 - Configuração
- Nome
- Canal
- Dias de antecedência
- Ativa/inativa

### Passo 2 - Oferta e mensagem
- Cupom/desconto
- Assunto
- Mensagem com variáveis

### Passo 3 - Prévia operacional
- Elegíveis totais
- Sem canal
- Fora da janela
- CTA: `Salvar e gerar fila`

Regras:
- Se elegíveis = 0, orientar ajuste de antecedência/canal antes de salvar.
- Exibir impacto operacional previsto antes da ação final.

## Pedido (novo padrão)

### Etapa A - Contexto
- Cliente (seleção assistida)
- Data
- Status

### Etapa B - Itens
- Adicionar item
- Editar/remover item
- Subtotal em tempo real

### Etapa C - Fechamento
- Pagamento
- Prazo
- Observação
- Total final + salvar

Regras:
- Não permitir salvar sem cliente válido e sem item.
- Quando item é removido e total zera, destacar ação para adicionar item novamente.

## Diretriz de UX para implementação
- Sempre 1 CTA primário por bloco.
- Campos avançados com colapso/expansão.
- Mensagens de erro com ação imediata no próprio contexto.
