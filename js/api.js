const DEFAULT_SB_URL = 'https://eiycrokqwhmfmjackjni.supabase.co';
const DEFAULT_SB_KEY = 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';

const SB_URL =
  window.__SC_SUPABASE_URL__ ||
  localStorage.getItem('sc_supabase_url') ||
  DEFAULT_SB_URL;

const SB_KEY =
  window.__SC_SUPABASE_KEY__ ||
  localStorage.getItem('sc_supabase_key') ||
  DEFAULT_SB_KEY;

if (!window.__SC_SUPABASE_URL__ && !localStorage.getItem('sc_supabase_url')) {
  console.warn('Configuração: usando URL Supabase padrão do build. Recomenda-se configurar window.__SC_SUPABASE_URL__.');
}
if (!window.__SC_SUPABASE_KEY__ && !localStorage.getItem('sc_supabase_key')) {
  console.warn('Configuração: usando chave publishable padrão do build. Recomenda-se configurar window.__SC_SUPABASE_KEY__.');
}

const REQ_TIMEOUT_MS = Number(window.__SC_REQ_TIMEOUT_MS__ || 12000);
const RETRY_MAX = Number(window.__SC_RETRY_MAX__ || 2);
const RETRY_BASE_MS = Number(window.__SC_RETRY_BASE_MS__ || 250);
const AUTH_STORAGE_KEY = 'sc_auth_session_v1';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldRetry(status, err) {
  if (err?.name === 'AbortError') return true;
  if (status == null) return true;
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQ_TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

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
  if (lastErr) throw lastErr;
  throw new Error('Falha de rede persistente' + (lastStatus ? ` (HTTP ${lastStatus})` : ''));
}

function readAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeAuthSession(session) {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

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

async function refreshAuthSession(current) {
  if (!current?.refresh_token) return current;
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
  const prefer =
    method === 'POST'
      ? (params.includes('on_conflict')
          ? 'resolution=merge-duplicates,return=representation'
          : 'return=representation')
      : '';

  const authBearer = await getAuthBearerForRequest();

  const res = await resilientFetch(`${SB_URL}/rest/v1/${table}${params}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: authBearer,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const e = await res.text();
    console.error('Supabase erro', res.status, table, params, e);

    if (res.status === 401 || res.status === 403) {
      throw new Error('Chave inválida (' + res.status + '). Verifique SB_KEY.');
    }

    if (res.status === 404) {
      throw new Error('Tabela não encontrada: ' + table + '. Execute o SQL de criação.');
    }

    throw new Error(res.status + ': ' + e);
  }

  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function fmtDateYYYYMMDD(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
}

function mmdd(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}-${day}`;
}

function nextBirthdayDate(birthDate, baseDate = new Date()) {
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  let next = new Date(start.getFullYear(), b.getMonth(), b.getDate());
  next.setHours(0, 0, 0, 0);

  if (next < start) {
    next = new Date(start.getFullYear() + 1, b.getMonth(), b.getDate());
    next.setHours(0, 0, 0, 0);
  }

  return next;
}

function isBirthdayWithinDays(birthDate, baseDate = new Date(), maxDays = 0) {
  const limitDays = Math.max(0, Number(maxDays || 0));
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = addDays(start, limitDays);
  end.setHours(23, 59, 59, 999);

  const next = nextBirthdayDate(birthDate, start);
  if (!next) return false;

  return next >= start && next <= end;
}

export const SB = {
  signInWithPassword: async ({ email, password }) => {
    const res = await resilientFetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Login inválido (${res.status})${txt ? `: ${txt}` : ''}`);
    }
    const payload = normalizeSessionPayload(await res.json());
    if (!payload) throw new Error('Não foi possível iniciar sessão.');
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
  getUserPerfis: () =>
    sbReq('user_perfis', 'GET', null, '?select=user_id,papel,criado_em,atualizado_em&order=atualizado_em.desc'),
  upsertUserPerfil: payload =>
    sbReq('user_perfis', 'POST', payload, '?on_conflict=user_id'),
  deleteUserPerfil: userId =>
    sbReq(`user_perfis?user_id=eq.${userId}`, 'DELETE'),
  getUserFiliais: () =>
    sbReq('user_filiais', 'GET', null, '?select=user_id,filial_id,criado_em&order=criado_em.desc'),
  upsertUserFilial: payload =>
    sbReq('user_filiais', 'POST', payload, '?on_conflict=user_id,filial_id'),
  deleteUserFilial: (userId, filialId) =>
    sbReq(`user_filiais?user_id=eq.${userId}&filial_id=eq.${filialId}`, 'DELETE'),
  getAcessosAudit: () =>
    sbReq('acessos_auditoria', 'GET', null, '?select=id,ator_user_id,acao,recurso,alvo_user_id,alvo_filial_id,detalhes,criado_em&order=criado_em.desc'),
  logAcessoAdmin: payload =>
    sbReq('acessos_auditoria', 'POST', payload),
  fetchJsonWithRetry: async (url, opts = {}) => {
    const res = await resilientFetch(url, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {})
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${txt ? `: ${txt}` : ''}`);
    }
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  },
  getFiliais: () => sbReq('filiais', 'GET', null, '?order=criado_em'),
  upsertFilial: f => sbReq('filiais', 'POST', f, '?on_conflict=id'),
  deleteFilial: id => sbReq(`filiais?id=eq.${id}`, 'DELETE'),

  getProdutos: fid => sbReq('produtos', 'GET', null, `?filial_id=eq.${fid}&order=nome`),
  upsertProduto: p => sbReq('produtos', 'POST', p, '?on_conflict=id'),
  upsertProdutosLote: items => sbReq('produtos', 'POST', items, '?on_conflict=id'),
  deleteProduto: id => sbReq(`produtos?id=eq.${id}`, 'DELETE'),

  getClientes: fid => sbReq('clientes', 'GET', null, `?filial_id=eq.${fid}&order=nome`),
  upsertCliente: async c => {
    try{
      return await sbReq('clientes', 'POST', c, '?on_conflict=id');
    }catch(e){
      const msg = String(e?.message || '');
      const semColunaTime =
        msg.includes("Could not find the 'time' column") ||
        msg.includes('"time" column of') ||
        msg.includes('PGRST204');

      if(!semColunaTime) throw e;

      const { time, ...payloadLegado } = c || {};
      console.warn('Fallback upsertCliente sem coluna time. Aplique ALTER TABLE para persistir times.', time);
      return sbReq('clientes', 'POST', payloadLegado, '?on_conflict=id');
    }
  },
  deleteCliente: id => sbReq(`clientes?id=eq.${id}`, 'DELETE'),

  getPedidos: fid => sbReq('pedidos', 'GET', null, `?filial_id=eq.${fid}&order=num.desc`),
  upsertPedido: p => sbReq('pedidos', 'POST', p, '?on_conflict=id'),
  deletePedido: id => sbReq(`pedidos?id=eq.${id}`, 'DELETE'),

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
  getJogosAgenda: fid =>
    sbReq('jogos_agenda', 'GET', null, `?filial_id=eq.${fid}&order=data_hora.asc`),

  upsertJogoAgenda: j =>
    sbReq('jogos_agenda', 'POST', j, '?on_conflict=id'),

  deleteJogoAgenda: id =>
    sbReq(`jogos_agenda?id=eq.${id}`, 'DELETE'),

  // =====================================================
  // CAMPANHAS
  // =====================================================
  getCampanhas: fid =>
    sbReq('campanhas', 'GET', null, `?filial_id=eq.${fid}&order=criado_em.desc`),

  getCampanhasAll: () =>
    sbReq('campanhas', 'GET', null, '?order=criado_em.desc'),

  getCampanhaById: async id => {
    const r = await sbReq('campanhas', 'GET', null, `?id=eq.${id}&limit=1`);
    return r && r[0] ? r[0] : null;
  },

  upsertCampanha: c => sbReq('campanhas', 'POST', c, '?on_conflict=id'),

  deleteCampanha: id => sbReq(`campanhas?id=eq.${id}`, 'DELETE'),

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
  getCampanhaEnvios: fid =>
    sbReq('campanha_envios', 'GET', null, `?filial_id=eq.${fid}&order=criado_em.desc`),

  getCampanhaEnviosByCampanha: campanhaId =>
    sbReq('campanha_envios', 'GET', null, `?campanha_id=eq.${campanhaId}&order=criado_em.desc`),

  getCampanhaEnviosByCliente: clienteId =>
    sbReq('campanha_envios', 'GET', null, `?cliente_id=eq.${clienteId}&order=criado_em.desc`),

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
    const r = await sbReq(
      'campanha_envios',
      'GET',
      null,
      `?campanha_id=eq.${campanha_id}&cliente_id=eq.${cliente_id}&canal=eq.${canal}&data_ref=eq.${data_ref}&limit=1`
    );
    return !!(r && r.length);
  },

  // =====================================================
  // ANIVERSARIANTES / ELEGIBILIDADE
  // =====================================================
  getClientesComAniversario: fid =>
    sbReq(
      'clientes',
      'GET',
      null,
      `?filial_id=eq.${fid}&data_aniversario=not.is.null&order=nome`
    ),

  getAniversariantesDoDia: async (fid, baseDate = new Date()) => {
    const clientes = await sbReq(
      'clientes',
      'GET',
      null,
      `?filial_id=eq.${fid}&data_aniversario=not.is.null&order=nome`
    );

    const alvo = mmdd(baseDate);
    return (clientes || []).filter(c => c.data_aniversario && mmdd(c.data_aniversario) === alvo);
  },

  getAniversariantesProximos: async (fid, diasAntecedencia = 0, baseDate = new Date()) => {
    const clientes = await sbReq(
      'clientes',
      'GET',
      null,
      `?filial_id=eq.${fid}&data_aniversario=not.is.null&order=nome`
    );

    const alvo = mmdd(addDays(baseDate, diasAntecedencia));
    return (clientes || []).filter(c => c.data_aniversario && mmdd(c.data_aniversario) === alvo);
  },

  getClientesElegiveisCampanhaAniversario: async (fid, campanha, baseDate = new Date()) => {
    const clientes = await sbReq(
      'clientes',
      'GET',
      null,
      `?filial_id=eq.${fid}&data_aniversario=not.is.null&order=nome`
    );

    const dias = Number(campanha?.dias_antecedencia || 0);
    const canal = campanha?.canal || '';

    return (clientes || []).filter(c => {
      if (!c.data_aniversario) return false;
      if (!isBirthdayWithinDays(c.data_aniversario, baseDate, dias)) return false;

      if (canal === 'email') return !!c.optin_email && !!c.email;
      if (canal === 'sms') return !!c.optin_sms && !!c.tel;
      if (canal === 'whatsapp_manual') return !!c.optin_marketing && !!(c.whatsapp || c.tel);

      return !!c.optin_marketing;
    });
  },

  // =====================================================
  // UTILITÁRIOS DE CAMPANHA
  // =====================================================
  montarMensagemCampanha: ({ mensagem, cliente, campanha, validade = null }) => {
    let txt = String(mensagem || '');

    const desconto = campanha?.desconto
      ? `${Number(campanha.desconto)}%`
      : '';

    const cupom = campanha?.cupom || '';
    const nome = cliente?.nome || '';
    const apelido = cliente?.apelido || nome;
    const validadeFmt = validade
      ? fmtDateYYYYMMDD(validade)
      : fmtDateYYYYMMDD(addDays(new Date(), 7));

    txt = txt.replaceAll('{{nome}}', nome);
    txt = txt.replaceAll('{{apelido}}', apelido);
    txt = txt.replaceAll('{{desconto}}', desconto);
    txt = txt.replaceAll('{{cupom}}', cupom);
    txt = txt.replaceAll('{{validade}}', validadeFmt);

    return txt;
  }
};
