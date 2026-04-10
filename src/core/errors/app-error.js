// @ts-check

/**
 * Severidades padronizadas para erros da aplicação.
 * Permite que o error handler decida como apresentar/logar.
 */
export const ErrorSeverity = /** @type {const} */ ({
  FATAL: 'fatal', // boot failure, cannot continue
  ERROR: 'error', // operation failed, user must act
  WARNING: 'warning', // degraded but recoverable
  INFO: 'info' // expected negative path (not found, etc.)
});

/**
 * Domínios de erro para rastreamento e filtragem.
 */
export const ErrorDomain = /** @type {const} */ ({
  API: 'api',
  STORE: 'store',
  VALIDATION: 'validation',
  AUTH: 'auth',
  UI: 'ui',
  CONFIG: 'config'
});

/**
 * Erro estruturado da aplicação.
 * Substitui o padrão "catch(e){ notify(e.message) }" espalhado nos features.
 *
 * Vantagens sobre Error nativo:
 * - Domínio e severidade explícitos (facilita log/telemetria)
 * - Campo `cause` tipado para wrapping de erros originais
 * - Campo `context` para dados de diagnóstico sem expor ao usuário
 * - `userMessage` separado da mensagem técnica
 * - `retryable` para lógica de retry no SB layer
 */
export class AppError extends Error {
  /**
   * @param {{
   *   message: string
   *   userMessage?: string
   *   domain?: string
   *   severity?: string
   *   code?: string
   *   retryable?: boolean
   *   context?: Record<string, unknown>
   *   cause?: unknown
   * }} options
   */
  constructor({
    message,
    userMessage,
    domain = ErrorDomain.UI,
    severity = ErrorSeverity.ERROR,
    code = 'UNKNOWN',
    retryable = false,
    context = {},
    cause
  }) {
    super(message);
    this.name = 'AppError';
    /** @type {string} */
    this.userMessage = userMessage || message;
    /** @type {string} */
    this.domain = domain;
    /** @type {string} */
    this.severity = severity;
    /** @type {string} */
    this.code = code;
    /** @type {boolean} */
    this.retryable = retryable;
    /** @type {Record<string, unknown>} */
    this.context = context;
    /** @type {unknown} */
    this.cause = cause;
    /** @type {string} */
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Erro de validação de domínio (ex: campos obrigatórios, regras de negócio).
 * severity = WARNING pois é esperado — usuário deve corrigir o input.
 */
export class ValidationError extends AppError {
  /**
   * @param {{
   *   message: string
   *   userMessage?: string
   *   code?: string
   *   field?: string
   *   context?: Record<string, unknown>
   * }} options
   */
  constructor({ message, userMessage, code = 'VALIDATION_FAILED', field, context = {} }) {
    super({
      message,
      userMessage: userMessage || message,
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.WARNING,
      code,
      retryable: false,
      context: field ? { ...context, field } : context
    });
    this.name = 'ValidationError';
    /** @type {string | undefined} */
    this.field = field;
  }
}

/**
 * Erro de API / Supabase.
 * Wraps SbApiError em AppError para uniformidade.
 */
export class ApiError extends AppError {
  /**
   * @param {{
   *   message: string
   *   userMessage?: string
   *   code?: string
   *   status?: number
   *   operation?: string
   *   resource?: string
   *   retryable?: boolean
   *   cause?: unknown
   * }} options
   */
  constructor({
    message,
    userMessage,
    code,
    status,
    operation,
    resource,
    retryable = false,
    cause
  }) {
    super({
      message,
      userMessage: userMessage || 'Erro de comunicação com o servidor. Tente novamente.',
      domain: ErrorDomain.API,
      severity: ErrorSeverity.ERROR,
      code: code || 'API_ERROR',
      retryable,
      context: { status, operation, resource },
      cause
    });
    this.name = 'ApiError';
    /** @type {number | undefined} */
    this.status = status;
  }
}

/**
 * Converte qualquer erro desconhecido em AppError estruturado.
 * Usar no catch de boundaries para garantir shape uniforme.
 *
 * @param {unknown} err
 * @param {{ domain?: string, context?: Record<string, unknown> }} [opts]
 * @returns {AppError}
 */
export function toAppError(err, opts = {}) {
  if (err instanceof AppError) return err;

  const msg = err instanceof Error ? err.message : String(err ?? 'Erro desconhecido');
  return new AppError({
    message: msg,
    userMessage: 'Ocorreu um erro inesperado. Tente novamente.',
    domain: opts.domain || ErrorDomain.UI,
    severity: ErrorSeverity.ERROR,
    code: 'UNEXPECTED',
    cause: err,
    context: opts.context
  });
}
