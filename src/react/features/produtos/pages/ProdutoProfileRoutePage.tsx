import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ProdutoProfilePage } from '../components/ProdutoProfilePage';
import { useProdutoQuery, usePaisQuery } from '../hooks/useProdutosQuery';
import { Button, ErrorState, EmptyState, LoadingState } from '../../../shared/ui';

export function ProdutoProfileRoutePage() {
  const { produtoId } = useParams<{ produtoId: string }>();
  const navigate = useNavigate();
  
  const { 
    data: produto, 
    isLoading: loadingProduto, 
    isError: isErrorProduto, 
    error: errorProduto,
    refetch: refetchProduto 
  } = useProdutoQuery(produtoId);

  const { data: pais = [] } = usePaisQuery();

  const handleBack = useCallback(() => {
    navigate('/app/produtos');
  }, [navigate]);

  if (!produtoId) {
    return (
      <div className="w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
          <EmptyState
            title="Produto não informado."
            description="Você precisa fornecer um ID de produto válido para visualizar os detalhes."
            action={
              <Button size="sm" onClick={handleBack}>
                Voltar para produtos
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (isErrorProduto) {
    return (
      <div className="w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
          <ErrorState
            title={errorProduto instanceof Error ? errorProduto.message : 'Erro ao carregar produto.'}
            description="Não foi possível recuperar os dados deste produto no momento."
            onRetry={refetchProduto}
            action={
              <div className="flex items-center gap-3 mt-4">
                <Button variant="secondary" size="sm" onClick={handleBack}>
                  Voltar para produtos
                </Button>
                <Button size="sm" onClick={() => { void refetchProduto(); }}>
                  Tentar novamente
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  if (loadingProduto) {
    return (
      <div className="w-full flex flex-col gap-8">
        <LoadingState
          title="Carregando produto…"
          description="Estamos recuperando as informações detalhadas e o estoque deste produto."
        />
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
          <EmptyState
            title="Produto não encontrado."
            description="O ID informado não corresponde a nenhum produto cadastrado."
            action={
              <Button size="sm" onClick={handleBack}>
                Voltar para produtos
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <ProdutoProfilePage
      produto={produto}
      pais={pais}
      loadingProduto={loadingProduto}
      onReload={refetchProduto}
    />
  );
}
