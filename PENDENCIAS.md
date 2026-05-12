# Pendências de Implementação — Novo Cadastro de Cliente

Este documento registra divergências entre a especificação técnica/mockup e o schema atual do banco de dados (Supabase).

## Campos omitidos por ausência no Schema

Conforme a Regra Absoluta nº 5, os seguintes campos foram omitidos da implementação inicial para evitar erros de persistência:

1. **Endereço Detalhado:**
   - `CEP`
   - `Logradouro`
   - `Número / Complemento`
   - _Nota: Atualmente o sistema possui apenas `cidade` e `estado`._

2. **Comercial (Clientes):**
   - `Limite de crédito`

3. **Responsável / Comprador (Clientes):**
   - Na especificação, foi solicitado um `select` com usuários da filial. Como o módulo de Acessos/Usuários está "Em implantação", mantivemos este campo como `input` de texto livre para não bloquear o cadastro.

## Detalhe de Pedido (Modernização)

1. **Edição de Custo:**
   - O mockup solicita que o campo "Custo" seja editável inline na tabela de itens. No entanto, a RPC atual (`pedido_item_atualizar`) aceita apenas `quantidade` e `preco_unitario`. O campo "Custo" foi mantido como **somente leitura** para evitar inconsistências.

## Ajustes de Mapeamento

- **Aceita WhatsApp:** Mapeado para o campo `optin_sms`.
- **Aceita e-mail marketing:** Mapeado para o campo `optin_email`.
- **Participa de campanhas:** Mapeado para o campo `optin_marketing`.
- **Data de aniversário:** O mockup solicita `DD / MM`, mas o schema atual utiliza uma string (provavelmente `YYYY-MM-DD`). Implementamos o seletor de data completo para garantir compatibilidade.

---

_Gerado automaticamente durante a modernização da interface - 2026-05-12_
