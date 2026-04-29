import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ContasReceberPilotPage } from '../components/ContasReceberPilotPage';
import { useContasReceberData } from '../hooks/useContasReceberData';

export function ContasReceberRoutePage() {
  const { reload } = useContasReceberData();
  const [searchParams] = useSearchParams();

  const routeIntent = useMemo(
    () => ({
      contaId: searchParams.get('conta')
    }),
    [searchParams]
  );

  return <ContasReceberPilotPage routeIntent={routeIntent} onRetryLoad={reload} />;
}
