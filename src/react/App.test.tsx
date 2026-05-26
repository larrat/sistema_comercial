import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

const useClienteDataMock = vi.fn();
const authHydrateMock = vi.fn();
const filialHydrateMock = vi.fn();
const roleHydrateMock = vi.fn();

let authState: {
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  hydrate: () => void;
};
let filialState: {
  hydrate: () => void;
  filialId?: string | null;
};
let roleState: {
  role: 'admin' | 'gerente' | 'operador' | null;
  hydrate: () => void;
};

vi.mock('./features/clientes/components/ClientesPilotPage', () => ({
  ClientesPilotPage: () => <div data-testid="clientes-pilot-page">Clientes pilot</div>
}));

vi.mock('./features/dashboard/pages/DashboardRoutePage', () => ({
  DashboardRoutePage: () => <div data-testid="dashboard-pilot-page">Dashboard pilot</div>
}));

vi.mock('./features/dashboard/workers/dashboard.worker?worker', () => ({
  default: class MockWorker {
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    terminate() {}
  }
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

vi.mock('./app/useRoleStore', () => ({
  useRoleStore: (selector: (state: typeof roleState) => unknown) => selector(roleState)
}));

describe('App', () => {
  beforeEach(() => {
    useClienteDataMock.mockReset();
    authHydrateMock.mockReset();
    filialHydrateMock.mockReset();
    roleHydrateMock.mockReset();
    authState = {
      status: 'unknown',
      hydrate: authHydrateMock
    };
    filialState = {
      hydrate: filialHydrateMock,
      filialId: null
    };
    roleState = {
      role: 'admin',
      hydrate: roleHydrateMock
    };
  });

  it('mostra loading inicial enquanto autenticacao e desconhecida', () => {
    render(<App />);

    expect(screen.getAllByText('', { selector: '.sk-line' })).toHaveLength(2);
    expect(authHydrateMock).toHaveBeenCalled();
    expect(filialHydrateMock).toHaveBeenCalled();
    expect(roleHydrateMock).toHaveBeenCalled();
  });

  it('mostra a rota de login quando nao ha sessao', async () => {
    authState.status = 'unauthenticated';

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
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
