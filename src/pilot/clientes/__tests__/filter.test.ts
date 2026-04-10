import { describe, expect, it } from 'vitest';

import { filterClientes, getClienteSegmentos } from '../filter';
import type { Cliente } from '../../../types/domain';

const base: Cliente[] = [
  { id: '1', nome: 'João Silva', status: 'ativo', seg: 'Varejo', email: 'joao@ex.com' },
  { id: '2', nome: 'Maria Souza', status: 'inativo', seg: 'Atacado', tel: '11999990000' },
  { id: '3', nome: 'Pedro Cafe', status: 'prospecto', seg: 'Varejo', apelido: 'Pedrao' }
];

describe('filterClientes', () => {
  it('retorna todos quando filtro vazio', () => {
    expect(filterClientes(base, {})).toHaveLength(3);
  });

  it('filtra por texto no nome', () => {
    const result = filterClientes(base, { q: 'maria' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filtra por texto com acento ignorado', () => {
    const result = filterClientes(base, { q: 'joao' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filtra por texto no apelido', () => {
    const result = filterClientes(base, { q: 'pedrao' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('filtra por texto no email', () => {
    const result = filterClientes(base, { q: 'joao@ex' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filtra por segmento exato', () => {
    const result = filterClientes(base, { seg: 'Varejo' });
    expect(result).toHaveLength(2);
  });

  it('filtra por status', () => {
    const result = filterClientes(base, { status: 'inativo' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('combina texto + segmento', () => {
    const result = filterClientes(base, { q: 'pedro', seg: 'Varejo' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('retorna vazio quando nenhum match', () => {
    expect(filterClientes(base, { q: 'xyzinexistente' })).toHaveLength(0);
  });
});

describe('getClienteSegmentos', () => {
  it('retorna segmentos únicos em ordem alfabética', () => {
    const segs = getClienteSegmentos(base);
    expect(segs).toEqual(['Atacado', 'Varejo']);
  });

  it('preenche ausentes com "Sem segmento"', () => {
    const clientes: Cliente[] = [
      { id: '1', nome: 'A' },
      { id: '2', nome: 'B', seg: 'Varejo' }
    ];
    expect(getClienteSegmentos(clientes)).toContain('Sem segmento');
  });

  it('não duplica segmentos', () => {
    const segs = getClienteSegmentos(base);
    expect(segs.length).toBe(new Set(segs).size);
  });
});
