# 3. Arquitetura de Software (High-Level Architecture)

Este capítulo descreve a fundação tecnológica e os padrões de engenharia que garantem a escalabilidade, segurança e performance do sistema **Nexus Industrial**.

---

## 3.1. Visão Geral da Stack

O sistema utiliza o paradigma de **Serverless Architecture**, com uma separação rigorosa entre cliente e provedor de serviços.

*   **Frontend Core**: Baseado em **React 19** com build via **Vite**. Esta escolha provê um ambiente de desenvolvimento com HMR instantâneo e uma entrega final otimizada para navegadores modernos.
*   **Backend-as-a-Service (BaaS)**: O **Supabase** atua como a camada de infraestrutura, expondo APIs RESTful automáticas via **PostgREST** diretamente sobre o banco de dados.
*   **Gestão de Estado & Sincronização**:
    *   **Zustand**: Responsável pelo estado volátil da interface (UI).
    *   **TanStack Query**: Gerencia o cache de servidor e a sincronização assíncrona, garantindo integridade de dados (estoque/pedidos) sem latência perceptível.

---

## 3.2. Estratégia de Modularidade (Feature-Based Architecture)

O projeto adota a **Arquitetura Baseada em Features** para evitar o crescimento desordenado do código.

*   **Encapsulamento**: Cada diretório em `src/react/features/` (ex: `/pedidos`, `/estoque`, `/clientes`) é autossuficiente, contendo seus próprios componentes, hooks de dados e tipos TypeScript.
*   **Isolamento de Riscos**: Alterações em módulos periféricos (ex: CRM) não afetam a lógica de core business (ex: Precificação), reduzindo o raio de impacto de bugs e facilitando auditorias pontuais.

---

## 3.3. Fluxo de Dados e Segurança de Comunicação

O fluxo de informação segue uma trilha de segurança imutável:

1.  **Request**: O cliente inicia uma chamada via TanStack Query.
2.  **Auth Interceptor**: O token de autenticação (**JWT**) é anexado automaticamente à requisição.
3.  **Database Layer (RLS)**: O PostgreSQL intercepta a chamada. Antes da execução da query, o **Row Level Security (RLS)** valida se o usuário possui permissão para ler ou escrever naquele registro específico.
4.  **Response**: Os dados retornam devidamente tipados e são persistidos no cache local do navegador.

---

## 3.4. Padrão de Performance: Code Splitting e Otimização

Para cumprir o SLA de latência sob condições de rede variáveis:

*   **Route-based Splitting**: Utilização de `React.lazy()` e `Suspense` em todas as rotas principais. O bundle inicial é fragmentado, baixando apenas o necessário para a operação atual.
*   **Estilos Atômicos**: O uso de **Tailwind CSS v4** garante que apenas o CSS necessário para a interface ativa seja carregado, otimizando o tempo de renderização (First Contentful Paint).
