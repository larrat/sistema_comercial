// @ts-check

(() => {
  const host = window.location.hostname || '';
  const protocol = window.location.protocol || '';
  const isPrivateIpv4 =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  const isLocalRuntime =
    protocol === 'file:' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local') ||
    isPrivateIpv4;

  if (!isLocalRuntime) return;

  // Bootstrap local explicito para desenvolvimento e automacao.
  // Em ambientes publicados, este arquivo nao injeta configuracao.
  window.__SC_SUPABASE_URL__ = window.__SC_SUPABASE_URL__ || 'https://eiycrokqwhmfmjackjni.supabase.co';
  window.__SC_SUPABASE_KEY__ = window.__SC_SUPABASE_KEY__ || 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';
  localStorage.setItem('sc_supabase_url', window.__SC_SUPABASE_URL__);
  localStorage.setItem('sc_supabase_key', window.__SC_SUPABASE_KEY__);

  // Warnings locais ajudam a diagnosticar configuracao e contratos em ambiente de dev.
  window.__SC_WARN_CONFIG__ = typeof window.__SC_WARN_CONFIG__ === 'boolean'
    ? window.__SC_WARN_CONFIG__
    : true;

  // Timeouts/retries um pouco mais tolerantes para ambiente local e E2E.
  window.__SC_REQ_TIMEOUT_MS__ = Number(window.__SC_REQ_TIMEOUT_MS__ || 15000);
  window.__SC_RETRY_MAX__ = Number(window.__SC_RETRY_MAX__ || 1);
  window.__SC_RETRY_BASE_MS__ = Number(window.__SC_RETRY_BASE_MS__ || 200);

  // Flags explicitas da Onda B / smoke UI.
  window.__SC_E2E_MODE__ = window.__SC_E2E_MODE__ === true;
  window.__SC_E2E_UI_CORE__ = window.__SC_E2E_UI_CORE__ === true;
})();
