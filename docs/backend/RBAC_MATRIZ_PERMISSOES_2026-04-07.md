# Matriz de Permissões RBAC (v2)

Data: 2026-04-07  
Status: Ativo no frontend + scripts SQL de base e endurecimento (`03`, `03b`, `04`)

## Objetivo

Definir de forma objetiva o que cada cargo pode **enxergar** e **executar** no sistema.

## Cargos

- `admin`
- `gerente`
- `operador`

## Regra geral da versão atual

- `admin` possui permissões administrativas.
- `gerente` possui permissões operacionais avançadas.
- `operador` possui acesso operacional restrito.
- A tela exibe o cargo atual na sidebar (`Operador`, `Gerente` ou `Admin`).

## Visibilidade por módulo

| Módulo | Admin | Gerente | Operador |
|---|---|---|---|
| Dashboard | Sim | Sim | Sim |
| Gerencial | Sim | Sim | Sim |
| Produtos | Sim | Sim | Sim |
| Clientes | Sim | Sim | Sim |
| Pedidos | Sim | Sim | Sim |
| Cotação | Sim | Sim | Sim |
| Estoque | Sim | Sim | Sim |
| Notificações | Sim | Sim | Sim |
| Campanhas | Sim | Sim | Não |
| Filiais | Sim | Não | Não |
| Acessos (RBAC) | Sim | Não | Não |
| Auditoria de Acessos (RBAC) | Sim | Não | Não |

## Ações críticas (controle de execução)

| Ação | Admin | Gerente | Operador |
|---|---|---|---|
| Exportar CSV (módulo e “Exportar CSVs”) | Sim | Sim | Não |
| Criar/editar/remover filial | Sim | Não | Não |
| Criar/editar/remover perfil de acesso | Sim | Não | Não |
| Vincular/desvincular usuário em filial | Sim | Não | Não |
| Ler trilha de auditoria de acessos | Sim | Não | Não |
| Remover produto | Sim | Sim | Não |
| Remover cliente | Sim | Sim | Não |
| Remover pedido | Sim | Sim | Não |
| Remover fornecedor | Sim | Sim | Não |
| Excluir movimentação de estoque | Sim | Sim | Não |
| Criar/salvar/remover campanha | Sim | Sim | Não |
| Gerar fila de campanha | Sim | Sim | Não |
| Marcar envio como enviado/falhou | Sim | Sim | Não |
| Salvar/remover jogo no dashboard | Sim | Sim | Não |
| Sincronizar jogos | Sim | Sim | Não |

## Como o bloqueio aparece na interface

- Ações sem permissão para `operador` são ocultadas visualmente.
- Se houver tentativa de acesso direto a área bloqueada (ex.: Campanhas/Filiais), o sistema redireciona para `Dashboard` com aviso.

## Implementação de referência

- Estado e guards de papel: `js/main.js`
- Carregamento do perfil de usuário: `js/api.js` (`SB.getMeuPerfil`)
- Papel no estado global: `js/store.js`
- Tabela de perfis: `sql/03_rbac_v1.sql` (`public.user_perfis`)
- Seed e auditoria operacional: `sql/03b_rbac_seed_e_auditoria.sql`
- Endurecimento admin-only (v2): `sql/04_rbac_v2_admin_only.sql`

## Observações de governança

- Na v2, gestão de filiais passa a ser responsabilidade exclusiva de `admin`.
- Recomenda-se manter revisão periódica dos papéis e vínculos (`user_perfis` e `user_filiais`).
