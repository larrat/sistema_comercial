import { useCampanhasData } from '../hooks/useCampanhasData';
import { CampanhasPage } from '../components/CampanhasPage';

export function CampanhasRoutePage() {
  useCampanhasData();
  return <CampanhasPage />;
}
