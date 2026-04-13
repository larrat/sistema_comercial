import type { Pedido } from '../../../../types/domain';

export type PedidoApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

function createHeaders(key: string, token: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
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

export async function listPedidos(context: PedidoApiContext): Promise<Pedido[]> {
  const res = await fetch(
    `${context.url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(context.filialId)}&order=num.desc`,
    {
      headers: createHeaders(context.key, context.token),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar pedidos`);
  return Array.isArray(body) ? (body as Pedido[]) : [];
}

export async function updatePedidoStatus(
  context: PedidoApiContext,
  pedidoId: string,
  newStatus: string
): Promise<void> {
  const res = await fetch(
    `${context.url}/rest/v1/pedidos?id=eq.${encodeURIComponent(pedidoId)}&filial_id=eq.${encodeURIComponent(context.filialId)}`,
    {
      method: 'PATCH',
      headers: createHeaders(context.key, context.token),
      body: JSON.stringify({ status: newStatus }),
      signal: AbortSignal.timeout(12000)
    }
  );
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao atualizar status do pedido`);
}
