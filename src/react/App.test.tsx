import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

const useClienteDataMock = vi.fn();
const authHydrateMock = vi.fn();
const filialHydrateMock = vi.fn();

let authState: {
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  hydrate: () => void;
};
let filialState: {
  hydrate: () => void;
  filialId?: string | null;
};

vi.mock('./features/clientes/components/ClientesPilotPage', () => ({
  ClientesPilotPage: () => <div data-testid="clientes-pilot-page">Clientes pilot</div>
}));

vi.mock('./features/clientes/hooks/useClienteData', () => ({
  useClienteData: () => useClienteDataMock()
}));

vi.mock('./app/useAuthStore', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState)
}));

vi.mock('./app/useFilialStore', () => ({
  useFilialStore: (selector: (state: typeof filialState) => unknown) => selector(filialState)
}));

describe('App', () => {
  beforeEach(() => {
    useClienteDataMock.mockReset();
    authHydrateMock.mockReset();
    filialHydrateMock.mockReset();
    authState = {
      status: 'unknown',
      hydrate: authHydrateMock
    };
    filialState = {
      hydrate: filialHydrateMock,
      filialId: null
    };
  });

  it('mostra loading inicial enquanto autenticacao e desconhecida', () => {
    render(<App />);

    expect(screen.getAllByText('', { selector: '.sk-line' })).toHaveLength(2);
    expect(authHydrateMock).toHaveBeenCalled();
    expect(filialHydrateMock).toHaveBeenCalled();
  });

  it('mostra a rota de login quando nao ha sessao', async () => {
    authState.status = 'unauthenticated';

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('renderiza a rota principal quando autenticado com filial', async () => {
    authState.status = 'authenticated';
    filialState.filialId = 'filial-1';

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-pilot-page')).toBeInTheDocument();
    });
    expect(useClienteDataMock).not.toHaveBeenCalled();
  });
});
