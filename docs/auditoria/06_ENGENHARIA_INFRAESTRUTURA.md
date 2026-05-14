# 6. Engenharia e Infraestrutura (DevOps & Reliability)

Este capítulo descreve os processos de automação, garantia de qualidade e resiliência que sustentam a operação contínua do **Nexus Industrial**.

---

## 6.1. Pipeline de CI/CD (GitHub Actions & Vercel)

O sistema adota uma estratégia de **Continuous Integration (CI)** e **Continuous Deployment (CD)** para garantir que cada atualização seja segura.

*   **Automação (GitHub Actions)**: Todo código enviado ao repositório dispara o workflow `ci.yml`, que executa:
    *   **Prettier & ESLint**: Garantia de padronização de código.
    *   **TypeScript Strict Check**: Bloqueio de builds com inconsistências de tipo.
    *   **Cobertura de Testes**: Validação de lógica de negócio em módulos críticos (ex: Clientes).
*   **Deployment (Vercel)**: 
    *   **Preview Environments**: Cada Pull Request gera um ambiente de homologação isolado para validação manual.
    *   **Production**: O deploy em produção é automático após o merge na branch `main`, condicionado ao sucesso de todos os testes do pipeline.

---

## 6.2. Estratégia de Testes e Qualidade (Testing Suite)

Para cumprir o SLA de disponibilidade e integridade, o sistema utiliza uma pirâmide de testes:

*   **Testes E2E (Playwright)**: Testes automatizados que simulam a jornada do usuário (Login, Cadastro, Venda). Localizados em `tests/`, garantem que o "core" do sistema não sofra regressões.
*   **Testes Unitários e Integração**: Focados na camada de hooks e stores (Zustand/TanStack Query), garantindo que a lógica de cálculo (ex: Markup) esteja correta.
*   **Type Safety**: O uso de TypeScript 5+ com checagem estrita elimina classes inteiras de bugs de referência em tempo de execução.

---

## 6.3. Observabilidade e Monitoramento (Logs & Audit)

O monitoramento da saúde do sistema é distribuído entre as camadas de infraestrutura:

*   **Logs de Runtime (Vercel)**: Monitoramento em tempo real de erros de renderização e performance do frontend.
*   **Logs de API e DB (Supabase)**: Rastreamento de latência de queries e falhas de autenticação.
*   **Trilha de Auditoria Imutável**: Conforme detalhado no Módulo 4, o banco de dados possui triggers de auditoria financeira. Isso permite reconstruir qualquer transação sensível a partir dos logs de banco, atendendo a requisitos rigorosos de *compliance*.

---

## 6.4. Resiliência e Recuperação (Disaster Recovery)

*   **Backups de Banco**: O Supabase realiza backups diários automáticos com política de retenção.
*   **Point-in-Time Recovery (PITR)**: Capacidade de restaurar o banco de dados para um estado específico em caso de corrupção catastrófica de dados.
*   **Imutabilidade do Frontend**: Cada deploy na Vercel gera um *snapshot* imutável, permitindo o **Rollback Instantâneo** para uma versão anterior estável em caso de falha crítica na produção.
