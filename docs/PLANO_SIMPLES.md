# Plano do Sistema Comercial — versão enxuta

Última atualização: 04/05/2026
Para: 1 pessoa, 1 loja, sistema em produção, uso diário.

## Princípio único

Eu só mexo no sistema quando algo me atrapalha de atender cliente.
Se nada me atrapalha hoje, eu uso e sigo a vida.
Não tenho cronograma. Não tenho meta de "terminar".

## Regras pra qualquer mudança

1. Antes de pedir prompt à IA, respondo em voz alta:
   - Que cliente real sente diferença amanhã?
   - Eu pedi ou a IA sugeriu?
   - Se eu não fizer, alguma coisa quebra?
   Se as três não passam, não faço.

2. Uma mudança por vez. Termino e valido antes da próxima.

3. Sempre testo em produção antes de comemorar.

4. Limite de 2 horas por dia no projeto. Cronômetro. Quando bate, fecho.

## Fila de melhorias (em ordem)

### Curto — quando eu quiser, sem pressa

1. Botão "Novo produto" duplicado na tela de Produtos
   (mesmo padrão do Clientes que já consertei)
2. Datas em formato bruto ISO viram dd/mm/yyyy
3. Status técnicos viram texto humano (em_separacao → Em separação)
4. Trocar window.confirm por modal nas ações de Contas a Receber
5. PDV — refinar busca de produto e atalhos de teclado

### Médio — só quando os curtos estiverem prontos

6. Cobrança via WhatsApp click-to-send
7. Aplicar 04_rbac_v2_admin_only.sql em produção (só se adicionar segundo usuário)
8. Aplicar 05_rbac_auditoria_acessos.sql (mesma condição)

### Vou parar de me preocupar

- Migração legado → React. Funciona como está.
- "Padronizar todos os gráficos do sistema".
- Soft delete, normalização de pedido.itens, branch protection,
  CI strict, métricas de saúde, painel mensal, "ondas de limpeza".
- Documentos NORTE, BASELINE, STATUS_REAL, governança.

## Critério de parada definitivo

Quando alguém usar o sistema e disser "tá bom".
A partir desse dia, paro de evoluir e só uso.

## Quando voltar a IA

Trago uma dor concreta da loja em uma frase.
Não trago plano. Não trago documento. Não trago "vamos padronizar".
Uma frase, uma dor, uma correção.
