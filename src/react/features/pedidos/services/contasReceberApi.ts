import type { PedidoApiContext } from './pedidosApi';
import { normalizePedStatus } from '../types';

const PRAZO_DIAS: Record<string, number> = {
  '7d': 7,
  '15d': 15,
  '30d': 30,
  '60d': 60
};

function calcVencimento(dataBase: string | undefined, prazo: string | undefined): string | null {
  const dias = PRAZO_DIAS[prazo ?? ''];
  if (!dias) return null;
  const base = dataBase ? new Date(dataBase + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString().split('T')[0];
}

export type ContaReceberInput = {
  pedido_id: string;
  pedido_num: number;
  cliente_id: string | null;
  cliente: string;
  valor: number;
  data: string | undefined;
  prazo: string | undefined;
};

/**
 * Gera conta a receber quando um pedido vira "entregue" pela primeira vez,
 * se o prazo tiver dias configurados (7d, 15d, 30d, 60d).
 *
 * Espelha exatamente a lógica de _gerarContaSeNecessario() do legado.
 * Condições para gerar:
 *   - statusNovo === 'entregue'
 *   - statusAnterior !== 'entregue'  (não re-gera em transições idempotentes)
 *   - prazo tem dias configurados (não gera para prazo 'imediato')
 */
export async function gerarContaSeNecessario(
  context: PedidoApiContext,
  input: ContaReceberInput,
  statusNovo: string,
  statusAnterior: string
): Promise<void> {
  if (normalizePedStatus(statusNovo) !== 'entregue') return;
  if (normalizePedStatus(statusAnterior) === 'entregue') return;

  const vencimento = calcVencimento(input.data, input.prazo);
  if (!vencimento) return;

  const conta = {
    id: globalThis.crypto.randomUUID(),
    filial_id: context.filialId,
    pedido_id: input.pedido_id,
    pedido_num: input.pedido_num ?? null,
    cliente_id: input.cliente_id ?? null,
    cliente: input.cliente,
    valor: input.valor,
    vencimento,
    status: 'pendente'
  };

  const res = await fetch(`${context.url}/rest/v1/contas_receber`, {
    method: 'POST',
    headers: {
      apikey: context.key,
      Authorization: `Bearer ${context.token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(conta),
    signal: AbortSignal.timeout(12000)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(
      `[pedidos-react] Falha ao gerar conta a receber para pedido #${input.pedido_num}: ${res.status} ${text}`
    );
    // Não lança erro — mesma política do legado (falha silenciosa no background)
  }
}
