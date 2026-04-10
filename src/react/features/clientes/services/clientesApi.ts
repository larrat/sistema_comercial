import type { Cliente } from '../../../../types/domain';

export type ClienteApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

export type ClienteWriteInput = Partial<Cliente> & Pick<Cliente, 'nome'>;
export type ClienteWritePayload = Omit<Partial<Cliente>, 'nome'> & {
  filial_id: string;
  nome: string;
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

export function buildDeleteClienteUrl(url: string, clienteId: string): string {
  return `${url}/rest/v1/clientes?id=eq.${encodeURIComponent(clienteId)}`;
}

export function toClienteWritePayload(
  input: ClienteWriteInput,
  filialId: string
): ClienteWritePayload {
  return {
    id: input.id ?? undefined,
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
    data_aniversario: input.data_aniversario ?? '',
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
  if (input.id) {
    return { ...payload, id: input.id } as Cliente;
  }
  return null;
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
