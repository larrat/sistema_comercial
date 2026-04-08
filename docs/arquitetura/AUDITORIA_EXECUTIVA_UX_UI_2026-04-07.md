# Auditoria Executiva UX/UI (07/04/2026)
Perfil da análise: Head of Design / Principal Product Designer  
Escopo: arquitetura visual, consistência, eficiência operacional, responsividade e acessibilidade.

## Achados (priorizados)
1. **Alto — Débito de cascata CSS ainda elevado**
- Evidência: múltiplas camadas redefinindo os mesmos componentes globais (`.btn`, `.tb`, `.card`, `.app-topbar`) em blocos diferentes.
- Referências:
  - `btn`: [css/style.css](css/style.css) linhas próximas de 213, 898, 1783, 2055.
  - `tb`: [css/style.css](css/style.css) linhas próximas de 383, 1874, 2075.
  - `app-topbar`: [css/style.css](css/style.css) linhas próximas de 118, 1526, 2028.
- Impacto: risco de regressão visual e previsibilidade baixa em novas features.

2. **Alto — Código de atalho rápido está ativo sem UI correspondente**
- Evidência: elementos de comando rápido foram removidos da topbar, porém JS mantém inicialização e rotinas (`quick-links`, `quick-cmd`).
- Referências:
  - UI removida: [index.html](index.html) linhas 89–99.
  - lógica ainda presente: [js/main.js](js/main.js) linhas próximas de 778–812.
- Impacto: dívida funcional silenciosa, manutenção desnecessária e confusão futura no time.

3. **Médio — Mobile nav não reflete nova aba Gerencial**
- Evidência: existe `pg-gerencial` no desktop/menu lateral, mas não há ação dedicada no menu mobile inferior.
- Referências:
  - nova aba: [index.html](index.html) linhas 163–174.
  - mobile nav atual: [index.html](index.html) linhas 391–395.
- Impacto: descoberta reduzida da visão gerencial no mobile.

4. **Médio — Dashboard operacional ainda mistura densidades de conteúdo**
- Evidência: blocos com alturas e formatos distintos (listas, cards, chips, tabela) na mesma dobra.
- Referências:
  - estrutura do dashboard: [index.html](index.html) linhas 103–159.
  - regras de grid: [css/style.css](css/style.css) linhas 1222–1246.
- Impacto: variação de ritmo visual e leitura menos escaneável.

5. **Médio — Semântica visual está boa, mas sem “governança automática” no CI**
- Evidência: auditorias manuais existem via comandos (`/ auditoria visual`, `/ auditoria aceite`), sem validação automática em pipeline.
- Referências:
  - comandos em runtime: [js/main.js](js/main.js) linhas 236–253.
- Impacto: qualidade depende de disciplina manual, não de processo.

## Pontos fortes atuais
- Evolução clara para Design System v1 com tokens semânticos e foco visual.
- Separação correta entre **Dashboard operacional** e **Gerencial**.
- KPIs instrumentados no front com persistência e leitura contínua.
- Responsividade avançou (360px+, modais com ação sticky, cards mobile para fluxos críticos).

## Scorecard executivo (0–10)
- Clareza visual: **8.0**
- Consistência entre módulos: **7.2**
- Eficiência operacional: **8.1**
- Responsividade: **8.3**
- Acessibilidade mínima: **7.6**
- Governança e escalabilidade: **6.9**

## Recomendações estratégicas (em ordem)
1. **Rodada 3 de limpeza CSS (obrigatória)**
- Meta: reduzir duplicidades globais para no máximo 1 definição por componente base na camada final.
- Entregável: mapa “fonte de verdade” por componente (`btn`, `tb`, `card`, `app-topbar`, `modal`).

2. **Decisão de produto sobre comandos rápidos**
- Opção A: remover completamente JS de quick command.
- Opção B: reintroduzir somente na aba Gerencial com escopo claro.

3. **Paridade mobile da aba Gerencial**
- Incluir atalho no menu mobile (ou CTA secundário no Dashboard mobile para abrir Gerencial).

4. **Padronização visual do dashboard operacional**
- Criar um padrão único para blocos “lista curta”: título + estado + ação.
- Evitar mistura de estilos de ranking/chips/tabela no mesmo nível hierárquico sem separador.

5. **Governança contínua**
- Transformar auditorias em checklist obrigatório por PR e, se possível, script de verificação de classes-base.

## Plano executivo sugerido
### Onda 1 (1–2 dias)
- Remover ou reativar oficialmente o quick command (UI + JS alinhados).
- Ajustar navegação mobile para Gerencial.
- Consolidar topbar e botões de ação por contexto.

### Onda 2 (2–4 dias)
- Rodada final de CSS deduplicado com baseline visual congelado.
- Documentar “Do/Don’t” por componente e tela.

### Onda 3 (1–2 dias)
- Fechamento com auditoria final (visual + aceite) e publicação incremental.

## Conclusão executiva
O sistema já está em um patamar bom de experiência e clareza operacional.  
O principal gap agora é **governança técnica de estilo** (evitar regressão), não falta de direção de produto/design.  
Com uma rodada final de consolidação e paridade mobile do Gerencial, a base fica sólida para escalar.
