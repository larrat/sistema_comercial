# 4. Detalhamento de Backend e Persistência (Data & Logic)

Este capítulo detalha a camada de dados e as proteções de baixo nível que garantem a imutabilidade e a segurança das informações no **Nexus Industrial**.

---

## 4.1. Modelagem de Dados e Persistência Relacional

O sistema utiliza o **PostgreSQL** como motor de persistência. A modelagem é estritamente relacional, priorizando a integridade referencial.

*   **Integridade Referencial**: Uso rigoroso de *Foreign Keys* e *Constraints* (`CHECK`, `NOT NULL`, `UNIQUE`) para evitar estados órfãos ou dados inconsistentes.
*   **Hierarquia de Produtos**: Implementada através de tabelas vinculadas (`products` e `product_variants`). A lógica de exclusão é controlada por regras de `RESTRICT` em registros com dependências ativas (ex: não é possível excluir um produto que possui saldo em estoque ou pedidos vinculados).

---

## 4.2. Camada de Segurança: Row Level Security (RLS)

Diferente de arquiteturas tradicionais, a segurança no Nexus Industrial reside no banco de dados, não apenas na aplicação.

*   **Isolamento de Dados (Multitenancy)**: Cada tabela possui políticas de **RLS** ativas. Estas políticas validam o JWT (JSON Web Token) do usuário em cada operação.
    *   **Vendedores**: Conseguem ler apenas registros vinculados ao seu ID ou filial ativa.
    *   **Administradores**: Possuem permissões expandidas (`ALL`) via atribuição de Roles específicas no banco.
*   **Proteção contra Injeção**: A comunicação via APIs do Supabase utiliza parametrização total, eliminando vetores de ataque por **SQL Injection**.

---

## 4.3. Business Logic: Triggers e Lógica Interna

Lógicas críticas que não permitem falhas por erro de aplicação são movidas para a camada de banco de dados.

*   **Triggers de Auditoria Financeira**: Alterações em tabelas sensíveis (pedidos, pagamentos, estoque) disparam gatilhos automáticos que registram o estado anterior (`OLD`) e o novo estado (`NEW`) em uma tabela imutável de `logs_auditoria`.
*   **Sincronização de Saldo**: Triggers garantem que a conclusão de uma Ordem de Compra ou de um Pedido de Venda atualize o saldo de estoque de forma atômica, evitando *race conditions*.

---

## 4.4. Integrações via Edge Functions

Para tarefas que exigem processamento externo ou isolamento de segredos (secrets), o sistema utiliza **Supabase Edge Functions**.

*   **Tecnologia**: Escritas em **TypeScript** e executadas em ambiente **Deno**.
*   **Casos de Uso**:
    *   Integração com Gateways de Pagamento (Webhooks).
    *   Disparo de comunicações transacionais via CRM (WhatsApp/E-mail).
    *   Processamento pesado de relatórios analíticos em segundo plano.
