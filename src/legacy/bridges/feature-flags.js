// @ts-check

import { STORAGE_KEYS } from './storage-keys.js';

/**
 * Registry central de feature flags para pilots React.
 *
 * Princípios:
 * - Cada pilot tem UMA entrada aqui. Adicionar um novo pilot = adicionar uma entrada.
 * - Prioridade de leitura: localStorage > window global > defaultValue
 * - A API é pelo nome do pilot ('clientes', 'dashboard'), nunca pela chave localStorage raw.
 *
 * Compatibilidade: o sistema legado pode continuar lendo/escrevendo as mesmas
 * chaves de localStorage — este módulo usa as mesmas chaves de STORAGE_KEYS,
 * sem quebrar nada que já existe.
 */

/**
 * Nome canônico de um pilot React.
 * Adicionar aqui quando um novo domínio for pilotado.
 * @typedef {'clientes' | 'dashboard' | 'pedidos'} PilotName
 */

/**
 * Configuração interna de uma feature flag de pilot.
 * @typedef {{
 *   storageKey: string,
 *   windowProp: string,
 *   defaultValue: boolean
 * }} FlagConfig
 */

/** @type {Record<PilotName, FlagConfig>} */
const FLAG_REGISTRY = {
  clientes: {
    storageKey: STORAGE_KEYS.CLIENTES_REACT_ENABLED,
    windowProp: '__SC_CLIENTES_REACT_ENABLED__',
    defaultValue: false
  },
  dashboard: {
    storageKey: STORAGE_KEYS.DASHBOARD_REACT_ENABLED,
    windowProp: '__SC_DASHBOARD_REACT_ENABLED__',
    defaultValue: false
  },
  pedidos: {
    storageKey: STORAGE_KEYS.PEDIDOS_REACT_ENABLED,
    windowProp: '__SC_PEDIDOS_REACT_ENABLED__',
    defaultValue: false
  }
};

/**
 * Verifica se um pilot React está habilitado.
 *
 * Prioridade: localStorage > window global > defaultValue
 * Esta é a única função que deve ser chamada para checar se um pilot está ativo.
 *
 * @param {PilotName} pilot
 * @returns {boolean}
 */
export function isPilotEnabled(pilot) {
  const config = FLAG_REGISTRY[pilot];
  if (!config) return false;

  const stored = localStorage.getItem(config.storageKey);
  if (stored === 'true') return true;
  if (stored === 'false') return false;

  // Fallback para global injetado pelo backend/index.html
  return /** @type {any} */ (window)[config.windowProp] === true || config.defaultValue;
}

/**
 * Habilita ou desabilita um pilot React.
 *
 * @param {PilotName} pilot
 * @param {boolean} enabled
 */
export function setPilotEnabled(pilot, enabled) {
  const config = FLAG_REGISTRY[pilot];
  if (!config) return;
  localStorage.setItem(config.storageKey, enabled ? 'true' : 'false');
}

/**
 * Retorna a lista de pilots atualmente habilitados.
 * Útil para debug, admin panel e telemetria.
 *
 * @returns {PilotName[]}
 */
export function getActivePilots() {
  return /** @type {PilotName[]} */ (Object.keys(FLAG_REGISTRY)).filter((p) =>
    isPilotEnabled(/** @type {PilotName} */ (p))
  );
}

/**
 * Reseta todas as feature flags de pilots para o estado "não definido"
 * (o sistema volta a usar o window global ou o defaultValue).
 *
 * Usar em: admin panel, debug, reset de ambiente de teste.
 */
export function resetAllPilotFlags() {
  for (const config of Object.values(FLAG_REGISTRY)) {
    localStorage.removeItem(config.storageKey);
  }
}

/**
 * Retorna a chave de localStorage correspondente à flag de um pilot.
 * Para uso interno em bridges que precisam registrar storage listeners por chave.
 *
 * @param {PilotName} pilot
 * @returns {string | null}
 */
export function getPilotFlagStorageKey(pilot) {
  return FLAG_REGISTRY[pilot]?.storageKey ?? null;
}
