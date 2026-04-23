import { useRelatoriosData } from '../hooks/useRelatoriosData';
import { RelatoriosPage } from '../components/RelatoriosPage';

export function RelatoriosRoutePage() {
  useRelatoriosData();
  return <RelatoriosPage />;
}
