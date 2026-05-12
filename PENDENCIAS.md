# Pendências de Implementação — Novo Cadastro de Cliente

Este documento registra divergências entre a especificação técnica/mockup e o schema atual do banco de dados (Supabase).

## Campos omitidos por ausência no Schema

Conforme a Regra Absoluta nº 5, os seguintes campos foram omitidos da implementação inicial para evitar erros de persistência:

1. **Endereço Detalhado:**
   - `CEP`
   - `Logradouro`
   - `Número / Complemento`
   - _Nota: Atualmente o sistema possui apenas `cidade` e `estado`._

2. **Comercial:**
   - `Limite de crédito`

3. **Responsável / Comprador:**
   - Na especificação, foi solicitado um `select` com usuários da filial. Como o módulo de Acessos/Usuários está "Em implantação", mantivemos este campo como `input` de texto livre para não bloquear o cadastro.

## Ajustes de Mapeamento

- **Aceita WhatsApp:** Mapeado para o campo `optin_sms`.
- **Aceita e-mail marketing:** Mapeado para o campo `optin_email`.
- **Participa de campanhas:** Mapeado para o campo `optin_marketing`.
- **Data de aniversário:** O mockup solicita `DD / MM`, mas o schema atual utiliza uma string (provavelmente `YYYY-MM-DD`). Implementamos o seletor de data completo para garantir compatibilidade.

---

_Gerado automaticamente durante a modernização da interface - 2026-05-12_
