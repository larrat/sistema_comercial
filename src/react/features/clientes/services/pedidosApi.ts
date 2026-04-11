import type { Cliente, Pedido } from '../../../../types/domain';
import type { ClienteApiContext } from './clientesApi';

export type ClientePedidosContext = Omit<ClienteApiContext, 'filialId'> & {
  filialId?: string | null;
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

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function buildListPedidosUrl(url: string, filialId: string): string {
  return `${url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(filialId)}&order=num.desc`;
}

export function belongsPedidoToCliente(pedido: Pedido, cliente: Cliente): boolean {
  if (pedido.cliente_id && cliente.id && pedido.cliente_id === cliente.id) {
    return true;
  }

  const pedidoCliente = normalizeText(pedido.cli);
  const clienteNome = normalizeText(cliente.nome);
  return !!pedidoCliente && !!clienteNome && pedidoCliente === clienteNome;
}

export function splitClientePedidos(pedidos: Pedido[]): {
  abertas: Pedido[];
  fechadas: Pedido[];
} {
  return pedidos.reduce<{ abertas: Pedido[]; fechadas: Pedido[] }>(
    (acc, pedido) => {
      if (pedido.venda_fechada) {
        acc.fechadas.push(pedido);
      } else if (pedido.status !== 'cancelado') {
        acc.abertas.push(pedido);
      }
      return acc;
    },
    { abertas: [], fechadas: [] }
  );
}

export async function listPedidosByCliente(
  context: ClientePedidosContext,
  cliente: Cliente
): Promise<Pedido[]> {
  if (!context.filialId) {
    throw new Error('Filial ativa nao encontrada.');
  }

  const res = await fetch(buildListPedidosUrl(context.url, context.filialId), {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar pedidos do cliente`);

  const pedidos = Array.isArray(body) ? (body as Pedido[]) : [];
  return pedidos.filter((pedido) => belongsPedidoToCliente(pedido, cliente));
}
