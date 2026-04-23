import { EstoquePage } from '../components/EstoquePage';
import { useEstoqueData } from '../hooks/useEstoqueData';

export function EstoqueRoutePage() {
  useEstoqueData();
  return <EstoquePage />;
}
