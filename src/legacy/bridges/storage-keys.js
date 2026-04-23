// @ts-check

/**
 * Registro central de todas as chaves de localStorage usadas pela aplicação.
 *
 * Regra: nunca use strings literais de chave localStorage fora deste arquivo.
 * Qualquer novo domínio que precise de persistência local adiciona sua chave aqui.
 *
 * Isso garante:
 * - Auditabilidade: uma busca mostra tudo que é persistido
 * - Segurança: typos são detectáveis em review
 * - Migração segura: renomear uma chave tem um único ponto de mudança
 */

/** @readonly */
export const STORAGE_KEYS = Object.freeze({
  // ── Auth & filial (compartilhadas entre legado e React) ───────────────────
  AUTH_SESSION: 'sc_auth_session_v1',
  FILIAL_ID: 'sc_filial_id',

  // ── Pilots — modo UI ──────────────────────────────────────────────────────
  // Valor: 'legacy' | 'react'
  CLIENTES_UI_MODE: 'sc_clientes_ui_mode',
  DASHBOARD_UI_MODE: 'sc_dashboard_ui_mode',
  PEDIDOS_UI_MODE: 'sc_pedidos_ui_mode',

  // ── Pilots — feature flags ────────────────────────────────────────────────
  // Valor: 'true' | 'false' | não definido (usa default do window global ou false)
  CLIENTES_REACT_ENABLED: 'sc_clientes_react_enabled',
  DASHBOARD_REACT_ENABLED: 'sc_dashboard_react_enabled',
  PEDIDOS_REACT_ENABLED: 'sc_pedidos_react_enabled',
  RECEBER_REACT_ENABLED: 'sc_receber_react_enabled',
  PRODUTOS_REACT_ENABLED: 'sc_produtos_react_enabled'
});

/**
 * Valores válidos para chaves de modo UI de pilots.
 * @readonly
 */
export const UI_MODES = Object.freeze({
  LEGACY: 'legacy',
  REACT: 'react'
});
