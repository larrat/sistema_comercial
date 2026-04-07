# Matriz de Permissões RBAC (v1)

Data: 2026-04-07  
Status: Ativo no frontend + base SQL (`sql/03_rbac_v1.sql`)

## Objetivo

Definir de forma objetiva o que cada cargo pode **enxergar** e **executar** no sistema.

## Cargos

- `admin`
- `gerente`
- `operador`

## Regra geral da versão atual

- `admin` e `gerente` possuem o mesmo nível de acesso na v1.
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
| Filiais | Sim | Sim | Não |

## Ações críticas (controle de execução)

| Ação | Admin | Gerente | Operador |
|---|---|---|---|
| Exportar CSV (módulo e “Exportar CSVs”) | Sim | Sim | Não |
| Criar/editar/remover filial | Sim | Sim | Não |
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

## Observações de governança

- A v1 não diferencia permissões entre `admin` e `gerente`.
- Evolução recomendada (v2): separar claramente permissões administrativas (ex.: gestão de filiais e políticas) para `admin` apenas.
