import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ProdutoProfilePage } from '../components/ProdutoProfilePage';
import { useProdutoProfile } from '../hooks/useProdutoProfile';

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
        <div className="card-shell">
          <p>Produto não informado.</p>
          <button className="btn btn-sm" type="button" onClick={handleBack}>
            Voltar para produtos
          </button>
        </div>
      </main>
    );
  }

  if (!produto && error) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <div className="card-shell rf-ui-stack">
          <p>{error}</p>
          <div className="fg2">
            <button className="btn btn-sm" type="button" onClick={() => void reload()}>
              Tentar novamente
            </button>
            <button className="btn btn-sm" type="button" onClick={handleBack}>
              Voltar para produtos
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!produto) {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        <div className="card-shell">
          <p>Carregando produto...</p>
        </div>
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
