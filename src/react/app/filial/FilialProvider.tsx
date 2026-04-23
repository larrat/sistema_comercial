import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { useFilialStore } from '../useFilialStore';

type FilialProviderProps = {
  filialId: string | null;
  children: ReactNode;
};

type FilialContextValue = {
  filialId: string;
};

const FilialContext = createContext<FilialContextValue | null>(null);

export function FilialProvider({ filialId, children }: FilialProviderProps) {
  const storeFilialId = useFilialStore((state) => state.filialId);

  useEffect(() => {
    if (!filialId) return;
    document.body.dataset.reactFilialContext = filialId;
    return () => {
      delete document.body.dataset.reactFilialContext;
    };
  }, [filialId]);

  const activeFilialId = filialId || storeFilialId;

  if (!activeFilialId) {
    return (
      <div className="rf-shell-state">
        <div className="empty">
          <div className="ico">FI</div>
          <p>Nenhuma filial ativa encontrada. O app shell só monta depois do bootstrap confirmar a filial.</p>
        </div>
      </div>
    );
  }

  return <FilialContext.Provider value={{ filialId: activeFilialId }}>{children}</FilialContext.Provider>;
}

export function useFilialContext() {
  const context = useContext(FilialContext);
  if (!context) {
    throw new Error('useFilialContext must be used within FilialProvider');
  }
  return context;
}
