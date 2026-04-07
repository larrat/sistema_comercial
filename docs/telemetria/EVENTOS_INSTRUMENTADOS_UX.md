# Eventos Instrumentados (Produto/UX)

Data: 2026-04-07

## Fonte
- Armazenamento local: `localStorage`
- Chave: `sc_ux_events_v1`
- Retenção: últimos 300 eventos

## Eventos atuais

- `journey_started`
- `journey_completed`
- `journey_abandoned`
- `journey_rework`
- `primary_action_completed`
- `ux_error`
- `ux_validation_warning`
- `modal_open`
- `modal_close`
- `metrics_reset`

## Payload padrão

- `id`
- `ts`
- `page`
- `type`
- Campos específicos (`journey`, `elapsed_ms`, `clicks_to_primary`, `message`, etc.)

## Observação

Telemetria atual é local por navegador/usuário (MVP). Para visão multiusuário, próximo passo é enviar eventos para backend.
