import type { Rca } from '../../../../types/domain';
import type { PedidoApiContext } from './pedidosApi';

export async function listRcas(context: PedidoApiContext): Promise<Rca[]> {
  const res = await fetch(
    `${context.url}/rest/v1/rcas?filial_id=eq.${encodeURIComponent(context.filialId)}&order=nome`,
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
  if (!res.ok) throw new Error(`Erro ${res.status} ao carregar vendedores`);
  return Array.isArray(body) ? (body as Rca[]) : [];
}
