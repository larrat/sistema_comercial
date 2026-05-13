import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ProdutoProfilePage } from '../components/ProdutoProfilePage';
import { useProdutoProfile } from '../hooks/useProdutoProfile';
import { Button, ErrorState, EmptyState, LoadingState } from '../../../shared/ui';

export function ProdutoProfileRoutePage() {
  const { produtoId } = useParams<{ produtoId: string }>();
  const navigate = useNavigate();
  const { produto, pais, saldo, loading, error, reload, setProduto } = useProdutoProfile(produtoId);

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

  if (!produto && error) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <div className="bg-slate-900 p-12 rounded-3xl shadow-xl border border-white/5">
          <ErrorState
            title={error ?? 'Erro ao carregar produto.'}
            description="Não foi possível recuperar os dados deste produto no momento."
            onRetry={() => void reload()}
            action={
              <div className="flex items-center gap-3 mt-4">
                <Button variant="secondary" size="sm" onClick={handleBack}>
                  Voltar para produtos
                </Button>
                <Button size="sm" onClick={() => void reload()}>
                  Tentar novamente
                </Button>
              </div>
            }
          />
        </div>
      </main>
    );
  }

  if (!produto) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <LoadingState
          title="Carregando produto..."
          description="Estamos recuperando as informações detalhadas e o estoque deste produto."
        />
      </main>
    );
  }

  return (
    <ProdutoProfilePage
      produto={produto}
      pais={pais}
      saldo={saldo}
      loadingProduto={loading}
      error={error}
      onProdutoSaved={setProduto}
      onReload={reload}
    />
  );
}
