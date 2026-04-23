import { ContasReceberPilotPage } from '../components/ContasReceberPilotPage';
import { useContasReceberData } from '../hooks/useContasReceberData';

export function ContasReceberRoutePage() {
  useContasReceberData();
  return <ContasReceberPilotPage />;
}
