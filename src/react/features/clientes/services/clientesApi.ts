import type { Cliente } from '../../../../types/domain';

export type ClienteApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

export type ClienteWriteInput = Partial<Cliente> & Pick<Cliente, 'nome'>;
export type ClienteWritePayload = Omit<Partial<Cliente>, 'nome' | 'data_aniversario'> & {
  id: string;
  filial_id: string;
  nome: string;
  data_aniversario: string | null;
};
export type ClienteListFilters = {
  q?: string;
  seg?: string;
  status?: string;
};
export type ClienteListPageQuery = ClienteListFilters & {
  page?: number;
  pageSize?: number;
};
export type ClienteListPageResult = {
  rows: Cliente[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

function createHeaders(key: string, token: string, prefer?: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ensureOk(res: Response, body: unknown, fallback: string): void {
  if (res.ok) return;
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    throw new Error(body.message);
  }
  throw new Error(fallback);
}

export function buildListClientesUrl(url: string, filialId: string): string {
  return `${url}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(filialId)}&order=nome`;
}

export function buildGetClienteByIdUrl(url: string, filialId: string, clienteId: string): string {
  return `${url}/rest/v1/clientes?id=eq.${encodeURIComponent(clienteId)}&filial_id=eq.${encodeURIComponent(filialId)}&limit=1`;
}

function createClienteQueryParams(
  filialId: string,
  filters: ClienteListFilters,
  options?: { page?: number; pageSize?: number }
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${filialId}`);
  params.set('order', 'nome');
  const conditions: string[] = [];

  const seg = String(filters.seg || '').trim();
  if (seg) {
    conditions.push(seg === 'Sem segmento' ? 'or(seg.is.null,seg.eq.)' : `seg.eq.${seg}`);
  }

  const status = String(filters.status || '').trim();
  if (status) {
    params.set('status', `eq.${status}`);
  }

  const q = String(filters.q || '').trim();
  if (q) {
    const pattern = `*${q.replace(/\*/g, '').replace(/,/g, ' ')}*`;
    conditions.push(
      `or(${[
        `nome.ilike.${pattern}`,
        `apelido.ilike.${pattern}`,
        `seg.ilike.${pattern}`,
        `resp.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `tel.ilike.${pattern}`,
        `whatsapp.ilike.${pattern}`,
        `time.ilike.${pattern}`
      ].join(',')})`
    );
  }

  if (conditions.length) {
    params.set('and', `(${conditions.join(',')})`);
  }

  if (options?.page && options?.pageSize) {
    params.set('limit', String(options.pageSize));
    params.set('offset', String((options.page - 1) * options.pageSize));
  }

  return params;
}

export function buildListClientesPageUrl(
  url: string,
  filialId: string,
  query: ClienteListPageQuery
): string {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const params = createClienteQueryParams(filialId, query, { page, pageSize });
  return `${url}/rest/v1/clientes?${params.toString()}`;
}

export function buildListClientesFilteredUrl(
  url: string,
  filialId: string,
  filters: ClienteListFilters = {}
): string {
  return `${url}/rest/v1/clientes?${createClienteQueryParams(filialId, filters).toString()}`;
}

export function buildListClienteSegmentosUrl(url: string, filialId: string): string {
  return `${url}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(filialId)}&select=seg&order=seg`;
}

export function buildDeleteClienteUrl(url: string, clienteId: string): string {
  return `${url}/rest/v1/clientes?id=eq.${encodeURIComponent(clienteId)}`;
}

export function toClienteWritePayload(
  input: ClienteWriteInput,
  filialId: string
): ClienteWritePayload {
  const aniversario = String(input.data_aniversario || '').trim();
  return {
    id: input.id ?? globalThis.crypto.randomUUID(),
    filial_id: filialId,
    nome: input.nome.trim(),
    rca_id: input.rca_id ?? null,
    rca_nome: input.rca_nome ?? null,
    apelido: input.apelido ?? '',
    doc: input.doc ?? '',
    tipo: input.tipo ?? 'PJ',
    status: input.status ?? 'ativo',
    tel: input.tel ?? '',
    whatsapp: input.whatsapp ?? '',
    email: input.email ?? '',
    data_aniversario: aniversario || null,
    time: input.time ?? '',
    resp: input.resp ?? '',
    seg: input.seg ?? '',
    tab: input.tab ?? 'padrao',
    prazo: input.prazo ?? 'a_vista',
    cidade: input.cidade ?? '',
    estado: input.estado ?? '',
    obs: input.obs ?? '',
    optin_marketing: !!input.optin_marketing,
    optin_email: !!input.optin_email,
    optin_sms: !!input.optin_sms
  };
}

export async function listClientes(context: ClienteApiContext): Promise<Cliente[]> {
  const res = await fetch(buildListClientesUrl(context.url, context.filialId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar clientes`);
  return Array.isArray(body) ? (body as Cliente[]) : [];
}

export async function getClienteById(
  context: ClienteApiContext,
  clienteId: string
): Promise<Cliente | null> {
  const res = await fetch(buildGetClienteByIdUrl(context.url, context.filialId, clienteId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar cliente`);
  return Array.isArray(body) && body[0] ? (body[0] as Cliente) : null;
}

function parseTotalFromContentRange(contentRange: string | null): number {
  if (!contentRange) return 0;
  const [, totalPart] = contentRange.split('/');
  const total = Number(totalPart);
  return Number.isFinite(total) ? total : 0;
}

export async function listClientesPage(
  context: ClienteApiContext,
  query: ClienteListPageQuery = {}
): Promise<ClienteListPageResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const res = await fetch(buildListClientesPageUrl(context.url, context.filialId, query), {
    headers: createHeaders(context.key, context.token, 'count=exact'),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar clientes`);
  const rows = Array.isArray(body) ? (body as Cliente[]) : [];
  const total = parseTotalFromContentRange(res.headers.get('content-range'));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { rows, page, pageSize, total, pageCount };
}

export async function listClientesFiltered(
  context: ClienteApiContext,
  filters: ClienteListFilters = {}
): Promise<Cliente[]> {
  const res = await fetch(buildListClientesFilteredUrl(context.url, context.filialId, filters), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar clientes filtrados`);
  return Array.isArray(body) ? (body as Cliente[]) : [];
}

export async function listClienteSegmentos(context: ClienteApiContext): Promise<string[]> {
  const res = await fetch(buildListClienteSegmentosUrl(context.url, context.filialId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar segmentos`);
  if (!Array.isArray(body)) return [];
  return [
    ...new Set(body.map((item) => String((item as { seg?: string }).seg || 'Sem segmento')))
  ].sort((a, b) => a.localeCompare(b));
}

export async function saveCliente(
  context: ClienteApiContext,
  input: ClienteWriteInput
): Promise<Cliente | null> {
  const payload = toClienteWritePayload(input, context.filialId);
  const res = await fetch(`${context.url}/rest/v1/clientes?on_conflict=id`, {
    method: 'POST',
    headers: createHeaders(
      context.key,
      context.token,
      'resolution=merge-duplicates,return=representation'
    ),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar cliente`);
  if (Array.isArray(body) && body[0]) {
    return body[0] as Cliente;
  }
  return payload as Cliente;
}

export async function deleteCliente(context: ClienteApiContext, clienteId: string): Promise<void> {
  const res = await fetch(buildDeleteClienteUrl(context.url, clienteId), {
    method: 'DELETE',
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao remover cliente`);
}
