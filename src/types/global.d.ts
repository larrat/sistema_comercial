export {};

// Permite import de CSS como side-effect em arquivos TS/TSX
declare module '*.css' {
  const _: string;
  export default _;
}

declare global {
  interface HTMLElement {
    value?: string;
    checked?: boolean;
    disabled?: boolean;
    dataset: DOMStringMap;
    type?: string;
    selectedIndex?: number;
    options?: HTMLOptionsCollection;
    select?: () => void;
  }

  interface CustomEvent<T = unknown> extends Event {
    readonly detail: T;
  }

  type XlsxWorkbook = {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };

  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer, options?: Record<string, unknown>) => XlsxWorkbook;
      utils: {
        sheet_to_json: (
          sheet: unknown,
          options?: Record<string, unknown>
        ) => Array<Array<string | number | null | undefined>>;
      };
    };
  }

  interface Window {
    // ── Configuração injetada pelo backend / index.html ───────────────────────
    __SC_SUPABASE_URL__?: string;
    __SC_SUPABASE_KEY__?: string;
    __SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__?: boolean;
    __SC_WARN_CONFIG__?: boolean;
    __SC_REQ_TIMEOUT_MS__?: number;
    __SC_RETRY_MAX__?: number;
    __SC_RETRY_BASE_MS__?: number;
    __SC_BACKEND_MODE__?: 'online' | 'degraded';
    __SC_BACKEND_REASON__?: string;
    __SC_E2E_MODE__?: boolean;
    __SC_E2E_UI_CORE__?: boolean;
    __SC_DEBUG__?: Record<string, unknown>;

    // ── Sessão e filial (compartilhados legado ↔ React bridges) ─────────────
    __SC_AUTH_SESSION__?: {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      expires_at: number;
      user: Record<string, unknown> | null;
    };
    __SC_FILIAL_ID__?: string;
    __SC_USER_ROLE__?: 'operador' | 'gerente' | 'admin' | string;

    // ── Feature flags de pilots (legíveis pelos bridges legados) ─────────────
    __SC_CLIENTES_REACT_ENABLED__?: boolean;
    __SC_DASHBOARD_REACT_ENABLED__?: boolean;
    __SC_PEDIDOS_REACT_ENABLED__?: boolean;
    __SC_RECEBER_REACT_ENABLED__?: boolean;
    __SC_PRODUTOS_REACT_ENABLED__?: boolean;

    // ── Direct bridge interfaces (publicadas pelos bundles React) ────────────
    __SC_CLIENTES_DIRECT_BRIDGE__?: {
      mount: (el: HTMLElement) => void;
      unmount: () => void;
    };
    __SC_DASHBOARD_DIRECT_BRIDGE__?: {
      mount: (el: HTMLElement) => void;
      unmount: () => void;
    };
    __SC_PEDIDOS_DIRECT_BRIDGE__?: {
      mount: (el: HTMLElement) => void;
      unmount: () => void;
    };
    __SC_RECEBER_DIRECT_BRIDGE__?: {
      mount: (el: HTMLElement) => void;
      unmount: () => void;
    };
    __SC_PRODUTOS_DIRECT_BRIDGE__?: {
      mount: (el: HTMLElement) => void;
      unmount: () => void;
    };

    // ── Funções de controle expostas ao shell ─────────────────────────────────
    __SC_TOGGLE_DASH_REACT__?: () => void;
  }

  const XLSX: NonNullable<Window['XLSX']>;
}
