---
name: supabase-postgres-best-practices
description: Core standards for high-performance PostgreSQL query design, RLS policy optimization, and Supabase integration.
---

# Supabase & PostgreSQL Best Practices Skill

Use this skill when modifying database structures, writing SQL migrations, creating RLS policies, or integrating PostgREST requests inside the Sistema Comercial stack.

## 🔒 1. Row Level Security (RLS) Rules
All new tables MUST enable RLS immediately:
```sql
alter table public.name enable row level security;
```

* **Leitura Pública (anon)**: Apenas para dados estritamente necessários (ex: produtos ativos, filiais). Sempre use filtros explícitos como `is_active = true`.
* **Inserção Segura**: Visitantes anônimos podem inserir registros (ex: pedidos), mas as permissões de `SELECT`, `UPDATE` e `DELETE` devem ser bloqueadas para evitar vazamento de dados de terceiros.
* **Validação Transacional**: Use triggers e funções seguras (`security definer`) para validar permissões complexas e integridade lógica no lado do servidor.

## ⚡ 2. Performance & Otimização de Queries
* **Projeção de Colunas Estrita**: Nunca faça consultas genéricas (`select=*`) se puder especificar exatamente os campos necessários, economizando tráfego de rede e uso de banda do banco.
* **Self-Joins e Aliases**: Ao fazer queries com relacionamentos (ex: pai/filhos na mesma tabela), remova colunas não declaradas e certifique-se de que os campos referenciados existem no schema físico.
* **Indexação Recomendada**: Crie índices com filtros específicos (índices parciais) para status comuns:
  ```sql
  create index if not exists idx_produtos_active on produtos(is_active) where is_active = true;
  ```

## ⚠️ 3. Tratamento de Erros e Consistência
* Toda chamada REST do Supabase deve ser envelopada com validação de status HTTP `res.ok`.
* Caso ocorra erro HTTP `400` (Bad Request), verifique imediatamente se todas as colunas projetadas no parâmetro `select` existem fisicamente no banco de dados.
