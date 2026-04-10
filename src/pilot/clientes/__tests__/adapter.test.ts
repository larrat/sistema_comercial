import { describe, expect, it } from 'vitest';

import type { Cliente } from '../../../types/domain';
import {
  checkClienteIdentity,
  filterClientesFromLegacy,
  getClienteSegmentosFromLegacy,
  toClientePilotRecord
} from '../adapter';

const base: Cliente[] = [
  {
    id: 'c1',
    nome: 'João Silva',
    doc: '12345678000199',
    email: 'joao@empresa.com',
    status: 'ativo',
    seg: 'Varejo'
  },
  { id: 'c2', nome: 'Maria Souza', tel: '11999990000', status: 'inativo', seg: 'Atacado' }
];

describe('toClientePilotRecord', () => {
  it('mapeia os campos de identidade', () => {
    const rec = toClientePilotRecord(base[0]);
    expect(rec.id).toBe('c1');
    expect(rec.nome).toBe('João Silva');
    expect(rec.doc).toBe('12345678000199');
    expect(rec.email).toBe('joao@empresa.com');
  });

  it('converte undefined para null nos campos opcionais', () => {
    const rec = toClientePilotRecord({ id: 'x', nome: 'Sem campos', status: 'ativo' });
    expect(rec.doc).toBeNull();
    expect(rec.tel).toBeNull();
    expect(rec.whatsapp).toBeNull();
  });
});

describe('checkClienteIdentity', () => {
  it('detecta documento duplicado', () => {
    const conflict = checkClienteIdentity(
      { id: 'novo', nome: 'Novo', doc: '12.345.678/0001-99', status: 'ativo' },
      base
    );
    expect(conflict?.field).toBe('doc');
    expect(conflict?.existing.nome).toBe('João Silva');
  });

  it('retorna null quando não há conflito', () => {
    const conflict = checkClienteIdentity(
      {
        id: 'novo',
        nome: 'Novo',
        doc: '99999999000100',
        email: 'outro@empresa.com',
        status: 'ativo'
      },
      base
    );
    expect(conflict).toBeNull();
  });

  it('ignora o próprio registro em edição', () => {
    const conflict = checkClienteIdentity(
      { id: 'c1', nome: 'João Silva', doc: '12345678000199', status: 'ativo' },
      base
    );
    expect(conflict).toBeNull();
  });
});

describe('filterClientesFromLegacy', () => {
  it('filtra por texto delegando ao piloto', () => {
    const result = filterClientesFromLegacy(base, { q: 'maria' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c2');
  });

  it('retorna todos com filtro vazio', () => {
    expect(filterClientesFromLegacy(base, {})).toHaveLength(2);
  });
});

describe('getClienteSegmentosFromLegacy', () => {
  it('retorna segmentos ordenados', () => {
    expect(getClienteSegmentosFromLegacy(base)).toEqual(['Atacado', 'Varejo']);
  });
});
