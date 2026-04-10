// @ts-check

import { ErrorSeverity, toAppError } from './app-error.js';

/** @typedef {import('../errors/app-error.js').AppError} AppErrorType */

/**
 * Callback para apresentação ao usuário.
 * Injetado pelo bootstrap para desacoplar do shared/utils.
 * @type {((msg: string, severity: string) => void) | null}
 */
let _notifyFn = null;

/**
 * Callback para telemetria/log externo (opcional).
 * Pode ser Sentry, LogRocket, Datadog, etc.
 * @type {((err: AppErrorType) => void) | null}
 */
let _telemetryFn = null;

/**
 * Configura as dependências do error handler.
 * Chamado uma vez no boot, antes de qualquer render.
 *
 * @param {{
 *   notify: (msg: string, severity: string) => void
 *   telemetry?: (err: AppErrorType) => void
 * }} opts
 */
export function configureErrorHandler({ notify, telemetry }) {
  _notifyFn = notify;
  _telemetryFn = telemetry || null;
}

/**
 * Handler central de erros.
 *
 * Regras:
 * - FATAL: console.error + notify (sem recovery)
 * - ERROR: console.error + notify
 * - WARNING: console.warn + notify
 * - INFO: sem log, notifica de forma informativa
 *
 * A separação entre `message` (técnica) e `userMessage` (UI) garante
 * que detalhes internos não vazam para o usuário.
 *
 * @param {unknown} err
 * @param {{ silent?: boolean, context?: Record<string, unknown> }} [opts]
 * @returns {AppErrorType}
 */
export function handleError(err, opts = {}) {
  const appErr = toAppError(err, { context: opts.context });

  // Log estruturado para debugging — nunca vaza userMessage técnica
  const logPayload = {
    code: appErr.code,
    domain: appErr.domain,
    severity: appErr.severity,
    message: appErr.message,
    context: appErr.context,
    timestamp: appErr.timestamp,
    cause: appErr.cause instanceof Error ? appErr.cause.message : appErr.cause
  };

  switch (appErr.severity) {
    case ErrorSeverity.FATAL:
    case ErrorSeverity.ERROR:
      console.error('[AppError]', logPayload);
      break;
    case ErrorSeverity.WARNING:
      console.warn('[AppError]', logPayload);
      break;
    default:
    // INFO — sem ruído no console
  }

  // Telemetria externa (Sentry, etc.)
  if (_telemetryFn) {
    try {
      _telemetryFn(appErr);
    } catch {
      // telemetria nunca deve quebrar a aplicação
    }
  }

  // Notificação ao usuário
  if (!opts.silent && _notifyFn) {
    _notifyFn(appErr.userMessage, appErr.severity);
  }

  return appErr;
}

/**
 * Wrapper para funções async — captura, processa e retorna null em caso de erro.
 * Elimina o padrão try/catch repetido nos handlers de evento.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ context?: Record<string, unknown>, silent?: boolean }} [opts]
 * @returns {Promise<T | null>}
 *
 * @example
 * const result = await tryCatch(() => SB.salvarProduto(data), { context: { id: data.id } });
 * if(!result) return; // erro já foi tratado e exibido
 */
export async function tryCatch(fn, opts = {}) {
  try {
    return await fn();
  } catch (e) {
    handleError(e, opts);
    return null;
  }
}

/**
 * Versão síncrona do tryCatch.
 *
 * @template T
 * @param {() => T} fn
 * @param {{ context?: Record<string, unknown>, silent?: boolean }} [opts]
 * @returns {T | null}
 */
export function tryCatchSync(fn, opts = {}) {
  try {
    return fn();
  } catch (e) {
    handleError(e, opts);
    return null;
  }
}
