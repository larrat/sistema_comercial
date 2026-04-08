// @ts-check

(() => {
  // Configuracao publica de runtime. A publishable key do Supabase
  // nao e segredo e precisa estar disponivel tambem no ambiente publicado.
  window.__SC_SUPABASE_URL__ = window.__SC_SUPABASE_URL__ || 'https://eiycrokqwhmfmjackjni.supabase.co';
  window.__SC_SUPABASE_KEY__ = window.__SC_SUPABASE_KEY__ || 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';

  if (!localStorage.getItem('sc_supabase_url')) {
    localStorage.setItem('sc_supabase_url', window.__SC_SUPABASE_URL__);
  }
  if (!localStorage.getItem('sc_supabase_key')) {
    localStorage.setItem('sc_supabase_key', window.__SC_SUPABASE_KEY__);
  }
})();
