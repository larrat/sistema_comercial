import { describe, expect, it } from 'vitest';
import {
  priceToMarkup,
  priceToMargin,
  markupToPrice,
  markupToMargin,
  marginToMarkup,
  syncPriceFields,
  recalcFromCost
} from './useProdutoCalculations';

describe('priceToMarkup', () => {
  it('calcula markup a partir de custo e preco', () => {
    expect(priceToMarkup(100, 130)).toBeCloseTo(30);
  });

  it('retorna 0 quando custo é zero', () => {
    expect(priceToMarkup(0, 130)).toBe(0);
  });

  it('retorna 0 quando preco é zero', () => {
    expect(priceToMarkup(100, 0)).toBe(0);
  });

  it('retorna 0 quando ambos são zero', () => {
    expect(priceToMarkup(0, 0)).toBe(0);
  });
});

describe('priceToMargin', () => {
  it('calcula margem a partir de custo e preco', () => {
    // (130 - 100) / 130 * 100 ≈ 23.07%
    expect(priceToMargin(100, 130)).toBeCloseTo(23.077, 2);
  });

  it('retorna 0 quando custo é zero', () => {
    expect(priceToMargin(0, 130)).toBe(0);
  });

  it('retorna 0 quando preco é zero', () => {
    expect(priceToMargin(100, 0)).toBe(0);
  });
});

describe('markupToPrice', () => {
  it('calcula preco a partir de custo e markup', () => {
    expect(markupToPrice(100, 30)).toBeCloseTo(130);
  });

  it('retorna 0 quando custo é zero', () => {
    expect(markupToPrice(0, 30)).toBe(0);
  });

  it('retorna custo quando markup é zero', () => {
    expect(markupToPrice(100, 0)).toBeCloseTo(100);
  });
});

describe('markupToMargin', () => {
  it('converte markup para margem', () => {
    // 30 / (1 + 30/100) ≈ 23.07%
    expect(markupToMargin(30)).toBeCloseTo(23.077, 2);
  });

  it('retorna 0 quando markup é zero', () => {
    expect(markupToMargin(0)).toBe(0);
  });

  it('retorna 0 quando markup é negativo', () => {
    expect(markupToMargin(-10)).toBe(0);
  });
});

describe('marginToMarkup', () => {
  it('converte margem para markup', () => {
    // 23.077 / (1 - 23.077/100) ≈ 30%
    expect(marginToMarkup(23.077)).toBeCloseTo(30, 1);
  });

  it('retorna 0 quando margem é zero', () => {
    expect(marginToMarkup(0)).toBe(0);
  });

  it('retorna 0 quando margem é 100 ou mais (impossível)', () => {
    expect(marginToMarkup(100)).toBe(0);
    expect(marginToMarkup(110)).toBe(0);
  });
});

describe('syncPriceFields — modo markup', () => {
  it('atualiza margem e preco ao mudar markup', () => {
    const result = syncPriceFields(
      'markup',
      { preco: '0', markup: '30', margem: '0' },
      100
    );
    expect(parseFloat(result.markup)).toBeCloseTo(30);
    expect(parseFloat(result.margem)).toBeCloseTo(23.077, 1);
    expect(parseFloat(result.preco)).toBeCloseTo(130);
  });

  it('atualiza apenas margem quando custo é zero', () => {
    const result = syncPriceFields(
      'markup',
      { preco: '0', markup: '30', margem: '0' },
      0
    );
    expect(parseFloat(result.markup)).toBeCloseTo(30);
    expect(parseFloat(result.margem)).toBeCloseTo(23.077, 1);
    // sem custo, preco fica como estava
    expect(result.preco).toBe('0');
  });
});

describe('syncPriceFields — modo margem', () => {
  it('atualiza markup e preco ao mudar margem', () => {
    const result = syncPriceFields(
      'margem',
      { preco: '0', markup: '0', margem: '23.077' },
      100
    );
    expect(parseFloat(result.markup)).toBeCloseTo(30, 0);
    expect(parseFloat(result.margem)).toBeCloseTo(23.077, 1);
    expect(parseFloat(result.preco)).toBeCloseTo(130, 0);
  });
});

describe('syncPriceFields — modo preco', () => {
  it('atualiza markup e margem ao mudar preco', () => {
    const result = syncPriceFields(
      'preco',
      { preco: '130', markup: '0', margem: '0' },
      100
    );
    expect(parseFloat(result.markup)).toBeCloseTo(30);
    expect(parseFloat(result.margem)).toBeCloseTo(23.077, 1);
    expect(result.preco).toBe('130');
  });

  it('não altera nada quando custo é zero', () => {
    const initial = { preco: '130', markup: '0', margem: '0' };
    const result = syncPriceFields('preco', initial, 0);
    expect(result).toEqual(initial);
  });
});

describe('recalcFromCost', () => {
  it('recalcula varejo e atacado mantendo os markups existentes', () => {
    const varejo = { preco: '130', markup: '30', margem: '23.1' };
    const atacado = { preco: '115', markup: '15', margem: '13.0' };
    const { varejo: v, atacado: a } = recalcFromCost(200, varejo, atacado);
    expect(parseFloat(v.preco)).toBeCloseTo(260); // 200 * 1.30
    expect(parseFloat(a.preco)).toBeCloseTo(230); // 200 * 1.15
  });

  it('preserva varejo sem markup quando custo muda', () => {
    const varejo = { preco: '130', markup: '0', margem: '0' };
    const atacado = { preco: '115', markup: '15', margem: '13.0' };
    const { varejo: v } = recalcFromCost(200, varejo, atacado);
    // sem markup, não recalcula varejo
    expect(v.preco).toBe('130');
  });
});
