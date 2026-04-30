import type { Cliente } from '../../../../types/domain';
import type { PedidoApiContext } from './pedidosApi';

/** Campos mínimos necessários para o form de pedido */
export type ClienteLight = Pick<
  Cliente,
  'id' | 'nome' | 'rca_id' | 'rca_nome' | 'prazo' | 'whatsapp' | 'tel'
>;

function createHeaders(context: PedidoApiContext): HeadersInit {
  return {
    apikey: context.key,
    Authorization: `Bearer ${context.token}`,
    'Content-Type': 'application/json'
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

export async function listClientesLight(context: PedidoApiContext): Promise<ClienteLight[]> {
  const res = await fetch(
    `${context.url}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(context.filialId)}&select=id,nome,rca_id,rca_nome,prazo,whatsapp,tel&order=nome`,
    {
      headers: createHeaders(context),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar clientes`);
  return Array.isArray(body) ? (body as ClienteLight[]) : [];
}

export async function searchClientesLight(
  context: PedidoApiContext,
  rawQuery: string,
  limit = 8
): Promise<ClienteLight[]> {
  const query = rawQuery.trim();
  if (!query) return [];
  const pattern = `*${query.replace(/\*/g, '').replace(/,/g, ' ')}*`;
  const params = new URLSearchParams();
  params.set('filial_id', `eq.${context.filialId}`);
  params.set('select', 'id,nome,rca_id,rca_nome,prazo,whatsapp,tel');
  params.set('order', 'nome.asc');
  params.set('limit', String(limit));
  params.set(
    'or',
    `(${[
      `nome.ilike.${pattern}`,
      `whatsapp.ilike.${pattern}`,
      `tel.ilike.${pattern}`
    ].join(',')})`
  );
  const res = await fetch(`${context.url}/rest/v1/clientes?${params.toString()}`, {
    headers: createHeaders(context),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao buscar clientes`);
  return Array.isArray(body) ? (body as ClienteLight[]) : [];
}

export function findClienteByInput(clientes: ClienteLight[], raw: string): ClienteLight | null {
  const termo = raw.trim().toLowerCase();
  if (!termo) return null;
  return clientes.find((c) => c.id === raw.trim() || c.nome.trim().toLowerCase() === termo) ?? null;
}
