import type { ClienteFidelidadeLancamento, ClienteFidelidadeSaldo } from '../../../../types/domain';
import type { ClienteApiContext } from './clientesApi';

export type ClienteFidelidadeContext = Omit<ClienteApiContext, 'filialId'> & {
  filialId?: string | null;
};

export type ClienteFidelidadeWriteInput = {
  clienteId: string;
  tipo: 'credito' | 'debito' | 'ajuste' | 'estorno';
  pontos: number;
  observacao?: string;
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

export function buildClienteFidelidadeSaldoUrl(url: string, clienteId: string): string {
  return `${url}/rest/v1/cliente_fidelidade_saldos?cliente_id=eq.${encodeURIComponent(clienteId)}&limit=1`;
}

export function buildClienteFidelidadeLancamentosUrl(url: string, clienteId: string): string {
  return `${url}/rest/v1/cliente_fidelidade_lancamentos?cliente_id=eq.${encodeURIComponent(clienteId)}&order=criado_em.desc`;
}

export async function getClienteFidelidadeSaldo(
  context: Omit<ClienteFidelidadeContext, 'filialId'>,
  clienteId: string
): Promise<ClienteFidelidadeSaldo | null> {
  const res = await fetch(buildClienteFidelidadeSaldoUrl(context.url, clienteId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar saldo de fidelidade`);
  return Array.isArray(body) && body[0] ? (body[0] as ClienteFidelidadeSaldo) : null;
}

export async function listClienteFidelidadeLancamentos(
  context: Omit<ClienteFidelidadeContext, 'filialId'>,
  clienteId: string
): Promise<ClienteFidelidadeLancamento[]> {
  const res = await fetch(buildClienteFidelidadeLancamentosUrl(context.url, clienteId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar histórico de fidelidade`);
  return Array.isArray(body) ? (body as ClienteFidelidadeLancamento[]) : [];
}

export async function addClienteFidelidadeLancamento(
  context: ClienteFidelidadeContext,
  input: ClienteFidelidadeWriteInput
): Promise<ClienteFidelidadeLancamento> {
  if (!context.filialId) {
    throw new Error('Filial ativa não encontrada.');
  }

  const payload = {
    cliente_id: input.clienteId,
    filial_id: context.filialId,
    tipo: input.tipo,
    status: 'confirmado',
    pontos: input.pontos,
    origem: 'manual',
    observacao: input.observacao?.trim() || null
  };

  const res = await fetch(`${context.url}/rest/v1/cliente_fidelidade_lancamentos`, {
    method: 'POST',
    headers: createHeaders(context.key, context.token, 'return=representation'),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar lançamento de fidelidade`);
  return Array.isArray(body) && body[0]
    ? (body[0] as ClienteFidelidadeLancamento)
    : ({ ...payload } as ClienteFidelidadeLancamento);
}
