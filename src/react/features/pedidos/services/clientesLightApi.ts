import type { Cliente } from '../../../../types/domain';
import type { PedidoApiContext } from './pedidosApi';

/** Campos mínimos necessários para o form de pedido */
export type ClienteLight = Pick<Cliente, 'id' | 'nome' | 'rca_id' | 'rca_nome'>;

export async function listClientesLight(context: PedidoApiContext): Promise<ClienteLight[]> {
  const res = await fetch(
    `${context.url}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(context.filialId)}&select=id,nome,rca_id,rca_nome&order=nome`,
    {
      headers: {
        apikey: context.key,
        Authorization: `Bearer ${context.token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(12000)
    }
  );
  const text = await res.text().catch(() => '');
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Erro ${res.status} ao carregar clientes`);
  return Array.isArray(body) ? (body as ClienteLight[]) : [];
}

export function findClienteByInput(clientes: ClienteLight[], raw: string): ClienteLight | null {
  const termo = raw.trim().toLowerCase();
  if (!termo) return null;
  return clientes.find((c) => c.id === raw.trim() || c.nome.trim().toLowerCase() === termo) ?? null;
}
