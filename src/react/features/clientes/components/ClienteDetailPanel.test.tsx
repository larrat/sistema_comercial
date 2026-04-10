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

const getSupabaseConfigMock = vi.mocked(getSupabaseConfig);
const listNotasMock = vi.mocked(listNotas);
const addNotaMock = vi.mocked(addNota);
const getClienteFidelidadeSaldoMock = vi.mocked(getClienteFidelidadeSaldo);
const listClienteFidelidadeLancamentosMock = vi.mocked(listClienteFidelidadeLancamentos);
const addClienteFidelidadeLancamentoMock = vi.mocked(addClienteFidelidadeLancamento);

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
        texto: 'Cliente pediu retorno amanhã',
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

  it('carrega fidelidade ao trocar para a aba correspondente', async () => {
    render(<ClienteDetailPanel cliente={CLIENTE} />);

    await userEvent.click(screen.getByText('Fidelidade'));

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

  it('lança pontos manualmente na aba de fidelidade', async () => {
    addClienteFidelidadeLancamentoMock.mockResolvedValue({
      id: 'l2',
      cliente_id: '1',
      tipo: 'credito',
      status: 'confirmado',
      pontos: 50,
      origem: 'manual',
      observacao: 'Bônus'
    });

    render(<ClienteDetailPanel cliente={CLIENTE} />);

    await userEvent.click(screen.getByText('Fidelidade'));
    await userEvent.type(screen.getByTestId('fid-pontos'), '50');
    await userEvent.type(screen.getByTestId('fid-obs'), 'Bônus');
    await userEvent.click(screen.getByTestId('fid-submit'));

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
          observacao: 'Bônus'
        }
      );
    });
  });
});
