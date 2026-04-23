import { useCotacaoData } from '../hooks/useCotacaoData';
import { CotacaoPage } from '../components/CotacaoPage';

export function CotacaoRoutePage() {
  useCotacaoData();
  return <CotacaoPage />;
}
