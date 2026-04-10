import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cliente } from '../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useClienteStore } from '../store/useClienteStore';
import { ClientesPilotPage } from './ClientesPilotPage';
import { deleteCliente, saveCliente } from '../services/clientesApi';

vi.mock('../../../app/supabaseConfig', () => ({
  getSupabaseConfig: vi.fn()
}));

vi.mock('../services/clientesApi', async () => {
  const actual = await vi.importActual('../services/clientesApi');
  return {
    ...actual,
    saveCliente: vi.fn(),
    deleteCliente: vi.fn()
  };
});

const getSupabaseConfigMock = vi.mocked(getSupabaseConfig);
const saveClienteMock = vi.mocked(saveCliente);
const deleteClienteMock = vi.mocked(deleteCliente);

const CLIENTES: Cliente[] = [
  { id: '1', nome: 'Maria Souza', status: 'ativo', seg: 'Varejo', email: 'maria@a.com' }
];

function resetStores() {
  useClienteStore.setState({
    clientes: [],
    status: 'idle',
    error: null,
    filtro: { q: '', seg: '', status: '' }
  });
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
  useFilialStore.setState({ filialId: 'filial-1' });
}

describe('ClientesPilotPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStores();
    getSupabaseConfigMock.mockReturnValue({
      url: 'https://example.supabase.co',
      key: 'public-key',
      ready: true
    });
    act(() => useClienteStore.getState().setClientes(CLIENTES));
  });

  it('cria um novo cliente pelo formulario React', async () => {
    saveClienteMock.mockResolvedValue({
      id: '2',
      filial_id: 'filial-1',
      nome: 'Ana Paula',
      email: 'ana@a.com',
      status: 'ativo',
      seg: 'Atacado'
    });

    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByTestId('novo-btn'));
    await userEvent.type(screen.getByTestId('form-nome'), 'Ana Paula');
    await userEvent.type(screen.getByTestId('form-email'), 'ana@a.com');
    await userEvent.type(screen.getByTestId('form-seg'), 'Atacado');
    await userEvent.click(screen.getByTestId('salvar-btn'));

    await waitFor(() => {
      expect(saveClienteMock).toHaveBeenCalledWith(
        {
          url: 'https://example.supabase.co',
          key: 'public-key',
          token: 'token-1',
          filialId: 'filial-1'
        },
        {
          id: undefined,
          nome: 'Ana Paula',
          email: 'ana@a.com',
          tel: '',
          whatsapp: '',
          seg: 'Atacado',
          status: 'ativo'
        }
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Ana Paula')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('cliente-form')).not.toBeInTheDocument();
  });

  it('edita cliente existente e atualiza a lista', async () => {
    saveClienteMock.mockResolvedValue({
      id: '1',
      filial_id: 'filial-1',
      nome: 'Maria Souza Premium',
      email: 'maria@a.com',
      status: 'ativo',
      seg: 'Varejo'
    });

    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByText('Editar'));
    const nomeInput = screen.getByTestId('form-nome');
    await userEvent.clear(nomeInput);
    await userEvent.type(nomeInput, 'Maria Souza Premium');
    await userEvent.click(screen.getByTestId('salvar-btn'));

    await waitFor(() => {
      expect(saveClienteMock).toHaveBeenCalledWith(
        {
          url: 'https://example.supabase.co',
          key: 'public-key',
          token: 'token-1',
          filialId: 'filial-1'
        },
        {
          id: '1',
          nome: 'Maria Souza Premium',
          email: 'maria@a.com',
          tel: '',
          whatsapp: '',
          seg: 'Varejo',
          status: 'ativo'
        }
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Maria Souza Premium')).toBeInTheDocument();
    });
  });

  it('remove cliente da lista pelo fluxo real de exclusao', async () => {
    deleteClienteMock.mockResolvedValue(undefined);

    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByText('Excluir'));

    await waitFor(() => {
      expect(deleteClienteMock).toHaveBeenCalledWith(
        {
          url: 'https://example.supabase.co',
          key: 'public-key',
          token: 'token-1',
          filialId: 'filial-1'
        },
        '1'
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
    });
  });

  it('mostra resumo contextual ao abrir um cliente existente', async () => {
    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByText('Detalhes'));

    expect(screen.getByTestId('cliente-context-summary')).toBeInTheDocument();
    expect(screen.getByText('Resumo do cliente')).toBeInTheDocument();
    expect(screen.getByText(/Segmento: Varejo/)).toBeInTheDocument();
  });
});
