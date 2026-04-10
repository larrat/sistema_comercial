import { render, screen } from '@testing-library/react';
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
      hydrate: filialHydrateMock
    };
  });

  it('mostra loading inicial enquanto autenticacao e desconhecida', () => {
    render(<App />);

    expect(screen.getAllByText('', { selector: '.sk-line' })).toHaveLength(2);
    expect(authHydrateMock).toHaveBeenCalled();
    expect(filialHydrateMock).toHaveBeenCalled();
  });

  it('mostra aviso quando nao ha sessao', () => {
    authState.status = 'unauthenticated';

    render(<App />);

    expect(screen.getByText(/Sess/)).toBeInTheDocument();
  });

  it('renderiza o piloto de clientes quando autenticado', () => {
    authState.status = 'authenticated';

    render(<App />);

    expect(screen.getByTestId('clientes-pilot-page')).toBeInTheDocument();
    expect(useClienteDataMock).toHaveBeenCalled();
  });
});
