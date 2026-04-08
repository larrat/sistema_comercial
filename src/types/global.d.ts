export {};

declare global {
  interface HTMLElement {
    value?: string;
    checked?: boolean;
  }

  interface Window {
    __SC_SUPABASE_URL__?: string;
    __SC_SUPABASE_KEY__?: string;
    __SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__?: boolean;
    __SC_WARN_CONFIG__?: boolean;
    __SC_REQ_TIMEOUT_MS__?: number;
    __SC_RETRY_MAX__?: number;
    __SC_RETRY_BASE_MS__?: number;
    __SC_E2E_MODE__?: boolean;
    __SC_E2E_UI_CORE__?: boolean;
  }
}
