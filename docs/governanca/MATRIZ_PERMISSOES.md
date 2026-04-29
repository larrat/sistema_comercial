# Matriz de Permissões

Data de revisão: 2026-04-29

Objetivo: documentar o estado real de permissões do sistema hoje, cruzando:
- matriz RBAC publicada;
- guards do frontend;
- RLS/RBAC do banco;
- telas administrativas já existentes.

Escopo desta rodada:
- apenas documentação;
- sem alterar RLS;
- sem alterar papéis;
- sem alterar telas;
- sem alterar código funcional.

## Fontes revisadas

- [RBAC_MATRIZ_PERMISSOES_2026-04-07.md](/Users/larrat/sistema_comercial/sistema_comercial/docs/backend/RBAC_MATRIZ_PERMISSOES_2026-04-07.md:1)
- [CHECKLIST_RBAC_IMPLANTACAO.md](/Users/larrat/sistema_comercial/sistema_comercial/docs/backend/CHECKLIST_RBAC_IMPLANTACAO.md:1)
- [GOVERNANCA_SQL_RLS.md](/Users/larrat/sistema_comercial/sistema_comercial/docs/governanca/GOVERNANCA_SQL_RLS.md:1)
- [02_rls_producao.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/02_rls_producao.sql:1)
- [03_rbac_v1.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/03_rbac_v1.sql:1)
- [04_rbac_v2_admin_only.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/04_rbac_v2_admin_only.sql:1)
- [05_rbac_auditoria_acessos.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/05_rbac_auditoria_acessos.sql:1)
- [auth-setup.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/auth-setup.js:1)
- [filiais-acessos.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/filiais-acessos.js:1)
- [routeAccess.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/app/router/routeAccess.tsx:1)
- [useRoleStore.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/app/useRoleStore.ts:1)
- [authApi.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/auth/services/authApi.ts:1)

## Papéis suportados

- `admin`
- `gerente`
- `operador`

## Leitura rápida do estado atual

1. O modelo de papel existe e está definido no frontend e no banco.
2. O frontend legado possui guards explícitos para várias ações críticas.
3. O AppShell React atual garante autenticação e filial ativa, mas **não centraliza ainda guards por papel em rota**.
4. O RLS oficial de produção (`02`) protege por **filial**.
5. O endurecimento admin-only (`04`) protege `user_perfis`, `user_filiais` e `filiais`, mas segundo o checklist ainda está **pendente em produção**.
6. Para vários módulos operacionais, a restrição `gerente/admin` ainda é principalmente uma regra de frontend e não de banco.

## Tabela consolidada

| Papel | Módulo | Ler | Criar | Editar | Excluir | Ação crítica | Observação |
|---|---|---|---|---|---|---|---|
| Admin | Dashboard | Sim | n/a | n/a | n/a | Sim | Acesso visual pleno; não há mutação crítica principal no módulo |
| Gerente | Dashboard | Sim | n/a | n/a | n/a | Sim | Mesmo acesso visual operacional |
| Operador | Dashboard | Sim | n/a | n/a | n/a | Sim | Acesso visual liberado |
| Admin | Produtos | Sim | Sim | Sim | Sim | Sim | Matriz permite tudo; exclusão é ação crítica permitida |
| Gerente | Produtos | Sim | Sim | Sim | Sim | Sim | Excluir produto permitido pela matriz frontend |
| Operador | Produtos | Sim | Sim | Sim | Não | Não | Divergência importante: RLS por filial tende a permitir write no banco se não houver guard server-side adicional |
| Admin | Clientes | Sim | Sim | Sim | Sim | Sim | Exclusão crítica permitida |
| Gerente | Clientes | Sim | Sim | Sim | Sim | Sim | Exclusão crítica permitida |
| Operador | Clientes | Sim | Sim | Sim | Não | Não | Front restringe exclusão; banco hoje parece restringir só por filial |
| Admin | Pedidos | Sim | Sim | Sim | Sim | Sim | Cancelar/avançar status e remover pedido entram como ações críticas |
| Gerente | Pedidos | Sim | Sim | Sim | Sim | Sim | Fluxo operacional amplo |
| Operador | Pedidos | Sim | Sim | Sim | Não | Parcial | Criar/editar permitido; remoção e ações mais sensíveis dependem de regra de front, não de RLS por papel |
| Admin | Cotação | Sim | Sim | Sim | Sim | Sim | Lock/unlock, edição de preços e importação ficam liberados |
| Gerente | Cotação | Sim | Sim | Sim | Sim | Sim | Mesmo padrão operacional do admin na matriz atual |
| Operador | Cotação | Sim | Sim | Sim | Não mapeado formalmente | Parcial | Não há bloqueio por papel explícito revisado no React para lock/importação; depende mais de fluxo/lock do módulo |
| Admin | Estoque | Sim | Sim | Sim | Sim | Sim | Excluir movimentação permitido; transferência e ajuste manual são ações críticas |
| Gerente | Estoque | Sim | Sim | Sim | Sim | Sim | Excluir movimentação permitido |
| Operador | Estoque | Sim | Sim | Sim | Não | Parcial | Criar movimento permitido no fluxo atual; exclusão bloqueada pela matriz frontend |
| Admin | Contas a Receber | Sim | Sim | Sim | n/a | Sim | Baixa, estorno e marcar pendente são críticas |
| Gerente | Contas a Receber | Sim | Sim | Sim | n/a | Sim | Mesmo padrão operacional no front atual |
| Operador | Contas a Receber | Sim | Sim | Sim | n/a | Parcial | Sem guard fino por papel no hook React; depende de política de negócio ainda não endurecida no backend |
| Admin | Campanhas | Sim | Sim | Sim | Sim | Sim | Módulo visível e ações críticas permitidas |
| Gerente | Campanhas | Sim | Sim | Sim | Sim | Sim | Ações críticas liberadas |
| Operador | Campanhas | Não | Não | Não | Não | Não | Matriz declara sem acesso |
| Admin | Filiais | Sim | Sim | Sim | Sim | Sim | Admin-only pela matriz; SQL `04` também modela isso |
| Gerente | Filiais | Não | Não | Não | Não | Não | No React atual ainda falta guard de rota/página equivalente |
| Operador | Filiais | Não | Não | Não | Não | Não | Mesmo risco de exposição parcial de UI se só o banco bloquear |
| Admin | Acessos | Sim | Sim | Sim | Sim | Sim | Gestão de perfis, vínculos, convites e auditoria RBAC |
| Gerente | Acessos | Não | Não | Não | Não | Não | Legado já bloqueia via `requireRole(roleAdminOnly)` |
| Operador | Acessos | Não | Não | Não | Não | Não | Sem acesso |
| Admin | Auditoria de Acessos | Sim | n/a | n/a | n/a | Sim | Prevista em `05_rbac_auditoria_acessos.sql` |
| Gerente | Auditoria de Acessos | Não | n/a | n/a | n/a | Não | Admin-only |
| Operador | Auditoria de Acessos | Não | n/a | n/a | n/a | Não | Admin-only |
| Admin | Notificações | Sim | Sim | Sim | Sim | Sim | Sem matriz detalhada por ação, mas módulo visível ao admin |
| Gerente | Notificações | Sim | Sim | Sim | Sim | Sim | Igual ao admin no frontend operacional atual |
| Operador | Notificações | Sim | Parcial | Parcial | Parcial | Parcial | Falta política formal documentada por ação |

## Riscos identificados

### 1. Banco protege por filial, mas nem sempre por papel
O RLS oficial em [02_rls_producao.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/02_rls_producao.sql:127) aplica `for all to authenticated` com `can_access_filial(filial_id)` para várias tabelas operacionais:
- `produtos`
- `clientes`
- `pedidos`
- `rcas`
- `fornecedores`
- `cotacao_*`
- `movimentacoes`
- `campanhas`

Isso é bom para isolamento por filial, mas **não diferencia admin/gerente/operador** nessas tabelas.

### 2. Endurecimento RBAC v2 ainda não está confirmado em produção
O checklist em [CHECKLIST_RBAC_IMPLANTACAO.md](/Users/larrat/sistema_comercial/sistema_comercial/docs/backend/CHECKLIST_RBAC_IMPLANTACAO.md:1) marca como pendente:
- rodar `04_rbac_v2_admin_only.sql`
- rodar `04b_rbac_v2_validacao.sql`
- validar com contas reais

Então a política “filiais admin-only” e “user_perfis/user_filiais admin-only” pode existir no repositório, mas não necessariamente no ambiente real.

### 3. AppShell React não centraliza guard de papel por rota
[routeAccess.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/app/router/routeAccess.tsx:1) valida:
- autenticado / não autenticado
- com filial / sem filial

Mas não faz bloqueio explícito por papel para:
- `/app/filiais`
- `/app/acessos`

Hoje isso depende mais de:
- esconder navegação;
- banco negar operação;
- ou do fluxo legado ainda existente.

### 4. Fontes de verdade misturadas
O papel do usuário hoje cruza:
- `user_perfis` no backend;
- `useRoleStore` no local storage;
- `window.__SC_USER_ROLE__` no legado.

Isso aumenta risco de divergência de UX se o papel em storage ficar stale.

### 5. Script dev com `anon` aberto continua existindo
[01b_rls_anon_dev.sql](/Users/larrat/sistema_comercial/sistema_comercial/sql/01b_rls_anon_dev.sql:1) reabre políticas amplas para `anon`.

Ele está corretamente documentado como exceção dev/local, mas é um risco operacional claro se for aplicado fora do ambiente certo.

## Divergências entre front-end e RLS/RBAC

### Divergência 1 — exclusões operacionais
A matriz diz:
- remover produto: `admin` e `gerente`
- remover cliente: `admin` e `gerente`
- remover pedido: `admin` e `gerente`
- excluir movimentação: `admin` e `gerente`

Mas o RLS geral dessas tabelas, em `02`, não mostra essa diferenciação por papel.  
Conclusão: **sem guard server-side adicional, um usuário autenticado com acesso à filial pode depender só do frontend para não executar a ação**.

### Divergência 2 — Filiais no React novo
O legado possui guard explícito para filiais em [filiais-acessos.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/filiais-acessos.js:271).

Já o React novo:
- [FiliaisRoutePage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/filiais/pages/FiliaisRoutePage.tsx:1)
- [FiliaisPage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/filiais/components/FiliaisPage.tsx:1)

não aplica guard de papel por si só.

### Divergência 3 — Acessos React ainda é stub
[AcessosRoutePage.tsx](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/acessos/pages/AcessosRoutePage.tsx:1) é apenas placeholder.  
O fluxo real protegido ainda está no legado [filiais-acessos.js](/Users/larrat/sistema_comercial/sistema_comercial/src/features/filiais-acessos.js:731), que exige `admin`.

### Divergência 4 — Contas a Receber
As operações de baixa e estorno no React:
- [useContasReceberMutations.ts](/Users/larrat/sistema_comercial/sistema_comercial/src/react/features/contas-receber/hooks/useContasReceberMutations.ts:1)

não aplicam guard de papel local.  
O controle real hoje parece ser:
- autenticação;
- acesso à filial;
- e regras do backend/RPC, mas sem matriz explícita por cargo para essas ações.

## Ações que exigem validação server-side

Estas ações não deveriam depender apenas de esconder botão ou guard de frontend:

1. Remover produto
2. Remover cliente
3. Remover pedido
4. Excluir movimentação de estoque
5. Ajustar estoque manualmente
6. Transferir estoque entre filiais
7. Baixar título financeiro
8. Estornar título financeiro
9. Travar/destravar cotação
10. Alterar preço em cotação
11. Criar/editar/remover filial
12. Criar/editar/remover perfil de acesso
13. Vincular/desvincular usuário em filial
14. Ler auditoria de acessos

Regra prática: toda ação que muda dinheiro, estoque, privilégio ou exclusão sensível precisa de validação no backend ou em Edge Function, mesmo que o frontend continue confortável.

## Recomendações

### 1. Tratar o banco como autoridade final
Para módulos operacionais, o objetivo deve ser:
- frontend orienta UX;
- backend confirma permissão.

### 2. Fechar a lacuna React x legado em Filiais/Acessos
Antes de desligar o legado administrativo, o React precisa reproduzir:
- guard de papel na rota;
- guard na ação;
- e mensagem de negação coerente.

### 3. Introduzir `RoleRouteAccess` no AppShell
Hoje o React faz guard de autenticação/filial.  
Vale adicionar uma camada simples de rota por papel para:
- `Filiais`
- `Acessos`
- futuras telas administrativas

### 4. Revisar ações críticas operacionais no backend
Prioridade mais alta:
- exclusões operacionais;
- financeiro;
- estoque;
- permissões administrativas.

### 5. Validar o ambiente real contra o checklist
Antes de confiar plenamente na matriz, confirmar no ambiente:
- `04_rbac_v2_admin_only.sql` aplicado
- `04b_rbac_v2_validacao.sql` executado
- `05_rbac_auditoria_acessos.sql` aplicado quando a fase de auditoria entrar

### 6. Evitar depender de storage local como fonte final de papel
`useRoleStore` ajuda a UX, mas não deve ser tratado como verdade de autorização.  
A verdade precisa continuar vindo do backend.
