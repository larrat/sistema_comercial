import { describe, expect, it } from 'vitest';

import { findClienteIdentityConflict } from '../identity';

describe('findClienteIdentityConflict', () => {
  it('detecta documento duplicado com normalizacao', () => {
    const conflict = findClienteIdentityConflict(
      {
        id: 'novo',
        nome: 'Cliente Novo',
        doc: '12.345.678/0001-99'
      },
      [
        {
          id: 'existente',
          nome: 'Cliente Base',
          doc: '12345678000199'
        }
      ]
    );

    expect(conflict?.field).toBe('doc');
    expect(conflict?.existing.nome).toBe('Cliente Base');
  });

  it('detecta e-mail duplicado ignorando caixa', () => {
    const conflict = findClienteIdentityConflict(
      {
        id: 'novo',
        nome: 'Cliente Novo',
        email: 'COMERCIAL@EMPRESA.COM'
      },
      [
        {
          id: 'existente',
          nome: 'Cliente Base',
          email: 'comercial@empresa.com'
        }
      ]
    );

    expect(conflict?.field).toBe('email');
  });

  it('detecta conflito cruzado entre telefone e whatsapp', () => {
    const conflict = findClienteIdentityConflict(
      {
        id: 'novo',
        nome: 'Cliente Novo',
        tel: '(55) 99999-0000'
      },
      [
        {
          id: 'existente',
          nome: 'Cliente Base',
          whatsapp: '55999990000'
        }
      ]
    );

    expect(conflict?.field).toBe('tel');
    expect(conflict?.label).toBe('telefone');
  });

  it('ignora o proprio registro em modo edicao', () => {
    const conflict = findClienteIdentityConflict(
      {
        id: 'cliente-1',
        nome: 'Cliente Editado',
        email: 'cliente@empresa.com'
      },
      [
        {
          id: 'cliente-1',
          nome: 'Cliente Editado',
          email: 'cliente@empresa.com'
        }
      ]
    );

    expect(conflict).toBeNull();
  });

  it('retorna null quando nao existe conflito', () => {
    const conflict = findClienteIdentityConflict(
      {
        id: 'novo',
        nome: 'Cliente Novo',
        doc: '11122233344',
        email: 'novo@empresa.com',
        tel: '559998887777'
      },
      [
        {
          id: 'existente',
          nome: 'Cliente Base',
          doc: '99988877766',
          email: 'base@empresa.com',
          whatsapp: '5511999991111'
        }
      ]
    );

    expect(conflict).toBeNull();
  });
});
