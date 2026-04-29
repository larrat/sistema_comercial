const ANALYTICS_STORAGE_KEY = 'sc_internal_analytics_v1';
const MAX_STORED_EVENTS = 200;
const MAX_METADATA_DEPTH = 3;
const MAX_METADATA_KEYS = 20;
const MAX_ARRAY_ITEMS = 10;
const MAX_STRING_LENGTH = 80;

const SENSITIVE_KEY_PATTERN =
  /(name|nome|email|mail|doc|cpf|cnpj|tel|phone|whats|address|endereco|addr|obs|note|notes|message|text|content|body|query|search|term|q|senha|password|token|secret)/i;

export type AnalyticsResult = 'success' | 'error' | 'partial' | 'cancelled' | 'noop';

export type AnalyticsMetadata =
  | string
  | number
  | boolean
  | null
  | AnalyticsMetadata[]
  | { [key: string]: AnalyticsMetadata };

export type AnalyticsEventInput = {
  event_name: string;
  module: string;
  user_id?: string | null;
  tenant_id?: string | null;
  route?: string | null;
  metadata?: Record<string, AnalyticsMetadata>;
  result?: AnalyticsResult | string | null;
  timestamp?: string;
};

export type AnalyticsEventRecord = {
  id: string;
  event_name: string;
  module: string;
  user_id: string | null;
  tenant_id: string | null;
  route: string;
  timestamp: string;
  metadata: Record<string, AnalyticsMetadata>;
  result: string | null;
};

function safeNowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return String(Date.now());
  }
}

function generateEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `analytics-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function looksSensitiveString(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes('@')) return true;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 8) return true;
  return false;
}

function sanitizePrimitive(key: string, value: unknown): AnalyticsMetadata | undefined {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    if (SENSITIVE_KEY_PATTERN.test(key) || looksSensitiveString(value)) return undefined;
    const normalized = value.trim();
    if (!normalized) return '';
    return normalized.slice(0, MAX_STRING_LENGTH);
  }
  return undefined;
}

function sanitizeMetadataValue(
  key: string,
  value: unknown,
  depth: number
): AnalyticsMetadata | undefined {
  const primitive = sanitizePrimitive(key, value);
  if (primitive !== undefined) return primitive;
  if (depth >= MAX_METADATA_DEPTH) return undefined;

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item, index) => sanitizeMetadataValue(`${key}_${index}`, item, depth + 1))
      .filter((item): item is AnalyticsMetadata => item !== undefined);
    return items;
  }

  if (isPlainObject(value)) {
    const nextEntries = Object.entries(value)
      .slice(0, MAX_METADATA_KEYS)
      .map(([childKey, childValue]) => [
        childKey,
        sanitizeMetadataValue(childKey, childValue, depth + 1)
      ])
      .filter((entry): entry is [string, AnalyticsMetadata] => entry[1] !== undefined);
    return Object.fromEntries(nextEntries);
  }

  return undefined;
}

export function sanitizeAnalyticsMetadata(
  metadata?: Record<string, unknown> | null
): Record<string, AnalyticsMetadata> {
  if (!metadata || !isPlainObject(metadata)) return {};
  const sanitizedEntries = Object.entries(metadata)
    .slice(0, MAX_METADATA_KEYS)
    .map(([key, value]) => [key, sanitizeMetadataValue(key, value, 0)])
    .filter((entry): entry is [string, AnalyticsMetadata] => entry[1] !== undefined);
  return Object.fromEntries(sanitizedEntries);
}

function readStoredEvents(): AnalyticsEventRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyticsEventRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStoredEvents(events: AnalyticsEventRecord[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events.slice(0, MAX_STORED_EVENTS)));
  } catch (error) {
    reportAnalyticsFailure(error);
  }
}

function reportAnalyticsFailure(error: unknown): void {
  try {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[analytics] tracking skipped', error);
    }
  } catch {
    // silencioso por design
  }
}

export function buildAnalyticsEvent(input: AnalyticsEventInput): AnalyticsEventRecord {
  const route =
    typeof input.route === 'string' && input.route.trim()
      ? input.route.trim().slice(0, 140)
      : typeof window !== 'undefined'
        ? window.location.pathname
        : '/';

  return {
    id: generateEventId(),
    event_name: String(input.event_name || '').trim(),
    module: String(input.module || '').trim(),
    user_id: input.user_id ? String(input.user_id) : null,
    tenant_id: input.tenant_id ? String(input.tenant_id) : null,
    route,
    timestamp: input.timestamp || safeNowIso(),
    metadata: sanitizeAnalyticsMetadata(input.metadata),
    result: input.result ? String(input.result) : null
  };
}

function persistAnalyticsEvent(event: AnalyticsEventRecord): void {
  const existing = readStoredEvents();
  existing.unshift(event);
  writeStoredEvents(existing);
}

export function trackEvent(input: AnalyticsEventInput): void {
  if (!input?.event_name || !input?.module) return;
  const event = buildAnalyticsEvent(input);

  const schedule =
    typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (callback: () => void) => {
          setTimeout(callback, 0);
        };

  schedule(() => {
    try {
      persistAnalyticsEvent(event);
    } catch (error) {
      reportAnalyticsFailure(error);
    }
  });
}

export function track(event: string, data?: Record<string, unknown>) {
  const metadata =
    isPlainObject(data)
      ? (Object.fromEntries(
          Object.entries(data).filter(([key]) => key !== 'module' && key !== 'route')
        ) as Record<string, AnalyticsMetadata>)
      : undefined;
  trackEvent({
    event_name: event,
    module: String(data?.module || 'app'),
    route: typeof data?.route === 'string' ? data.route : undefined,
    metadata
  });
}

export function getTrackedEvents(): AnalyticsEventRecord[] {
  return readStoredEvents();
}

export function clearTrackedEvents(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(ANALYTICS_STORAGE_KEY);
  } catch (error) {
    reportAnalyticsFailure(error);
  }
}
