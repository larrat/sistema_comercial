import { describe, expect, it } from 'vitest';
import {
  buildPedidoItensFromCart,
  calculateCartTotals,
  validateMixedPayments,
  type PdvCartItem
} from './pdvCart';

const ITEMS: PdvCartItem[] = [
  {
    key: '1',
    prodId: 'p1',
    nome: 'Arroz',
    un: 'un',
    qty: 2,
    preco: 10,
    custo: 7,
    code: 'ARZ001',
    stock: 5,
    isWeight: false
  },
  {
    key: '2',
    prodId: 'p2',
    nome: 'Feijao',
    un: 'kg',
    qty: 0.5,
    preco: 20,
    custo: 14,
    code: 'FEJ001',
    stock: 2,
    isWeight: true
  }
];

describe('pdvCart', () => {
  it('calcula subtotal, desconto e total final', () => {
    const result = calculateCartTotals(ITEMS, 5);
    expect(result.subtotal).toBe(30);
    expect(result.discountValue).toBe(5);
    expect(result.total).toBe(25);
  });

  it('limita desconto ao subtotal do carrinho', () => {
    const result = calculateCartTotals(ITEMS, 100);
    expect(result.discountValue).toBe(30);
    expect(result.total).toBe(0);
  });

  it('valida pagamento misto quando a soma bate com o total', () => {
    const result = validateMixedPayments(
      [
        { method: 'dinheiro', amount: 10 },
        { method: 'pix', amount: 15.5 }
      ],
      25.5
    );
    expect(result.isValid).toBe(true);
    expect(result.difference).toBe(0);
  });

  it('distribui desconto nos itens mantendo total coerente', () => {
    const itens = buildPedidoItensFromCart(ITEMS, 5);
    const total = itens.reduce((acc, item) => acc + item.qty * item.preco, 0);
    expect(Number(total.toFixed(2))).toBe(25);
    expect(itens).toHaveLength(2);
  });
});
