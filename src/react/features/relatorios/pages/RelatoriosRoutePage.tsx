import { useRelatoriosData } from '../hooks/useRelatoriosData';
import { RelatoriosPilotPage } from '../components/RelatoriosPage';

export function RelatoriosRoutePage() {
  useRelatoriosData();
  return <RelatoriosPilotPage />;
}
