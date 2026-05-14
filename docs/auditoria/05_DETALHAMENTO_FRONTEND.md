# 5. Detalhamento de Frontend (UI/UX & Client State)

Este capítulo descreve a camada de interação com o usuário e as estratégias de design que tornam o **Nexus Industrial** uma ferramenta de alta fidelidade e eficiência operacional.

---

## 5.1. Design System e Identidade Visual (Nexus Premium)

A interface é regida pela linguagem de design **Nexus Premium**, focada em um ambiente industrial sofisticado e de alto contraste.

*   **Estética Midnight/Cyan/Glass**: Utilização de fundos profundos (`#020617`) e acentos vibrantes em Ciano (`#06b6d4`) para guiar a atenção do usuário.
*   **Tokens Semânticos (Tailwind CSS v4)**: Todas as propriedades visuais (cores, espaçamentos, raios de borda) são controladas via variáveis CSS. Isso garante consistência total e facilita a manutenção de marca.
*   **Glassmorphism e Hierarquia**: O uso de `backdrop-blur` (24px a 40px) cria uma percepção de profundidade técnica. Painéis sobrepostos (Drawers) permitem que o usuário execute tarefas sem perder o contexto visual da tela de fundo.

---

## 5.2. Componentização e Power Components

O sistema é construído através de componentes de alto impacto funcional:

*   **Premium Dashboard (Cockpit)**: Módulo de observabilidade que utiliza **Recharts** para visualização de dados com gradientes e **CountUp** para animação de métricas de faturamento e lucro.
*   **Drawer Universal de Cadastro**: Padrão de interface para fluxos de entrada de dados. Utiliza **Framer Motion** com animações de física elástica (*spring*) para uma sensação de leveza e rapidez.
*   **Checkout Rápido (PDV Drawer)**: Interface de venda otimizada que ocupa 50% da tela. Permite a conclusão de transações mantendo o vendedor no contexto atual da loja.

---

## 5.3. Experiência do Usuário (Jornada de Venda)

O fluxo de trabalho foi projetado para maximizar a eficiência e reduzir o erro humano.

*   **Agilidade Transacional (Zero Atrito)**: A jornada de venda exige menos de **4 cliques** para ser concluída (para clientes cadastrados), priorizando a velocidade no atendimento de balcão.
*   **Validação em Tempo Real**: O sistema adota validações *inline* e *onBlur*. Regras críticas (ex: markup abaixo do custo ou inadimplência) são bloqueadas instantaneamente antes mesmo da submissão ao backend.
*   **Microinterações de Confirmação**: O uso estratégico de animações e feedbacks visuais imediatos confirma para o operador que a instrução foi processada com sucesso no servidor, reduzindo a ansiedade e comandos duplicados.
