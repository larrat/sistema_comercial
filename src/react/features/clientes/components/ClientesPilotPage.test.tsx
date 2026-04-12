import { act } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    listNotasMock.mockResolvedValue([]);
    getClienteFidelidadeSaldoMock.mockResolvedValue(null);
    listClienteFidelidadeLancamentosMock.mockResolvedValue([]);
    listPedidosByClienteMock.mockResolvedValue([]);
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

    await waitFor(() => {
      expect(screen.getByTestId('cliente-detail-panel')).toBeInTheDocument();
      expect(within(screen.getByTestId('cliente-list')).getByText('Ana Paula')).toBeInTheDocument();
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
      expect(screen.getByTestId('cliente-detail-panel')).toBeInTheDocument();
      expect(
        within(screen.getByTestId('cliente-list')).getByText('Maria Souza Premium')
      ).toBeInTheDocument();
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

    expect(screen.getByTestId('cliente-detail-panel')).toBeInTheDocument();
    expect(screen.getByText('Resumo do cliente')).toBeInTheDocument();
    expect(screen.getByText(/Segmento: Varejo/)).toBeInTheDocument();
  });

  it('abre novo formulario quando recebe comando do shell legado', async () => {
    render(<ClientesPilotPage />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:novo' }
        })
      );
    });

    expect(await screen.findByTestId('cliente-form')).toBeInTheDocument();
  });

  it('abre detalhe quando recebe comando com id', async () => {
    render(<ClientesPilotPage />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:abrir-detalhe', id: '1' }
        })
      );
    });

    const detail = await screen.findByTestId('cliente-detail-panel');
    expect(within(detail).getAllByText('Maria Souza').length).toBeGreaterThan(0);
  });

  it('abre edicao quando recebe comando com id', async () => {
    render(<ClientesPilotPage />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:editar', id: '1' }
        })
      );
    });

    expect(await screen.findByTestId('cliente-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-nome')).toHaveValue('Maria Souza');
  });

  it('remove cliente quando recebe comando com id', async () => {
    deleteClienteMock.mockResolvedValue(undefined);
    render(<ClientesPilotPage />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:excluir', id: '1' }
        })
      );
    });

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
  });

  it('limpa filtros quando recebe comando do shell legado', async () => {
    render(<ClientesPilotPage />);

    await userEvent.type(screen.getByTestId('busca-input'), 'maria');
    expect(screen.getByTestId('busca-input')).toHaveValue('maria');

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:limpar-filtros' }
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('busca-input')).toHaveValue('');
      expect(screen.queryByTestId('limpar-filtro')).not.toBeInTheDocument();
    });
  });

  it('abre edicao do cliente atual quando recebe comando do shell legado', async () => {
    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByText('Detalhes'));

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:editar-atual' }
        })
      );
    });

    expect(await screen.findByTestId('cliente-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-nome')).toHaveValue('Maria Souza');
  });

  it('troca para fidelidade quando recebe comando do shell legado no detalhe', async () => {
    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByText('Detalhes'));

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:abrir-fidelidade' }
        })
      );
    });

    expect(await screen.findByTestId('cliente-detail-fidelidade')).toBeInTheDocument();
  });

  it('troca para pedidos abertos quando recebe comando do shell legado no detalhe', async () => {
    listPedidosByClienteMock.mockResolvedValue([
      {
        id: 'p1',
        cliente_id: '1',
        num: 40,
        cli: 'Maria Souza',
        status: 'confirmado',
        pgto: 'pix',
        prazo: 'a_vista',
        itens: [],
        total: 210,
        venda_fechada: false
      }
    ]);
    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByText('Detalhes'));

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:abrir-abertas' }
        })
      );
    });

    expect(await screen.findByTestId('cliente-detail-pedidos-abertos')).toBeInTheDocument();
    expect(screen.getByText('Pedido #40')).toBeInTheDocument();
  });

  it('troca para pedidos fechados quando recebe comando do shell legado no detalhe', async () => {
    listPedidosByClienteMock.mockResolvedValue([
      {
        id: 'p2',
        cliente_id: '1',
        num: 12,
        cli: 'Maria Souza',
        status: 'entregue',
        pgto: 'boleto',
        prazo: '30d',
        itens: [],
        total: 450,
        venda_fechada: true
      }
    ]);
    render(<ClientesPilotPage />);

    await userEvent.click(screen.getByText('Detalhes'));

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:abrir-fechadas' }
        })
      );
    });

    expect(await screen.findByTestId('cliente-detail-pedidos-fechados')).toBeInTheDocument();
    expect(screen.getByText('Pedido #12')).toBeInTheDocument();
  });

  it('exporta csv filtrado quando recebe comando do shell legado', async () => {
    const createObjectURLMock = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:clientes-react');
    const revokeObjectURLMock = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickMock = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ClientesPilotPage />);

    act(() => {
      useClienteStore.getState().setFiltro({ q: 'maria' });
    });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { source: 'clientes-legacy-shell', type: 'clientes:exportar-csv' }
        })
      );
    });

    expect(createObjectURLMock).toHaveBeenCalledOnce();
    expect(clickMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:clientes-react');

    createObjectURLMock.mockRestore();
    revokeObjectURLMock.mockRestore();
    clickMock.mockRestore();
  });
});

