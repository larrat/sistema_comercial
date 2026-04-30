import type { Pedido, PedidoItem } from '../../../../types/domain';

export function normalizePedidoItens(raw: unknown): PedidoItem[] {
  if (Array.isArray(raw)) return raw as PedidoItem[];
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PedidoItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizePedido(pedido: Pedido): Pedido {
  return { ...pedido, itens: normalizePedidoItens(pedido.itens) };
}
