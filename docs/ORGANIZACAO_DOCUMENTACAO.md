# Organização da Documentação

Última atualização: 06/05/2026

## Diagnóstico

A documentação atual tem muito conteúdo útil, mas mistura quatro tipos diferentes de documento:

- Estado atual.
- Planos em andamento.
- Padrões de referência.
- Histórico de decisões e auditorias antigas.

Isso cria uma sensação de que tudo ainda precisa ser feito, mesmo quando parte do conteúdo já foi concluída ou superada.

## Sugestão de separação

A separação por `concluído` e `em andamento` ajuda, mas sozinha não basta.
Alguns documentos não são tarefas: são referências permanentes, como padrão visual, contrato de backend e governança SQL.

A organização recomendada é por tipo + status.

## Tipos de documento

### 1. Entrada

Documentos que respondem rapidamente: onde estamos e o que importa agora.

- `docs/NORTE.md`
- `docs/PLANO_SIMPLES.md`
- `docs/README.md`

### 2. Status atual

Snapshots datados do sistema.

- `docs/status/STATUS_GERAL_2026-05-06.md`

Regra: só o snapshot mais recente deve ser usado como referência ativa.
Snapshots antigos ficam como histórico.

### 3. Referência permanente

Documentos que continuam úteis mesmo depois de uma entrega.

- Padrões de tela.
- Design system.
- Contratos de backend.
- Governança SQL/RLS.
- Política de engenharia.

Exemplos:

- `docs/PADRAO_TELA_CLIENTES.md`
- `docs/design-system/UI_COMPONENTS.md`
- `docs/design-system/GOVERNANCA_VISUAL.md`
- `docs/backend/CONTRATO_MINIMO_SB_V1.md`
- `docs/governanca/GOVERNANCA_SQL_RLS.md`

### 4. Em andamento

Documentos com trabalho real ainda pendente.

Exemplos atuais:

- RBAC v2 e auditoria em produção, se houver segundo usuário.
- Validação real de RPCs de Contas a Receber.
- Módulo Acessos.
- Padronização futura de Pedidos, se voltar a atrapalhar.

### 5. Concluído / histórico

Documentos que registram decisões, auditorias ou planos passados.
Não devem guiar o trabalho diário sem passar pelo `NORTE.md`.

Exemplos:

- `docs/governanca/STATUS_REAL_2026-04-28.md`
- `docs/governanca/STATUS_REAL_ENTREGAS_E_PENDENCIAS_2026-04-23.md`
- Planos de sprint antigos.
- Checklists de execução já usados.

## Estrutura ideal futura

Se um dia quiser reorganizar fisicamente as pastas, eu faria assim:

```text
docs/
  README.md
  NORTE.md
  PLANO_SIMPLES.md
  status/
    STATUS_GERAL_YYYY-MM-DD.md
  referencia/
    frontend/
    backend/
    banco/
    ux-ui/
  andamento/
    ACESSOS.md
    CONTAS_RECEBER_RPCS.md
  historico/
    2026-04/
```

## Decisão desta rodada

Não mover documentos antigos agora.

Motivos:

- Evita quebrar links existentes.
- Evita uma mudança grande que não melhora o sistema em produção.
- Permite organizar por índice antes de reorganizar por pastas.

A ação feita agora é:

- Criar um índice em `docs/README.md`.
- Criar um snapshot novo em `docs/status/STATUS_GERAL_2026-05-06.md`.
- Atualizar `docs/NORTE.md` para apontar para os documentos realmente ativos.
