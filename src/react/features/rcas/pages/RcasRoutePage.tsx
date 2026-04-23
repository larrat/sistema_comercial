import { useRcasData } from '../hooks/useRcasData';
import { RcasPage } from '../components/RcasPage';

export function RcasRoutePage() {
  useRcasData();
  return <RcasPage />;
}
