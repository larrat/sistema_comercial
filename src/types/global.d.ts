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
    __SC_SUPABASE_URL__?: string;
    __SC_SUPABASE_KEY__?: string;
    __SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__?: boolean;
    __SC_CLIENTES_REACT_ENABLED__?: boolean;
    __SC_DASHBOARD_REACT_ENABLED__?: boolean;
    __SC_TOGGLE_DASH_REACT__?: () => void;
    __SC_WARN_CONFIG__?: boolean;
    __SC_REQ_TIMEOUT_MS__?: number;
    __SC_RETRY_MAX__?: number;
    __SC_RETRY_BASE_MS__?: number;
    __SC_E2E_MODE__?: boolean;
    __SC_E2E_UI_CORE__?: boolean;
    __SC_DEBUG__?: Record<string, unknown>;
  }

  const XLSX: NonNullable<Window['XLSX']>;
}
