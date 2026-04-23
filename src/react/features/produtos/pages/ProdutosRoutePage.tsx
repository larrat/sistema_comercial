import { ProdutosPilotPage } from '../components/ProdutosPilotPage';
import { useProdutoData } from '../hooks/useProdutoData';

export function ProdutosRoutePage() {
  useProdutoData();
  return <ProdutosPilotPage />;
}
