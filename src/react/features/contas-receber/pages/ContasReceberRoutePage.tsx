import { ContasReceberPilotPage } from '../components/ContasReceberPilotPage';
import { useContasReceberData } from '../hooks/useContasReceberData';

export function ContasReceberRoutePage() {
  const { reload } = useContasReceberData();
  return <ContasReceberPilotPage onRetryLoad={reload} />;
}
