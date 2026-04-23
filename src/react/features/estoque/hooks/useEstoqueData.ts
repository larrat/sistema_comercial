import { useEffect } from 'react';

import { useEstoqueStore } from '../store/useEstoqueStore';

export function useEstoqueData() {
  const status = useEstoqueStore((s) => s.status);
  const setSkeletonData = useEstoqueStore((s) => s.setSkeletonData);
  const setStatus = useEstoqueStore((s) => s.setStatus);

  useEffect(() => {
    if (status !== 'idle') return;

    setStatus('loading');
    setSkeletonData({
      metrics: {
        produtos: 0,
        valorEmEstoque: 0,
        emAlerta: 0,
        zerados: 0
      },
      positionRows: [],
      historyRows: []
    });
  }, [setSkeletonData, setStatus, status]);
}
