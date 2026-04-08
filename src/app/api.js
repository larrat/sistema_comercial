// @ts-check

/** @typedef {import('../types/domain').AuthSession} AuthSession */
/** @typedef {import('../types/domain').SbApiError} SbApiError */
/** @typedef {import('../types/domain').SbResult<unknown>} UnknownSbResult */
/** @typedef {import('../types/domain').Filial} Filial */
/** @typedef {import('../types/domain').Produto} Produto */
/** @typedef {import('../types/domain').Cliente} Cliente */
/** @typedef {import('../types/domain').Pedido} Pedido */
/** @typedef {import('../types/domain').Fornecedor} Fornecedor */
/** @typedef {import('../types/domain').JogoAgenda} JogoAgenda */
/** @typedef {import('../types/domain').Campanha} Campanha */
/** @typedef {import('../types/domain').CampanhaEnvio} CampanhaEnvio */
/** @typedef {import('../types/domain').UserPerfil} UserPerfil */
/** @typedef {import('../types/domain').AccessAdminReadData} AccessAdminReadData */
/** @typedef {import('../types/domain').AccessAdminOperationData} AccessAdminOperationData */
/** @typedef {import('../types/domain').CampanhaFilaResult} CampanhaFilaResult */

const LEGACY_DEFAULT_SB_URL = 'https://eiycrokqwhmfmjackjni.supabase.co';
const LEGACY_DEFAULT_SB_KEY = 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';
const ALLOW_LEGACY_SUPABASE_DEFAULTS = window.__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__ === true;
const WARN_CONFIG = window.__SC_WARN_CONFIG__ === true;

const CONFIGURED_SB_URL =
  window.__SC_SUPABASE_URL__ ||
  localStorage.getItem('sc_supabase_url') ||
  '';

const SB_URL =
  CONFIGURED_SB_URL ||
  (ALLOW_LEGACY_SUPABASE_DEFAULTS ? LEGACY_DEFAULT_SB_URL : '');

const CONFIGURED_SB_KEY =
  window.__SC_SUPABASE_KEY__ ||
  localStorage.getItem('sc_supabase_key') ||
  '';

const SB_KEY =
  CONFIGURED_SB_KEY ||
  (ALLOW_LEGACY_SUPABASE_DEFAULTS ? LEGACY_DEFAULT_SB_KEY : '');

if (WARN_CONFIG && ALLOW_LEGACY_SUPABASE_DEFAULTS) {
  console.warn('Configuracao: usando defaults legados do Supabase por opt-in explicito. Recomenda-se configurar window.__SC_SUPABASE_URL__ e window.__SC_SUPABASE_KEY__.');
}
if (WARN_CONFIG && !CONFIGURED_SB_URL && !ALLOW_LEGACY_SUPABASE_DEFAULTS) {
  console.warn('Configuracao: URL do Supabase ausente. Configure window.__SC_SUPABASE_URL__ ou grave sc_supabase_url no localStorage.');
}
if (WARN_CONFIG && !CONFIGURED_SB_KEY && !ALLOW_LEGACY_SUPABASE_DEFAULTS) {
  console.warn('Configuracao: chave publishable do Supabase ausente. Configure window.__SC_SUPABASE_KEY__ ou grave sc_supabase_key no localStorage.');
}

const REQ_TIMEOUT_MS = Number(window.__SC_REQ_TIMEOUT_MS__ || 12000);
const RETRY_MAX = Number(window.__SC_RETRY_MAX__ || 2);
const RETRY_BASE_MS = Number(window.__SC_RETRY_BASE_MS__ || 250);
const AUTH_STORAGE_KEY = 'sc_auth_session_v1';

function ensureSupabaseConfig() {
  if (SB_URL && SB_KEY) return;
  throw createSbError({
    message: 'Configuracao obrigatoria do Supabase ausente. Defina window.__SC_SUPABASE_URL__ e window.__SC_SUPABASE_KEY__ antes de iniciar o app, ou grave sc_supabase_url/sc_supabase_key no localStorage. Para transicao local controlada, use window.__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__ = true.',
    code: 'SB_CONFIG_MISSING',
    source: 'config',
    operation: 'bootstrap',
    retryable: false
  });
}

/**
 * @param {number} ms
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @param {number | null | undefined} status
 * @param {unknown} err
 */
function shouldRetry(status, err) {
  if (err instanceof Error && err.name === 'AbortError') return true;
  if (status == null) return true;
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

/**
 * @param {{
 *   message?: string;
 *   status?: number | null;
 *   code?: string;
 *   source?: string;
 *   operation?: string;
 *   resource?: string | null;
 *   details?: unknown;
 *   retryable?: boolean;
 *   cause?: unknown;
 * }} [input]
 * @returns {SbApiError}
 */
function createSbError({
  message,
  status = null,
  code = 'SB_UNKNOWN',
  source = 'api',
  operation = 'unknown',
  resource = null,
  details = null,
  retryable = false,
  cause = null
} = {}) {
  const err = /** @type {SbApiError} */ (new Error(message || 'Falha inesperada na camada SB.'));
  err.name = 'SbApiError';
  err.status = status;
  err.code = code;
  err.source = source;
  err.operation = operation;
  err.resource = resource;
  err.details = details;
  err.retryable = retryable;
  if (cause) err.cause = cause;
  return err;
}

/**
 * @param {unknown} err
 * @param {{
 *   message?: string;
 *   status?: number | null;
 *   code?: string;
 *   source?: string;
 *   operation?: string;
 *   resource?: string | null;
 *   details?: unknown;
 *   retryable?: boolean;
 * }} [fallback]
 * @returns {SbApiError}
 */
function normalizeSbError(err, fallback = {}) {
  if (err instanceof Error && err.name === 'SbApiError') return /** @type {SbApiError} */ (err);
  return createSbError({
    message: err instanceof Error ? err.message : fallback.message || 'Falha inesperada na camada SB.',
    status: err && typeof err === 'object' && 'status' in err ? /** @type {{status?: number | null}} */ (err).status ?? fallback.status ?? null : fallback.status ?? null,
    code: err && typeof err === 'object' && 'code' in err ? String(/** @type {{code?: unknown}} */ (err).code || fallback.code || 'SB_UNHANDLED') : fallback.code || 'SB_UNHANDLED',
    source: err && typeof err === 'object' && 'source' in err ? String(/** @type {{source?: unknown}} */ (err).source || fallback.source || 'api') : fallback.source || 'api',
    operation: err && typeof err === 'object' && 'operation' in err ? String(/** @type {{operation?: unknown}} */ (err).operation || fallback.operation || 'unknown') : fallback.operation || 'unknown',
    resource: err && typeof err === 'object' && 'resource' in err ? /** @type {{resource?: string | null}} */ (err).resource || fallback.resource || null : fallback.resource || null,
    details: err && typeof err === 'object' && 'details' in err ? /** @type {{details?: unknown}} */ (err).details || fallback.details || null : fallback.details || null,
    retryable: err && typeof err === 'object' && 'retryable' in err && typeof /** @type {{retryable?: unknown}} */ (err).retryable === 'boolean'
      ? /** @type {{retryable: boolean}} */ (err).retryable
      : !!fallback.retryable,
    cause: err
  });
}

/**
 * @param {Response} res
 * @returns {Promise<any>}
 */
async function readResponseData(res) {
  const txt = await res.text().catch(() => '');
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

/**
 * @param {number} status
 * @param {string} resource
 * @param {string} operation
 * @param {unknown} details
 * @returns {SbApiError}
 */
function buildSupabaseHttpError(status, resource, operation, details) {
  if (status === 401 || status === 403) {
    return createSbError({
      message: `Acesso negado ao recurso ${resource} (${status}). Verifique sessao, papel e politicas RLS.`,
      status,
      code: 'SB_AUTH_FORBIDDEN',
      source: 'supabase',
      operation,
      resource,
      details,
      retryable: false
    });
  }

  if (status === 404) {
    return createSbError({
      message: `Recurso nao encontrado: ${resource}. Verifique schema e migrations aplicadas.`,
      status,
      code: 'SB_RESOURCE_NOT_FOUND',
      source: 'supabase',
      operation,
      resource,
      details,
      retryable: false
    });
  }

  return createSbError({
    message: `Falha HTTP ${status} na operacao ${operation} de ${resource}.`,
    status,
    code: 'SB_HTTP_ERROR',
    source: 'supabase',
    operation,
    resource,
    details,
    retryable: shouldRetry(status)
  });
}

/**
 * @template T
 * @param {Promise<T> | (() => Promise<T>)} promiseOrFactory
 * @returns {Promise<import('../types/domain').SbResult<T>>}
 */
async function toSbResult(promiseOrFactory) {
  try {
    const data = await (typeof promiseOrFactory === 'function' ? promiseOrFactory() : promiseOrFactory);
    return { ok: true, data, error: null };
  } catch (err) {
    return { ok: false, data: null, error: normalizeSbError(err) };
  }
}

/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs]
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQ_TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} url
 * @param {RequestInit} [options]
 */
async function resilientFetch(url, options = {}) {
  let lastErr = null;
  let lastStatus = null;
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options, REQ_TIMEOUT_MS);
      if (!res.ok && shouldRetry(res.status)) {
        lastStatus = res.status;
        if (attempt < RETRY_MAX) {
          await delay(RETRY_BASE_MS * (attempt + 1));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (!shouldRetry(null, err) || attempt >= RETRY_MAX) {
        throw err;
      }
      await delay(RETRY_BASE_MS * (attempt + 1));
    }
  }
  if (lastErr) {
    throw createSbError({
      message: 'Falha de rede persistente.',
      status: lastErr?.status ?? null,
      code: 'SB_NETWORK_ERROR',
      source: 'network',
      operation: 'fetch',
      details: { url, method: options?.method || 'GET' },
      retryable: true,
      cause: lastErr
    });
  }
  throw createSbError({
    message: 'Falha de rede persistente' + (lastStatus ? ` (HTTP ${lastStatus})` : ''),
    status: lastStatus,
    code: 'SB_NETWORK_ERROR',
    source: 'network',
    operation: 'fetch',
    details: { url, method: options?.method || 'GET' },
    retryable: true
  });
}

/**
 * @returns {AuthSession | null}
 */
function readAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

/**
 * @param {AuthSession | null} session
 */
function writeAuthSession(session) {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

/**
 * @param {any} payload
 * @returns {AuthSession | null}
 */
function normalizeSessionPayload(payload) {
  if (!payload || !payload.access_token) return null;
  const expiresAt =
    Number(payload.expires_at || 0) ||
    Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600);
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || '',
    token_type: payload.token_type || 'bearer',
    expires_in: Number(payload.expires_in || 3600),
    expires_at: expiresAt,
    user: payload.user || null
  };
}

/**
 * @param {AuthSession | null} current
 * @returns {Promise<AuthSession | null>}
 */
async function refreshAuthSession(current) {
  if (!current?.refresh_token) return current;
  ensureSupabaseConfig();
  const res = await resilientFetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: current.refresh_token })
  });
  if (!res.ok) {
    writeAuthSession(null);
    return null;
  }
  const raw = await res.json();
  const next = normalizeSessionPayload(raw);
  writeAuthSession(next);
  return next;
}

async function getActiveAuthSession() {
  const s = readAuthSession();
  if (!s?.access_token) return null;
  const now = Math.floor(Date.now() / 1000);
  if (Number(s.expires_at || 0) > now + 45) return s;
  return refreshAuthSession(s);
}

async function getAuthBearerForRequest() {
  const s = await getActiveAuthSession();
  return s?.access_token ? ('Bearer ' + s.access_token) : ('Bearer ' + SB_KEY);
}

async function sbReq(table, method = 'GET', body = null, params = '') {
  ensureSupabaseConfig();
  const operation = `${method} ${table}`;
  const prefer =
    method === 'POST'
      ? (params.includes('on_conflict')
          ? 'resolution=merge-duplicates,return=representation'
          : 'return=representation')
      : '';

  const authBearer = await getAuthBearerForRequest();

  let res;
  try {
    res = await resilientFetch(`${SB_URL}/rest/v1/${table}${params}`, {
      method,
      headers: {
        apikey: SB_KEY,
        Authorization: authBearer,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    throw normalizeSbError(err, {
      code: 'SB_REQUEST_FAILED',
      source: 'supabase',
      operation,
      resource: table,
      details: { method, params }
    });
  }

  const data = /** @type {any} */ (await readResponseData(res));
  if (!res.ok) {
    console.error('Supabase erro', {
      status: res.status,
      table,
      params,
      method,
      data
    });
    throw buildSupabaseHttpError(res.status, table, operation, {
      method,
      params,
      response: data
    });
  }

  return data;
}

async function invokeEdgeFunction(functionName, payload = {}, { method = 'POST', query = null } = {}) {
  ensureSupabaseConfig();
  const session = await getActiveAuthSession();
  if (!session?.access_token) {
    throw createSbError({
      message: 'Sessao autenticada obrigatoria para invocar Edge Function.',
      code: 'SB_EDGE_AUTH_REQUIRED',
      source: 'edge',
      operation: method,
      resource: functionName,
      retryable: false
    });
  }

  let res;
  const queryString = query && typeof query === 'object'
    ? `?${new URLSearchParams(
      Object.entries(query)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => [key, String(value)])
    ).toString()}`
    : '';
  const url = `${SB_URL}/functions/v1/${functionName}${queryString}`;
  try {
    res = await resilientFetch(url, {
      method,
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      },
      body: method === 'GET' || !payload ? undefined : JSON.stringify(payload)
    });
  } catch (err) {
    throw normalizeSbError(err, {
      code: 'SB_EDGE_FETCH_FAILED',
      source: 'edge',
      operation: method,
      resource: functionName
    });
  }

  const data = await readResponseData(res);
  if (!res.ok) {
    throw createSbError({
      message: `Falha ao invocar Edge Function ${functionName} (${res.status}).`,
      status: res.status,
      code: 'SB_EDGE_HTTP_ERROR',
      source: 'edge',
      operation: method,
      resource: functionName,
      details: data,
      retryable: shouldRetry(res.status)
    });
  }

  if (data?.ok === false) {
    throw createSbError({
      message: data?.error?.message || `Edge Function ${functionName} retornou erro de dominio.`,
      status: res.status,
      code: data?.error?.code || 'SB_EDGE_DOMAIN_ERROR',
      source: 'edge',
      operation: method,
      resource: functionName,
      details: data?.error?.details || data,
      retryable: false
    });
  }

  return data?.data ?? data;
}

export const SB = {
  contractVersion: 'v1',
  normalizeError: normalizeSbError,
  toResult: toSbResult,
  isSbError: err => err?.name === 'SbApiError',
  signInWithPassword: async ({ email, password }) => {
    ensureSupabaseConfig();
    let res;
    try {
      res = await resilientFetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
    } catch (err) {
      throw normalizeSbError(err, {
        code: 'SB_AUTH_LOGIN_FAILED',
        source: 'auth',
        operation: 'signInWithPassword',
        resource: 'auth_session',
        details: { email }
      });
    }
    const data = await readResponseData(res);
    if (!res.ok) {
      throw createSbError({
        message: `Login invalido (${res.status}).`,
        status: res.status,
        code: 'SB_AUTH_INVALID_CREDENTIALS',
        source: 'auth',
        operation: 'signInWithPassword',
        resource: 'auth_session',
        details: { email, response: data },
        retryable: false
      });
    }
    const payload = normalizeSessionPayload(data);
    if (!payload) {
      throw createSbError({
        message: 'Nao foi possivel iniciar sessao.',
        code: 'SB_AUTH_INVALID_PAYLOAD',
        source: 'auth',
        operation: 'signInWithPassword',
        resource: 'auth_session',
        details: { email, response: data },
        retryable: false
      });
    }
    writeAuthSession(payload);
    return payload;
  },
  signOut: async () => {
    const s = readAuthSession();
    if (s?.access_token) {
      await resilientFetch(`${SB_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: 'Bearer ' + s.access_token,
          'Content-Type': 'application/json'
        }
      }).catch(() => null);
    }
    writeAuthSession(null);
  },
  getSession: async () => getActiveAuthSession(),
  clearSession: () => writeAuthSession(null),
  getMeuPerfil: async (userId = null) => {
    const session = await getActiveAuthSession();
    const uid = userId || session?.user?.id;
    if (!uid) return null;
    const r = await sbReq(
      'user_perfis',
      'GET',
      null,
      `?user_id=eq.${uid}&select=user_id,papel&limit=1`
    );
    return r && r[0] ? r[0] : null;
  },
  /** @param {Record<string, unknown>} payload @returns {Promise<AccessAdminOperationData>} */
  acessosAdminEdge: payload =>
    invokeEdgeFunction('acessos-admin', payload),
  /** @param {{ auditoria_limit?: number }} [params] @returns {Promise<AccessAdminReadData>} */
  getAcessosAdminReadEdge: ({ auditoria_limit = 100 } = {}) =>
    invokeEdgeFunction('acessos-admin-read', null, {
      method: 'GET',
      query: { auditoria_limit }
    }),
  upsertUserPerfilEdge: ({ user_id, papel, detalhes = {} }) =>
    invokeEdgeFunction('acessos-admin', {
      action: 'perfil_upsert',
      alvo_user_id: user_id,
      papel,
      detalhes
    }),
  deleteUserPerfilEdge: (userId, detalhes = {}) =>
    invokeEdgeFunction('acessos-admin', {
      action: 'perfil_delete',
      alvo_user_id: userId,
      detalhes
    }),
  upsertUserFilialEdge: ({ user_id, filial_id, detalhes = {} }) =>
    invokeEdgeFunction('acessos-admin', {
      action: 'vinculo_upsert',
      alvo_user_id: user_id,
      alvo_filial_id: filial_id,
      detalhes
    }),
  deleteUserFilialEdge: (userId, filialId, detalhes = {}) =>
    invokeEdgeFunction('acessos-admin', {
      action: 'vinculo_delete',
      alvo_user_id: userId,
      alvo_filial_id: filialId,
      detalhes
    }),
  fetchJsonWithRetry: async (url, opts = {}) => {
    let res;
    try {
      res = await resilientFetch(url, {
        method: opts.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(opts.headers || {})
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (err) {
      throw normalizeSbError(err, {
        code: 'SB_EXTERNAL_FETCH_FAILED',
        source: 'external',
        operation: opts.method || 'GET',
        resource: url
      });
    }
    const data = await readResponseData(res);
    if (!res.ok) {
      throw createSbError({
        message: `Falha HTTP ${res.status} ao consultar recurso externo.`,
        status: res.status,
        code: 'SB_EXTERNAL_HTTP_ERROR',
        source: 'external',
        operation: opts.method || 'GET',
        resource: url,
        details: { response: data },
        retryable: shouldRetry(res.status)
      });
    }
    return data;
  },
  invokeEdgeFunction,
  /** @returns {Promise<Filial[]>} */
  getFiliais: () => sbReq('filiais', 'GET', null, '?order=criado_em'),
  upsertFilial: f => sbReq('filiais', 'POST', f, '?on_conflict=id'),
  deleteFilial: id => sbReq(`filiais?id=eq.${id}`, 'DELETE'),

  /** @param {string} fid @returns {Promise<Produto[]>} */
  getProdutos: fid => sbReq('produtos', 'GET', null, `?filial_id=eq.${fid}&order=nome`),
  upsertProduto: p => sbReq('produtos', 'POST', p, '?on_conflict=id'),
  upsertProdutosLote: items => sbReq('produtos', 'POST', items, '?on_conflict=id'),
  deleteProduto: id => sbReq(`produtos?id=eq.${id}`, 'DELETE'),

  /** @param {string} fid @returns {Promise<Cliente[]>} */
  getClientes: fid => sbReq('clientes', 'GET', null, `?filial_id=eq.${fid}&order=nome`),
  upsertCliente: c => sbReq('clientes', 'POST', c, '?on_conflict=id'),
  deleteCliente: id => sbReq(`clientes?id=eq.${id}`, 'DELETE'),

  /** @param {string} fid @returns {Promise<Pedido[]>} */
  getPedidos: fid => sbReq('pedidos', 'GET', null, `?filial_id=eq.${fid}&order=num.desc`),
  upsertPedido: p => sbReq('pedidos', 'POST', p, '?on_conflict=id'),
  deletePedido: id => sbReq(`pedidos?id=eq.${id}`, 'DELETE'),

  /** @param {string} fid @returns {Promise<Fornecedor[]>} */
  getFornecedores: fid => sbReq('fornecedores', 'GET', null, `?filial_id=eq.${fid}&order=nome`),
  upsertFornecedor: f => sbReq('fornecedores', 'POST', f, '?on_conflict=id'),
  deleteFornecedor: id => sbReq(`fornecedores?id=eq.${id}`, 'DELETE'),

  getCotPrecos: fid => sbReq('cotacao_precos', 'GET', null, `?filial_id=eq.${fid}`),
  upsertCotPreco: p => sbReq('cotacao_precos', 'POST', p, '?on_conflict=filial_id,produto_id,fornecedor_id'),
  upsertCotPrecosLote: items =>
    sbReq('cotacao_precos', 'POST', items, '?on_conflict=filial_id,produto_id,fornecedor_id'),
  deleteCotPreco: (fid, pid, fnid) =>
    sbReq(`cotacao_precos?filial_id=eq.${fid}&produto_id=eq.${pid}&fornecedor_id=eq.${fnid}`, 'DELETE'),

  getCotHistorico: fid =>
    sbReq('cotacao_historico', 'GET', null, `?filial_id=eq.${fid}&order=mes_ref.desc`),

  upsertCotHistorico: h =>
    sbReq('cotacao_historico', 'POST', h, '?on_conflict=filial_id,produto_id,fornecedor_id,mes_ref'),

  upsertCotHistoricoLote: items =>
    sbReq('cotacao_historico', 'POST', items, '?on_conflict=filial_id,produto_id,fornecedor_id,mes_ref'),

  getCotLayout: async (filialId, fornecedorId) => {
    const r = await sbReq(
      'cotacao_layouts',
      'GET',
      null,
      `?filial_id=eq.${filialId}&fornecedor_id=eq.${fornecedorId}&limit=1`
    );
    return r && r[0] ? r[0] : null;
  },

  upsertCotLayout: layout =>
    sbReq('cotacao_layouts', 'POST', layout, '?on_conflict=filial_id,fornecedor_id'),

  getCotConfig: fid =>
    sbReq('cotacao_config', 'GET', null, `?filial_id=eq.${fid}`).then(r => r && r[0]),

  upsertCotConfig: c => sbReq('cotacao_config', 'POST', c, '?on_conflict=filial_id'),

  getMovs: fid => sbReq('movimentacoes', 'GET', null, `?filial_id=eq.${fid}&order=ts.asc`),
  insertMov: m => sbReq('movimentacoes', 'POST', m, ''),
  deleteMov: id => sbReq(`movimentacoes?id=eq.${id}`, 'DELETE'),

  getNotas: cid => sbReq('notas', 'GET', null, `?cliente_id=eq.${cid}&order=criado_em.desc`),
  insertNota: n => sbReq('notas', 'POST', n, ''),

  // =====================================================
  // AGENDA DE JOGOS
  // =====================================================
  /** @param {string} fid @returns {Promise<JogoAgenda[]>} */
  getJogosAgenda: fid =>
    sbReq('jogos_agenda', 'GET', null, `?filial_id=eq.${fid}&order=data_hora.asc`),

  upsertJogoAgenda: j =>
    sbReq('jogos_agenda', 'POST', j, '?on_conflict=id'),

  deleteJogoAgenda: id =>
    sbReq(`jogos_agenda?id=eq.${id}`, 'DELETE'),

  // =====================================================
  // CAMPANHAS
  // =====================================================
  /** @param {string} fid @returns {Promise<Campanha[]>} */
  getCampanhas: fid =>
    sbReq('campanhas', 'GET', null, `?filial_id=eq.${fid}&order=criado_em.desc`),

  /** @returns {Promise<Campanha[]>} */
  getCampanhasAll: () =>
    sbReq('campanhas', 'GET', null, '?order=criado_em.desc'),

  /** @param {string} id @returns {Promise<Campanha | null>} */
  getCampanhaById: async id => {
    const r = await sbReq('campanhas', 'GET', null, `?id=eq.${id}&limit=1`);
    return r && r[0] ? r[0] : null;
  },

  upsertCampanha: c => sbReq('campanhas', 'POST', c, '?on_conflict=id'),

  deleteCampanha: id => sbReq(`campanhas?id=eq.${id}`, 'DELETE'),

  /** @param {string} fid @returns {Promise<Campanha[]>} */
  getCampanhasAtivasAniversario: fid =>
    sbReq(
      'campanhas',
      'GET',
      null,
      `?filial_id=eq.${fid}&tipo=eq.aniversario&ativo=eq.true&order=criado_em.desc`
    ),

  // =====================================================
  // CAMPANHA_ENVIOS
  // =====================================================
  /** @param {string} fid @returns {Promise<CampanhaEnvio[]>} */
  getCampanhaEnvios: fid =>
    sbReq('campanha_envios', 'GET', null, `?filial_id=eq.${fid}&order=criado_em.desc`),

  /** @param {string} campanhaId @returns {Promise<CampanhaEnvio[]>} */
  getCampanhaEnviosByCampanha: campanhaId =>
    sbReq('campanha_envios', 'GET', null, `?campanha_id=eq.${campanhaId}&order=criado_em.desc`),

  /** @param {string} clienteId @returns {Promise<CampanhaEnvio[]>} */
  getCampanhaEnviosByCliente: clienteId =>
    sbReq('campanha_envios', 'GET', null, `?cliente_id=eq.${clienteId}&order=criado_em.desc`),

  /** @param {string} fid @returns {Promise<CampanhaEnvio[]>} */
  getCampanhaEnviosPendentes: fid =>
    sbReq(
      'campanha_envios',
      'GET',
      null,
      `?filial_id=eq.${fid}&status=eq.pendente&order=criado_em.desc`
    ),

  insertCampanhaEnvio: envio =>
    sbReq('campanha_envios', 'POST', envio, ''),

  upsertCampanhaEnvio: envio =>
    sbReq(
      'campanha_envios',
      'POST',
      envio,
      '?on_conflict=campanha_id,cliente_id,canal,data_ref'
    ),

  updateCampanhaEnvio: envio =>
    sbReq('campanha_envios', 'POST', envio, '?on_conflict=id'),

  deleteCampanhaEnvio: id =>
    sbReq(`campanha_envios?id=eq.${id}`, 'DELETE'),

  existeCampanhaEnvioNoDia: async ({ campanha_id, cliente_id, canal, data_ref }) => {
    const r = /** @type {any[] | null} */ (await sbReq(
      'campanha_envios',
      'GET',
      null,
      `?campanha_id=eq.${campanha_id}&cliente_id=eq.${cliente_id}&canal=eq.${canal}&data_ref=eq.${data_ref}&limit=1`
    ));
    return !!(r && r.length);
  },
  /** @param {string} campanha_id @param {boolean} [dry_run=false] @returns {Promise<CampanhaFilaResult>} */
  gerarFilaCampanhaEdge: (campanha_id, dry_run = false) =>
    invokeEdgeFunction('campanhas-gerar-fila', { campanha_id, dry_run }),

};
