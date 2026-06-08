import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContasReceberPilotPage } from '../components/ContasReceberPilotPage';

export function ContasReceberRoutePage() {
  const [searchParams] = useSearchParams();

  const routeIntent = useMemo(
    () => ({
      contaId: searchParams.get('conta')
    }),
    [searchParams]
  );

  return <ContasReceberPilotPage routeIntent={routeIntent} />;
}
