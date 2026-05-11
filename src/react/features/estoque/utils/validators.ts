/**
 * Validações de movimentação de estoque.
 * Anteriormente importadas de src/core/validators (removido).
 */

type MovimentacaoInput = {
  prod_id?: string | null;
  tipo?: string | null;
  qty?: number | null;
  saldo_real?: number | null;
};

type MovimentacaoValidated = {
  qty?: number;
  saldo_real?: number;
};

export function validateMovimentacao(input: MovimentacaoInput): MovimentacaoValidated {
  const result: MovimentacaoValidated = {};

  if (typeof input.qty === 'number' && Number.isFinite(input.qty)) {
    result.qty = input.qty;
  }

  if (typeof input.saldo_real === 'number' && Number.isFinite(input.saldo_real)) {
    result.saldo_real = input.saldo_real;
  }

  return result;
}
