import { Component, type ErrorInfo, type ReactNode } from 'react';

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
        <div className="rf-shell-state" role="alert">
          <div className="empty">
            <div className="ico">ER</div>
            <p>O novo shell React encontrou um erro inesperado.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
