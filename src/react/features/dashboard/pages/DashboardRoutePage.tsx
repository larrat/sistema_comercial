import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToastStore } from '../../../app/lib/useToastStore';
import { getWave1RouteByLegacyPage } from '../../../app/router/wave1Navigation';
import { DashboardPilotPage } from '../components/DashboardPilotPage';
import { useDashboardData } from '../hooks/useDashboardData';

export function DashboardRoutePage() {
  const { reload } = useDashboardData();
  const navigate = useNavigate();

  const handleNavigatePage = useCallback(
    (page: string) => {
      const route = getWave1RouteByLegacyPage(page);
      if (route) {
        navigate(route);
        return;
      }

      useToastStore.getState().addToast(
        `A navegação para "${page}" ainda depende do shell legado e não foi conectada nesta onda.`,
        'warning'
      );
    },
    [navigate]
  );

  return <DashboardPilotPage onNavigatePage={handleNavigatePage} onReload={reload} />;
}
