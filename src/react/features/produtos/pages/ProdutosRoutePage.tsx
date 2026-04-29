import { ProdutosPilotPage } from '../components/ProdutosPilotPage';
import { useProdutoData } from '../hooks/useProdutoData';

export function ProdutosRoutePage() {
  const { reload } = useProdutoData();
  return <ProdutosPilotPage onRetryLoad={reload} />;
}
