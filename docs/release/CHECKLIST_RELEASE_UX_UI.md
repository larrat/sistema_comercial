# Checklist Obrigatório de Release UX/UI

Data base: 2026-04-07
Status: Obrigatório para qualquer publicação com impacto em interface/fluxo

## Gate de publicação

Regra: release só pode ser publicado com 100% dos itens críticos marcados.

## 1) Consistência visual (bloqueante)
- [ ] Componentes base reutilizados (`.btn`, `.inp`, `.sel`, `.bdg`, `.card`, `.tbl`, `.modal-box`, `.tb`).
- [ ] Sem criação de padrão paralelo por tela sem justificativa aprovada.
- [ ] Tokens semânticos corretos por prioridade (crítico/atenção/oportunidade/sucesso).
- [ ] Hierarquia visual clara: ação principal visível na dobra inicial.

## 2) Acessibilidade mínima (bloqueante)
- [ ] Foco visível em teclado (`focus-visible`) nos elementos interativos.
- [ ] Contraste aceitável em texto, badges, alertas e botões de estado.
- [ ] Alvos de toque no mobile com área adequada (>= 44px nos CTAs principais).
- [ ] Feedback de erro e sucesso perceptível (visual + textual).

## 3) Estados e feedbacks (bloqueante)
- [ ] Estados testados: `hover`, `focus`, `disabled`, `loading`, `error`, `success`, `empty`.
- [ ] Erros críticos seguem padrão: o que aconteceu + impacto + o que fazer agora.
- [ ] Toasts/mensagens usam severidade padronizada (`success|warning|error|info`).
- [ ] Fluxos críticos têm recuperação guiada (foco no campo/ação recomendada).

## 4) Responsividade (bloqueante)
- [ ] Sem corte de conteúdo em 360px+.
- [ ] Modais usáveis no mobile (sem scroll confuso e com ação de conclusão visível).
- [ ] Tabela desktop e card mobile preservam a mesma informação-chave.
- [ ] Navegação mobile dá acesso direto às áreas estratégicas.

## 5) Fluxos críticos (bloqueante)
- [ ] Clientes: cadastrar, editar, salvar e validar feedback final.
- [ ] Pedidos: criar pedido com item, salvar, validar status.
- [ ] Campanhas: criar/editar, gerar fila, tratar sem elegíveis.
- [ ] Dashboard: leitura inicial clara e ação prioritária localizável em até 10s.

## 6) Regressão e estabilidade (bloqueante)
- [ ] Revisão visual em desktop e mobile feita por 2 pessoas (quem implementou + revisor).
- [ ] Comando `/ auditoria visual` executado sem falhas críticas.
- [ ] Comando `/ auditoria aceite` executado sem pendências bloqueantes.

## Aprovação final de UX/UI
- [ ] Aprovador UX/UI da release assinou: __________________________
- [ ] Data/hora: __________________________
- [ ] Versão/Release: __________________________
