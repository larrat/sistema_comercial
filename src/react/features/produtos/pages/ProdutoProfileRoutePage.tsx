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
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
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
      </main>
    );
  }

  if (isErrorProduto) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
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
                <Button size="sm" onClick={refetchProduto}>
                  Tentar novamente
                </Button>
              </div>
            }
          />
        </div>
      </main>
    );
  }

  if (loadingProduto) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <LoadingState
          title="Carregando produto..."
          description="Estamos recuperando as informações detalhadas e o estoque deste produto."
        />
      </main>
    );
  }

  if (!produto) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
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
      </main>
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
