import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cliente } from '../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useClienteStore } from '../store/useClienteStore';
import { ClientesPilotPage } from './ClientesPilotPage';
import { deleteCliente, saveCliente } from '../services/clientesApi';
import {
  getClienteFidelidadeSaldo,
  listClienteFidelidadeLancamentos
} from '../services/fidelidadeApi';
import { listNotas } from '../services/notasApi';
import { listPedidosByCliente } from '../services/pedidosApi';

vi.mock('../../../app/supabaseConfig', () => ({
  getSupabaseConfig: vi.fn()
}));

vi.mock('../../../shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn()
  })
}));

vi.mock('../services/clientesApi', async () => {
  const actual = await vi.importActual('../services/clientesApi');
  return {
    ...actual,
    saveCliente: vi.fn(),
    deleteCliente: vi.fn()
  };
});

vi.mock('../services/notasApi', async () => {
  const actual = await vi.importActual('../services/notasApi');
  return {
    ...actual,
    listNotas: vi.fn().mockResolvedValue([])
  };
});

vi.mock('../services/fidelidadeApi', async () => {
  const actual = await vi.importActual('../services/fidelidadeApi');
  return {
    ...actual,
    getClienteFidelidadeSaldo: vi.fn().mockResolvedValue(null),
    listClienteFidelidadeLancamentos: vi.fn().mockResolvedValue([])
  };
});

vi.mock('../services/pedidosApi', async () => {
  const actual = await vi.importActual('../services/pedidosApi');
  return {
    ...actual,
    listPedidosByCliente: vi.fn().mockResolvedValue([])
  };
});

const getSupabaseConfigMock = vi.mocked(getSupabaseConfig);
const saveClienteMock = vi.mocked(saveCliente);
const deleteClienteMock = vi.mocked(deleteCliente);
const listNotasMock = vi.mocked(listNotas);
const getClienteFidelidadeSaldoMock = vi.mocked(getClienteFidelidadeSaldo);
const listClienteFidelidadeLancamentosMock = vi.mocked(listClienteFidelidadeLancamentos);
const listPedidosByClienteMock = vi.mocked(listPedidosByCliente);

const CLIENTES: Cliente[] = [
  { id: '1', nome: 'Maria Souza', status: 'ativo', seg: 'Varejo', email: 'maria@a.com' }
];

function resetStores() {
  useClienteStore.setState({
    clientes: CLIENTES,
    segmentClientes: CLIENTES,
    status: 'ready',
    segmentStatus: 'ready',
    error: null,
    segmentError: null,
    filtro: { q: '', seg: '', status: '' },
    segmentos: ['Varejo'],
    page: 1,
    pageSize: 20,
    total: 1,
    pageCount: 1
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
    listNotasMock.mockResolvedValue([]);
    getClienteFidelidadeSaldoMock.mockResolvedValue(null);
    listClienteFidelidadeLancamentosMock.mockResolvedValue([]);
    listPedidosByClienteMock.mockResolvedValue([]);
  });

  it('cria um novo cliente pelo formulario React', async () => {
    const onOpenCliente = vi.fn();
    saveClienteMock.mockResolvedValue({
      id: '2',
      filial_id: 'filial-1',
      nome: 'Ana Paula',
      email: 'ana@a.com',
      status: 'ativo',
      seg: 'Atacado'
    });

    render(<ClientesPilotPage onOpenCliente={onOpenCliente} />);

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
        expect.objectContaining({
          id: undefined,
          nome: 'Ana Paula',
          email: 'ana@a.com',
          tel: '',
          whatsapp: '',
          seg: 'Atacado',
          status: 'ativo'
        })
      );
    });

    expect(onOpenCliente).toHaveBeenCalledWith('2', { tab: 'resumo', origin: 'save_success' });
    expect(screen.queryByTestId('cliente-form')).not.toBeInTheDocument();
  });

  it('edita cliente existente e atualiza a lista', async () => {
    const onOpenCliente = vi.fn();
    saveClienteMock.mockResolvedValue({
      id: '1',
      filial_id: 'filial-1',
      nome: 'Maria Souza Premium',
      email: 'maria@a.com',
      status: 'ativo',
      seg: 'Varejo'
    });

    render(<ClientesPilotPage onOpenCliente={onOpenCliente} />);

    await userEvent.click(screen.getByTestId('cli-menu-btn'));
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
        expect.objectContaining({
          id: '1',
          nome: 'Maria Souza Premium',
          email: 'maria@a.com',
          tel: '',
          whatsapp: '',
          seg: 'Varejo',
          status: 'ativo'
        })
      );
    });

    await waitFor(() => {
      expect(
        within(screen.getByTestId('cliente-list')).getByText('Maria Souza Premium')
      ).toBeInTheDocument();
    });
    expect(onOpenCliente).toHaveBeenCalledWith('1', { tab: 'resumo', origin: 'save_success' });
  });

  it('remove cliente da lista pelo fluxo real de exclusao', async () => {
    deleteClienteMock.mockResolvedValue(undefined);

    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByTestId('cli-menu-btn'));
    await userEvent.click(screen.getByText('Excluir'));
    await userEvent.click(screen.getByTestId('confirmar-exclusao-btn'));

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

  it('abre o perfil dedicado ao clicar em um cliente existente', async () => {
    const onOpenCliente = vi.fn();
    render(<ClientesPilotPage onOpenCliente={onOpenCliente} />);

    await userEvent.click(screen.getByTestId('cliente-card'));

    expect(onOpenCliente).toHaveBeenCalledWith('1', { tab: 'resumo', origin: 'list_row' });
  });

  it('abre novo formulario ao clicar no botao Novo cliente', async () => {
    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByTestId('novo-btn'));

    expect(await screen.findByTestId('cliente-form')).toBeInTheDocument();
  });

  it('abre formulario de edicao via menu de acoes', async () => {
    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByTestId('cli-menu-btn'));
    await userEvent.click(screen.getByText('Editar'));

    expect(await screen.findByTestId('cliente-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-nome')).toHaveValue('Maria Souza');
  });

  it('limpa filtros ao clicar no botao Limpar', async () => {
    render(<ClientesPilotPage />);

    await userEvent.type(screen.getByTestId('busca-input'), 'maria');
    expect(screen.getByTestId('busca-input')).toHaveValue('maria');

    await userEvent.click(screen.getByTestId('limpar-filtro'));

    await waitFor(() => {
      expect(screen.getByTestId('busca-input')).toHaveValue('');
      expect(screen.queryByTestId('limpar-filtro')).not.toBeInTheDocument();
    });
  });

  it('alterna para a superficie de segmentos ao clicar na aba', async () => {
    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByText('Segmentos'));

    const segmentView = await screen.findByTestId('cliente-segment-view');
    expect(segmentView).toBeInTheDocument();
    expect(within(segmentView).getByText('Varejo')).toBeInTheDocument();
  });

  it('exporta csv ao clicar no botao Exportar CSV', async () => {
    const createObjectURLMock = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:clientes-react');
    const revokeObjectURLMock = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickMock = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByTestId('export-btn'));

    expect(createObjectURLMock).toHaveBeenCalledOnce();
    expect(clickMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:clientes-react');

    createObjectURLMock.mockRestore();
    revokeObjectURLMock.mockRestore();
    clickMock.mockRestore();
  });
});
