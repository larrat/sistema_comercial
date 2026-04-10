import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { addNota, listNotas } from '../services/notasApi';
import type { Cliente } from '../../../../types/domain';
import { ClienteDetailPanel } from './ClienteDetailPanel';

vi.mock('../../../app/supabaseConfig', () => ({
  getSupabaseConfig: vi.fn()
}));

vi.mock('../services/notasApi', async () => {
  const actual = await vi.importActual('../services/notasApi');
  return {
    ...actual,
    listNotas: vi.fn(),
    addNota: vi.fn()
  };
});

const getSupabaseConfigMock = vi.mocked(getSupabaseConfig);
const listNotasMock = vi.mocked(listNotas);
const addNotaMock = vi.mocked(addNota);

const CLIENTE: Cliente = {
  id: '1',
  nome: 'Maria Souza',
  status: 'ativo',
  seg: 'Varejo',
  email: 'maria@a.com'
};

describe('ClienteDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      session: {
        access_token: 'token-1',
        refresh_token: '',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 9999999999,
        user: null
      },
      status: 'authenticated'
    });
    getSupabaseConfigMock.mockReturnValue({
      url: 'https://example.supabase.co',
      key: 'public-key',
      ready: true
    });
    listNotasMock.mockResolvedValue([
      {
        cliente_id: '1',
        texto: 'Cliente pediu retorno amanhã',
        data: '10/04/2026 10:00'
      }
    ]);
  });

  it('abre na aba resumo por padrão', () => {
    render(<ClienteDetailPanel cliente={CLIENTE} />);
    expect(screen.getByTestId('cliente-context-summary')).toBeInTheDocument();
  });

  it('carrega notas ao trocar para a aba de notas e histórico', async () => {
    render(<ClienteDetailPanel cliente={CLIENTE} />);

    await userEvent.click(screen.getByText('Notas / histórico'));

    await waitFor(() => {
      expect(listNotasMock).toHaveBeenCalledWith(
        {
          url: 'https://example.supabase.co',
          key: 'public-key',
          token: 'token-1'
        },
        '1'
      );
    });

    expect(screen.getByText('Cliente pediu retorno amanhã')).toBeInTheDocument();
  });

  it('adiciona nota nova na lista', async () => {
    addNotaMock.mockResolvedValue({
      cliente_id: '1',
      texto: 'Retorno confirmado',
      data: '10/04/2026 11:00'
    });

    render(<ClienteDetailPanel cliente={CLIENTE} />);

    await userEvent.click(screen.getByText('Notas / histórico'));
    await userEvent.type(screen.getByTestId('nota-input'), 'Retorno confirmado');
    await userEvent.click(screen.getByTestId('nota-add'));

    await waitFor(() => {
      expect(addNotaMock).toHaveBeenCalled();
    });

    expect(screen.getByText('Retorno confirmado')).toBeInTheDocument();
  });
});
