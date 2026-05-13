import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../../shared/ui';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[react-app] uncaught render error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950" role="alert">
          <div className="bg-slate-900 p-12 rounded-3xl shadow-2xl border border-white/5 max-w-lg w-full mx-4">
            <ErrorState
              title="Algo inesperado aconteceu."
              description="Houve um erro na renderização de um componente. Nossa equipe técnica já foi notificada (veja o console para detalhes)."
              retryLabel="Recarregar aplicação"
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
