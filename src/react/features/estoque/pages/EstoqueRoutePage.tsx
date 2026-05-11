import { useEffect } from 'react';

import { useInterModuleStore } from '../../../app/lib/useInterModuleStore';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { EstoquePage } from '../components/EstoquePage';
import { useEstoqueData } from '../hooks/useEstoqueData';

export function EstoqueRoutePage() {
  useEstoqueData();

  const openMovementModal = useEstoqueStore((s) => s.openMovementModal);
  const abrirMovProdutoId = useInterModuleStore((s) => s.abrirMovProdutoId);

  useEffect(() => {
    if (!abrirMovProdutoId) return;
    useInterModuleStore.getState().clearMovProduto();
    openMovementModal(abrirMovProdutoId);
  }, [abrirMovProdutoId, openMovementModal]);

  return <EstoquePage />;
}
