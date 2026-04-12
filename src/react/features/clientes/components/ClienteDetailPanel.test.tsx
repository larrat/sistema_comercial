import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cliente } from '../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import {
  addClienteFidelidadeLancamento,
  getClienteFidelidadeSaldo,
  listClienteFidelidadeLancamentos
} from '../services/fidelidadeApi';
import { addNota, listNotas } from '../services/notasApi';
import { listPedidosByCliente } from '../services/pedidosApi';
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

vi.mock('../services/fidelidadeApi', async () => {
  const actual = await vi.importActual('../services/fidelidadeApi');
  return {
    ...actual,
    getClienteFidelidadeSaldo: vi.fn(),
    listClienteFidelidadeLancamentos: vi.fn(),
    addClienteFidelidadeLancamento: vi.fn()
  };
});

vi.mock('../services/pedidosApi', async () => {
  const actual = await vi.importActual('../services/pedidosApi');
  return {
    ...actual,
    listPedidosByCliente: vi.fn()
  };
});

const getSupabaseConfigMock = vi.mocked(getSupabaseConfig);
const listNotasMock = vi.mocked(listNotas);
const addNotaMock = vi.mocked(addNota);
const getClienteFidelidadeSaldoMock = vi.mocked(getClienteFidelidadeSaldo);
const listClienteFidelidadeLancamentosMock = vi.mocked(listClienteFidelidadeLancamentos);
const addClienteFidelidadeLancamentoMock = vi.mocked(addClienteFidelidadeLancamento);
const listPedidosByClienteMock = vi.mocked(listPedidosByCliente);

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
    useFilialStore.setState({ filialId: 'filial-1' });
    getSupabaseConfigMock.mockReturnValue({
      url: 'https://example.supabase.co',
      key: 'public-key',
      ready: true
    });
    listNotasMock.mockResolvedValue([
      {
        cliente_id: '1',
        texto: 'Cliente pediu retorno amanha',
        data: '10/04/2026 10:00'
      }
    ]);
    getClienteFidelidadeSaldoMock.mockResolvedValue({
      cliente_id: '1',
      saldo_pontos: 150,
      total_acumulado: 240,
      total_resgatado: 90,
      bloqueado: false
    });
    listClienteFidelidadeLancamentosMock.mockResolvedValue([
      {
        id: 'l1',
        cliente_id: '1',
        tipo: 'credito',
        status: 'confirmado',
        pontos: 150,
        origem: 'manual',
        observacao: 'Campanha',
        criado_em: '2026-04-10T10:00:00Z'
      }
    ]);
    listPedidosByClienteMock.mockResolvedValue([
      {
        id: 'p1',
        cliente_id: '1',
        num: 101,
        cli: 'Maria Souza',
        status: 'confirmado',
        pgto: 'pix',
        prazo: 'a_vista',
        itens: [],
        total: 320,
        venda_fechada: false
      },
      {
        id: 'p2',
        cliente_id: '1',
        num: 88,
        cli: 'Maria Souza',
        status: 'entregue',
        pgto: 'boleto',
        prazo: '30d',
        itens: [],
        total: 780,
        venda_fechada: true
      }
    ]);
  });

  it('abre na aba resumo por padrao', () => {
    act(() => {
      render(<ClienteDetailPanel cliente={CLIENTE} />);
    });
    expect(screen.getByTestId('cliente-context-summary')).toBeInTheDocument();
  });

  it('carrega pedidos ao trocar para a aba de pedidos abertos', async () => {
    const user = userEvent.setup();
    const postMessageSpy = vi.spyOn(window, 'postMessage');

    await act(async () => {
      render(<ClienteDetailPanel cliente={CLIENTE} />);
    });

    await user.click(screen.getByText('Pedidos abertos'));

    await waitFor(() => {
      expect(listPedidosByClienteMock).toHaveBeenCalledWith(
        {
          url: 'https://example.supabase.co',
          key: 'public-key',
          token: 'token-1',
          filialId: 'filial-1'
        },
        CLIENTE
      );
    });

    expect(screen.getByText('Pedido #101')).toBeInTheDocument();
    expect(screen.getByText('R$ 320,00')).toBeInTheDocument();

    await user.click(screen.getByTestId('pedido-ver-p1'));

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'clientes-react-pilot',
        type: 'clientes:pedido-acao',
        action: 'ver',
        pedidoId: 'p1',
        clienteId: '1'
      },
      window.location.origin
    );
  });

  it('mostra pedidos fechados na aba correspondente', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<ClienteDetailPanel cliente={CLIENTE} />);
    });

    await user.click(screen.getByText('Pedidos fechados'));

    expect(await screen.findByText('Pedido #88')).toBeInTheDocument();
    expect(screen.getByText('Fechado')).toBeInTheDocument();
  });

  it('carrega notas ao trocar para a aba de notas e historico', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<ClienteDetailPanel cliente={CLIENTE} />);
    });

    await user.click(screen.getByText('Notas / historico'));

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

    expect(screen.getByText('Cliente pediu retorno amanha')).toBeInTheDocument();
  });

  it('adiciona nota nova na lista', async () => {
    addNotaMock.mockResolvedValue({
      cliente_id: '1',
      texto: 'Retorno confirmado',
      data: '10/04/2026 11:00'
    });

    const user = userEvent.setup();
    await act(async () => {
      render(<ClienteDetailPanel cliente={CLIENTE} />);
    });

    await user.click(screen.getByText('Notas / historico'));
    await user.type(screen.getByTestId('nota-input'), 'Retorno confirmado');
    await user.click(screen.getByTestId('nota-add'));

    await waitFor(() => {
      expect(addNotaMock).toHaveBeenCalled();
    });

    expect(screen.getByText('Retorno confirmado')).toBeInTheDocument();
  });

  it('carrega fidelidade ao trocar para a aba correspondente', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<ClienteDetailPanel cliente={CLIENTE} />);
    });

    await user.click(screen.getByText('Fidelidade'));

    await waitFor(() => {
      expect(getClienteFidelidadeSaldoMock).toHaveBeenCalledWith(
        {
          url: 'https://example.supabase.co',
          key: 'public-key',
          token: 'token-1',
          filialId: 'filial-1'
        },
        '1'
      );
    });

    expect(screen.getByTestId('cliente-detail-fidelidade')).toBeInTheDocument();
    expect(screen.getByText('Campanha')).toBeInTheDocument();
  });

  it('lanca pontos manualmente na aba de fidelidade', async () => {
    addClienteFidelidadeLancamentoMock.mockResolvedValue({
      id: 'l2',
      cliente_id: '1',
      tipo: 'credito',
      status: 'confirmado',
      pontos: 50,
      origem: 'manual',
      observacao: 'Bonus'
    });

    const user = userEvent.setup();
    await act(async () => {
      render(<ClienteDetailPanel cliente={CLIENTE} />);
    });

    await user.click(screen.getByText('Fidelidade'));
    await user.type(screen.getByTestId('fid-pontos'), '50');
    await user.type(screen.getByTestId('fid-obs'), 'Bonus');
    await user.click(screen.getByTestId('fid-submit'));

    await waitFor(() => {
      expect(addClienteFidelidadeLancamentoMock).toHaveBeenCalledWith(
        {
          url: 'https://example.supabase.co',
          key: 'public-key',
          token: 'token-1',
          filialId: 'filial-1'
        },
        {
          clienteId: '1',
          tipo: 'credito',
          pontos: 50,
          observacao: 'Bonus'
        }
      );
    });
  });
});
