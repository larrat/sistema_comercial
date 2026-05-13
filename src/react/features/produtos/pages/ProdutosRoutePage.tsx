import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildProdutoRoute } from '../../../app/router/wave1Navigation';
import { ProdutosPilotPage } from '../components/ProdutosPilotPage';

export function ProdutosRoutePage() {
  const navigate = useNavigate();

  const handleOpenProduto = useCallback(
    (produtoId: string, options?: { edit?: boolean }) => {
      navigate(buildProdutoRoute(produtoId, { tab: options?.edit ? 'cadastro' : null, edit: options?.edit }));
    },
    [navigate]
  );

  return <ProdutosPilotPage onOpenProduto={handleOpenProduto} />;
}
