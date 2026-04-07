# Backlog Debt/Control (UX/UI + Produto)

Data base: 2026-04-07
Objetivo: separar claramente correções estruturais de evolução funcional para evitar competição de prioridade.

## Regras do backlog
- Toda demanda entra com: tipo (`debt` ou `feature`), impacto, gravidade, esforço e dono.
- `debt` crítico não disputa com feature: vira item prioritário imediato.
- Revisão quinzenal obrigatória no ritual de governança.

## Colunas recomendadas
- ID
- Tipo (`debt`/`feature`)
- Tema
- Sintoma
- Causa provável
- Impacto (usuário/negócio)
- Gravidade
- Prioridade
- Responsável
- Status
- Prazo

## Debt estrutural (base de controle)

| ID | Tipo | Tema | Sintoma | Causa provável | Impacto | Gravidade | Prioridade | Responsável | Status |
|---|---|---|---|---|---|---|---|---|---|
| D-001 | debt | CSS base | Duplicidades de `.btn`, `.tb`, `.card`, `.app-topbar` | Camadas legadas concorrentes | Regressão visual e baixa previsibilidade | alta | curto prazo | Front-end Sênior | aberto |
| D-002 | debt | Comando rápido | Lógica JS ativa sem UI correspondente | Retirada parcial de feature | Débito funcional e manutenção desnecessária | média | curto prazo | Produto + Front-end | aberto |
| D-003 | debt | Descoberta mobile | Baixa visibilidade de área gerencial | Arquitetura de navegação incompleta | Menor uso de visão estratégica | média | curto prazo | Product Designer | aberto |
| D-004 | debt | Feedback de erro | Mensagens heterogêneas em fluxos críticos | Ausência de biblioteca unificada | Aumento de retrabalho e suporte | alta | curto prazo | Produto + Front-end | em andamento |

## Control de evolução (features)

| ID | Tipo | Tema | Oportunidade | Impacto esperado | Prioridade | Responsável | Status |
|---|---|---|---|---|---|---|---|
| F-001 | feature | Camada gerencial | Insight + ação por KPI | Decisão mais rápida e acionável | curto prazo | Produto + Front-end | em andamento |
| F-002 | feature | Dashboard operacional | Menor carga cognitiva e melhor hierarquia | Redução de tempo para achar ação prioritária | médio prazo | Design + Front-end | aberto |
| F-003 | feature | Recomendações inteligentes | CTAs baseados em contexto de risco/oportunidade | Maior conversão de ação estratégica | médio prazo | Produto | aberto |

## Critério de priorização
- eixo 1: impacto no negócio (1 a 5)
- eixo 2: impacto na experiência (1 a 5)
- eixo 3: urgência operacional (1 a 5)
- score final = (negócio + experiência + urgência) / esforço relativo.

## Governança de atualização
- atualização quinzenal: status, bloqueios e próximo passo.
- fechamento mensal: consolidar itens concluídos, adiados e reabertos.
